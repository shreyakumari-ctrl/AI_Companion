export interface ApiError {
  status: number;
  message: string;
}

export interface HistoryTurn {
  sender: "user" | "ai";
  text: string;
}

function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is not configured. Set this environment variable before making API requests."
    );
  }
  return url;
}

export async function sendMessage(
  message: string,
  history?: HistoryTurn[]
): Promise<string> {
  const baseUrl = getBaseUrl();

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history: (history ?? []).slice(-5) }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = errorText;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error ?? errorJson.message ?? errorText;
    } catch {
      // not JSON, use raw text
    }
    throw { status: response.status, message: errorMessage } as ApiError;
  }

  const data = await response.json();
  return data.reply;
}

export async function sendMessageStream(
  message: string,
  history: HistoryTurn[],
  onChunk: (chunk: string) => void
): Promise<void> {
  const baseUrl = getBaseUrl();

  const response = await fetch(`${baseUrl}/api/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history: history.slice(-5) }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = errorText;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error ?? errorJson.message ?? errorText;
    } catch {
      // not JSON, use raw text
    }
    throw { status: response.status, message: errorMessage } as ApiError;
  }

  if (!response.body) {
    throw { status: 500, message: "No response body received from server." } as ApiError;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Process all complete SSE lines in the buffer
    const lines = buffer.split("\n");
    // Keep the last (potentially incomplete) line in the buffer
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) continue;
      const content = trimmed.slice("data: ".length);
      if (content === "[DONE]") return;
      if (content === "[ERROR]") throw { status: 500, message: "Stream error from server." } as ApiError;
      if (content) onChunk(content.replace(/\\n/g, "\n"));
    }
  }
}
