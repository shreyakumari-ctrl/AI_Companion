import app from "./app";
import { env } from "./lib/env";

const port = env.PORT;

app.listen(port, () => {
  console.log(`AI Companion backend listening on http://localhost:${port}`);
  console.log(
    env.GEMINI_API_KEY
      ? `Gemini configured with model ${env.GEMINI_MODEL}`
      : "Gemini not configured. Add GEMINI_API_KEY to backend/.env",
  );
  console.log(
    env.OPENAI_API_KEY
      ? `OpenAI configured with model ${env.OPENAI_MODEL}`
      : "OpenAI not configured (optional). Add OPENAI_API_KEY to backend/.env to enable.",
  );
  console.log(`Conversation memory window set to ${env.CONVERSATION_MEMORY_LIMIT} turns.`);
  console.log(
    env.CACHE_TTL_SECONDS > 0
      ? `Response cache enabled for ${env.CACHE_TTL_SECONDS}s with ${env.CACHE_MAX_ENTRIES} entries.`
      : "Response cache disabled.",
  );
  console.log(
    env.JWT_ACCESS_SECRET && env.JWT_REFRESH_SECRET
      ? "JWT auth configured from environment."
      : "JWT auth running with ephemeral development secrets. Add JWT_ACCESS_SECRET and JWT_REFRESH_SECRET to backend/.env for persistent sessions.",
  );
});
