const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000";

export interface MessageTurn {
  sender: "user" | "ai";
  text: string;
}

export interface ApiError {
  status: number;
  message: string;
}

/**
 * Sends a user message to the Clidy backend and handles streaming response.
 * Backend: POST /api/chat/stream  →  SSE Stream
 */
export async function sendMessageStream(
  message: string,
  personality: string,
  history: MessageTurn[],
  onChunk: (chunk: string) => void
): Promise<void> {
  const response = await fetch(`${API_URL}/api/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      personality,
      history: history.slice(-5), // Send last 5 messages for context
    }),
  });

  if (!response.ok) {
    let errorMessage = "Oops 😅 something went wrong";
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      // ignore
    }
    throw { status: response.status, message: errorMessage } as ApiError;
  }

  if (!response.body) {
    throw { status: 500, message: "No response body" } as ApiError;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    
    // Simple SSE parsing logic
    const lines = chunk.split("\n");
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6).trim();
        if (data === "[DONE]") return;
        try {
          // If it's JSON, extract the text, otherwise use raw data
          const parsed = JSON.parse(data);
          onChunk(parsed.text || parsed.content || data);
        } catch {
          onChunk(data);
        }
      } else if (line.trim() && !line.startsWith("data:")) {
        // Fallback for non-SSE or raw streaming
        onChunk(line);
      }
    }
  }
}
