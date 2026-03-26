import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().default("file:./prisma/dev.db"),
  GEMINI_API_KEY: z
    .string()
    .trim()
    .transform((value) => (value.length > 0 ? value : undefined))
    .optional(),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  OPENAI_API_KEY: z.string().trim().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  DEFAULT_PROMPT_TEMPLATE: z.string().default("default"),
  CONVERSATION_MEMORY_LIMIT: z.coerce.number().int().min(1).max(15).default(12),
  JWT_ACCESS_SECRET: z
    .string()
    .trim()
    .transform((value) => (value.length > 0 ? value : undefined))
    .optional(),
  JWT_REFRESH_SECRET: z
    .string()
    .trim()
    .transform((value) => (value.length > 0 ? value : undefined))
    .optional(),
  JWT_ACCESS_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(7),
});

export const env = envSchema.parse({
  PORT: process.env.PORT,
  FRONTEND_URL: process.env.FRONTEND_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  DEFAULT_PROMPT_TEMPLATE: process.env.DEFAULT_PROMPT_TEMPLATE,
  CONVERSATION_MEMORY_LIMIT: process.env.CONVERSATION_MEMORY_LIMIT,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_TTL_MINUTES: process.env.JWT_ACCESS_TTL_MINUTES,
  JWT_REFRESH_TTL_DAYS: process.env.JWT_REFRESH_TTL_DAYS,
});
