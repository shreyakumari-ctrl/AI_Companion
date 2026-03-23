export type ChatApiResponse = {
  reply: string;
  timestamp: string;
  context: {
    userId: string | null;
    tonePreference: string;
    mood: string;
  };
};

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export async function sendChatMessage(message: string, userId?: string | null) {
  const response = await fetch(`${apiBaseUrl}/chat/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      userId: userId ?? null,
    }),
  });

  if (!response.ok) {
    throw new Error(`Chat request failed with status ${response.status}`);
  }

  return (await response.json()) as ChatApiResponse;
}
