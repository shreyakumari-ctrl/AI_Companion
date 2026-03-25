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
    throw { status: response.status, message: errorText } as ApiError;
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
    throw { status: response.status, message: errorText } as ApiError;
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value, { stream: true });
    const lines = text.split("\n");

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const content = line.slice("data: ".length);
        if (content === "[DONE]") {
          return;
        }
        onChunk(content);
      }
    }
  }
}
