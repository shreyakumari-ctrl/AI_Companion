import { GoogleGenAI } from "@google/genai";
import { env } from "./env";

type ReplyContext = {
  message: string;
  tonePreference: string;
  mood: string;
};

type ChatReply = {
  reply: string;
  provider: "gemini" | "fallback";
  model: string | null;
};

let geminiClient: GoogleGenAI | null | undefined;

function getGeminiClient() {
  if (geminiClient !== undefined) {
    return geminiClient;
  }

  geminiClient = env.GEMINI_API_KEY
    ? new GoogleGenAI({ apiKey: env.GEMINI_API_KEY })
    : null;

  return geminiClient;
}

function buildFallbackReply(message: string) {
  return `Clidy fallback reply: I heard "${message}". The backend pipeline is working, but Gemini is not configured right now.`;
}

export async function generateAssistantReply(
  context: ReplyContext,
): Promise<ChatReply> {
  const client = getGeminiClient();

  if (!client) {
    return {
      reply: buildFallbackReply(context.message),
      provider: "fallback",
      model: null,
    };
  }

  try {
    const response = await client.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: [
        `You are Clidy AI, a warm and helpful assistant. The user's tone preference is ${context.tonePreference} and their current mood is ${context.mood}. Reply conversationally and keep the answer concise unless the user asks for more detail.\n\nUser message: ${context.message}`,
      ],
    });

    const reply = response.text?.trim();

    if (!reply) {
      return {
        reply: buildFallbackReply(context.message),
        provider: "fallback",
        model: env.GEMINI_MODEL,
      };
    }

    return {
      reply,
      provider: "gemini",
      model: env.GEMINI_MODEL,
    };
  } catch (error) {
    console.error("Gemini request failed, returning fallback response.", error);

    return {
      reply: buildFallbackReply(context.message),
      provider: "fallback",
      model: env.GEMINI_MODEL,
    };
  }
}
