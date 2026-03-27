import { PersonalityPreset } from "../lib/chatPersonality";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface MessageTurn {
  sender: "user" | "ai";
  text: string;
}

export interface ApiError extends Error {
  status?: number;
}

function normalizeApiError(status: number, rawMessage: string): ApiError {
  const message = rawMessage?.toString().trim() || "Oops 😅 something went wrong.";
  const error = new Error(message) as ApiError;
  error.status = status;
  return error;
}

async function parseApiError(response: Response): Promise<ApiError> {
  const text = await response.text();

  try {
    const json = JSON.parse(text);
    return normalizeApiError(response.status, json.error || json.message || text);
  } catch {
    return normalizeApiError(response.status, text);
  }
}

function consumeSseEventBlock(eventBlock: string, onChunk: (chunk: string) => void): boolean {
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
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        personality,
        history: history.slice(-5),
      }),
    });
  } catch (err) {
    throw normalizeApiError(503, "Network request failed.");
  }

  if (!response.ok) {
    throw await parseApiError(response);
  }

  if (!response.body) {
    throw normalizeApiError(500, "No response body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
    const eventBlocks = buffer.split("\n\n");
    buffer = eventBlocks.pop() ?? "";

    for (const eventBlock of eventBlocks) {
      const finished = consumeSseEventBlock(eventBlock, onChunk);
      if (finished) {
        return;
      }
    }
  }
}
