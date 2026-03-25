import { env } from "./env";

export interface PromptTemplate {
  id: string;
  systemInstruction: string;
}

export interface TemplateVars {
  tonePreference?: string;
  mood?: string;
}

export const templateRegistry: Record<string, PromptTemplate> = {
  default: {
    id: "default",
    systemInstruction:
      "You are a helpful AI assistant. " +
      "Respond in a {{tonePreference}} tone. " +
      "The user's current mood is {{mood}}. " +
      "Be empathetic and adapt your responses accordingly.",
  },
};

/**
 * Resolves a prompt template by ID (or falls back to env.DEFAULT_PROMPT_TEMPLATE,
 * then "default"), interpolates {{tonePreference}} and {{mood}} placeholders,
 * and returns the resolved system instruction string.
 */
export function resolveTemplate(templateId?: string, vars: TemplateVars = {}): string {
  const id = templateId ?? env.DEFAULT_PROMPT_TEMPLATE ?? "default";
  const template = templateRegistry[id] ?? templateRegistry["default"];

  const tonePreference = vars.tonePreference ?? "neutral";
  const mood = vars.mood ?? "neutral";

  return template.systemInstruction
    .replace(/\{\{tonePreference\}\}/g, tonePreference)
    .replace(/\{\{mood\}\}/g, mood);
}
