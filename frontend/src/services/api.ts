const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * Sends a user message to the Clidy backend and returns the AI reply.
 * Backend: POST /chat/send  →  { reply: string, timestamp: string }
 */
export async function sendMessage(message: string): Promise<string> {
  const response = await fetch(`${API_URL}/chat/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const data: { reply: string } = await response.json();
  return data.reply ?? "No reply received.";
}
