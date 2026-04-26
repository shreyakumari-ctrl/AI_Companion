import { GoogleGenAI, Content } from "@google/genai";
import { env } from "../env";

export interface HistoryTurn {
  sender: "user" | "ai";
  text: string;
}

export interface ResolvedTemplate {
  systemInstruction: string;
}

export interface InferenceRequest {
  message: string;
  history: HistoryTurn[];
  template: ResolvedTemplate;
  userId?: string | null;
}

export interface LLMAdapter {
  isAvailable(): boolean;
  generate(req: InferenceRequest): Promise<string>;
  generateStream(req: InferenceRequest, onChunk: (chunk: string) => void): Promise<void>;
}

function buildContents(req: InferenceRequest): Content[] {
  const contents: Content[] = [];

  // System instruction as first user turn (Gemini doesn't have a system role in basic API)
  contents.push({
    role: "user",
    parts: [{ text: req.template.systemInstruction }],
  });
  contents.push({
    role: "model",
    parts: [{ text: "Understood. I will follow these instructions." }],
  });

  for (const turn of req.history) {
    contents.push({
      role: turn.sender === "user" ? "user" : "model",
      parts: [{ text: turn.text }],
    });
  }

  contents.push({
    role: "user",
    parts: [{ text: req.message }],
  });

  return contents;
}

class GeminiAdapter implements LLMAdapter {
  private client: GoogleGenAI | null = null;

  private getClient(): GoogleGenAI {
    if (!this.isAvailable()) {
      throw new Error("Gemini adapter is not available: GEMINI_API_KEY is not set.");
    }
    if (!this.client) {
      this.client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY! });
    }
    return this.client;
  }

  isAvailable(): boolean {
    return !!env.GEMINI_API_KEY;
  }

  async generate(req: InferenceRequest): Promise<string> {
    const client = this.getClient();
    const contents = buildContents(req);

    const response = await client.models.generateContent({
      model: env.GEMINI_MODEL,
      contents,
    });

    return response.text?.trim() ?? "";
  }

  async generateStream(req: InferenceRequest, onChunk: (chunk: string) => void): Promise<void> {
    const client = this.getClient();
    const contents = buildContents(req);

    const stream = await client.models.generateContentStream({
      model: env.GEMINI_MODEL,
      contents,
    });

    try {
      for await (const chunk of stream) {
        onChunk(chunk.text ?? "");
      }
    } catch (err) {
      console.error("Gemini stream error:", err);
      throw err;
    }
  }
}

export const geminiAdapter = new GeminiAdapter();
