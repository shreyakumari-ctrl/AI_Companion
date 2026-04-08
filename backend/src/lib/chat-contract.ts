import { z } from "zod";

export const historyTurnSchema = z.object({
  sender: z.enum(["user", "ai"]),
  text: z.string().trim().min(1).max(4000),
});

export const attachmentSchema = z.object({
  type: z.enum(["image", "file"]),
  url: z.string().url().optional(),
  base64: z.string().optional(),
  name: z.string().max(255).optional(),
});

export const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  provider: z.enum(["gemini", "openai"]).default("gemini"),
  templateId: z.string().trim().min(1).max(120).optional(),
  personality: z.enum(["Friendly", "Funny", "Motivational"]).optional(),
  history: z.array(historyTurnSchema).max(15).default([]),
  userId: z.string().cuid().nullable().optional(),
  conversationId: z.string().cuid().nullable().optional(),
  tonePreference: z.string().trim().min(1).max(60).optional(),
  mood: z.string().trim().min(1).max(60).optional(),
  attachments: z.array(attachmentSchema).max(10).optional(),
  mode: z.enum(["search", "analyze", "create"]).optional(),
});

export type ChatRequestBody = z.infer<typeof chatRequestSchema>;
