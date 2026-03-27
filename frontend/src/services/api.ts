import { getPersonalityPayload, type PersonalityPreset } from "@/lib/chatPersonality";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";

export interface MessageTurn {
  sender: "user" | "ai";
  text: string;
}

export interface ApiError {
  status: number;
  message: string;
}

export interface ChatStreamMeta {
  conversationId: string;
  provider: string;
  model: string | null;
  memoryCount: number;
  cacheHit: boolean;
  context: {
    userId: string | null;
    tonePreference: string;
    mood: string;
  };
  timestamp: string;
}

function normalizeApiError(status: number, rawMessage: string) {
  const message = rawMessage.trim();

  if (status === 429 || /quota|rate limit|resource_exhausted/i.test(message)) {
    return {
      status,
      message: "Clidy hit a rate limit. Give it a minute and try again.",
    } satisfies ApiError;
  }

  if (status === 503 || /unavailable|network|connection|server/i.test(message)) {
    return {
      status,
      message: "Clidy can't reach the server right now. Check the backend and try again.",
    } satisfies ApiError;
  }

  return {
    status,
    message: message || "Oops, something went wrong. Please try again.",
  } satisfies ApiError;
}

async function parseApiError(response: Response): Promise<ApiError> {
  const errorText = await response.text();

  try {
    const errorJson = JSON.parse(errorText);
    return normalizeApiError(
      response.status,
      errorJson.error ?? errorJson.message ?? errorText,
    );
  } catch {
    return normalizeApiError(response.status, errorText);
  }
}

function consumeSseEventBlock(
  eventBlock: string,
  onChunk: (chunk: string) => void,
  onMeta: (meta: ChatStreamMeta) => void,
) {
  let eventType = "message";
  const dataLines: string[] = [];

  for (const rawLine of eventBlock.split("\n")) {
    const line = rawLine.replace(/\r$/, "");

    if (!line || line.startsWith(":")) {
      continue;
    }

    if (line.startsWith("event:")) {
      eventType = line.slice("event:".length).trim();
      continue;
    }

    if (line.startsWith("data:")) {
      let value = line.slice("data:".length);
      if (value.startsWith(" ")) {
        value = value.slice(1);
      }
      dataLines.push(value);
    }
  }

  if (!dataLines.length) {
    return false;
  }

  const data = dataLines.join("\n");

  if (data === "[DONE]") {
    return true;
  }

  if (data === "[ERROR]") {
    throw normalizeApiError(500, "The stream ended unexpectedly.");
  }

  if (eventType === "meta") {
    try {
      onMeta(JSON.parse(data) as ChatStreamMeta);
    } catch {
      throw normalizeApiError(500, "The stream metadata payload was malformed.");
    }

    return false;
  }

  onChunk(data.replace(/\\n/g, "\n"));
  return false;
}

export async function sendMessageStream(
  message: string,
  personality: PersonalityPreset,
  history: MessageTurn[],
  onChunk: (chunk: string) => void,
  conversationId?: string | null,
): Promise<ChatStreamMeta | null> {
  let response: Response;
  let streamMeta: ChatStreamMeta | null = null;

  try {
    response = await fetch(`${API_URL}/api/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        history: history.slice(-12),
        conversationId,
        ...getPersonalityPayload(personality),
      }),
    });
  } catch {
    throw normalizeApiError(503, "Network request failed.");
  }

  if (!response.ok) {
    throw await parseApiError(response);
  }

  if (!response.body) {
    throw normalizeApiError(500, "No response body was returned.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
    const eventBlocks = buffer.split("\n\n");
    buffer = eventBlocks.pop() ?? "";

    for (const eventBlock of eventBlocks) {
      const isDone = consumeSseEventBlock(eventBlock, onChunk, (meta) => {
        streamMeta = meta;
      });
      if (isDone) {
        return streamMeta;
      }
    }
  }

  return streamMeta;
}
