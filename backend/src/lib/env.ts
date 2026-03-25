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
});
