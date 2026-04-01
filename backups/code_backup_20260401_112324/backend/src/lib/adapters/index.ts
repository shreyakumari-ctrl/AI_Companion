export type { LLMAdapter, InferenceRequest, HistoryTurn, ResolvedTemplate } from "./gemini";
export { geminiAdapter } from "./gemini";
export { openaiAdapter } from "./openai";

import { geminiAdapter } from "./gemini";
import { openaiAdapter } from "./openai";
import type { LLMAdapter } from "./gemini";

export const providerRegistry: Record<string, LLMAdapter> = {
  gemini: geminiAdapter,
  openai: openaiAdapter,
};
