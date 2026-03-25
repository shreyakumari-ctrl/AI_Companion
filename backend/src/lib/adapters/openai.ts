import OpenAI from "openai";
import { LLMAdapter, InferenceRequest, HistoryTurn, ResolvedTemplate } from "./gemini";
import { env } from "../env";

export type { LLMAdapter, InferenceRequest, HistoryTurn, ResolvedTemplate };

function buildMessages(req: InferenceRequest): OpenAI.Chat.ChatCompletionMessageParam[] {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: req.template.systemInstruction },
  ];

  for (const turn of req.history) {
    messages.push({
      role: turn.sender === "user" ? "user" : "assistant",
      content: turn.text,
    });
  }

  messages.push({ role: "user", content: req.message });
  return messages;
}

class OpenAIAdapter implements LLMAdapter {
  private client: OpenAI | null = null;

  private getClient(): OpenAI {
    if (!this.isAvailable()) {
      throw new Error("OpenAI adapter is not available: OPENAI_API_KEY is not set.");
    }
    if (!this.client) {
      this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    }
    return this.client;
  }

  isAvailable(): boolean {
    return !!env.OPENAI_API_KEY;
  }

  async generate(req: InferenceRequest): Promise<string> {
    const client = this.getClient();
    const messages = buildMessages(req);

    const response = await client.chat.completions.create({
      model: env.OPENAI_MODEL,
      messages,
    });

    return response.choices[0]?.message?.content ?? "";
  }

  async generateStream(req: InferenceRequest, onChunk: (chunk: string) => void): Promise<void> {
    const client = this.getClient();
    const messages = buildMessages(req);

    const stream = await client.chat.completions.create({
      model: env.OPENAI_MODEL,
      messages,
      stream: true,
    });

    for await (const chunk of stream) {
      onChunk(chunk.choices[0]?.delta?.content ?? "");
    }
  }
}

export const openaiAdapter = new OpenAIAdapter();
