import app from "./app";
import { env } from "./lib/env";

const port = env.PORT;

app.listen(port, () => {
  console.log(`🚀 AI Companion backend running on http://localhost:${port}`);

  console.log(
    env.GEMINI_API_KEY
      ? `✅ Gemini configured (${env.GEMINI_MODEL})`
      : "❌ Gemini not configured",
  );

  console.log(
    env.OPENAI_API_KEY
      ? `✅ OpenAI configured (${env.OPENAI_MODEL})`
      : "⚠️ OpenAI optional (not configured)",
  );

  console.log(
    env.DEEPSEEK_API_KEY
      ? `✅ DeepSeek configured (${env.DEEPSEEK_MODEL})`
      : "⚠️ DeepSeek not configured",
  );

  console.log(
    env.GROQ_API_KEY
      ? `✅ Groq configured (${env.GROQ_MODEL})`
      : "⚠️ Groq not configured",
  );

  console.log(
    `🧠 Memory window: ${env.CONVERSATION_MEMORY_LIMIT} turns`,
  );

  console.log(
    env.CACHE_TTL_SECONDS > 0
      ? `⚡ Cache ON (${env.CACHE_TTL_SECONDS}s)`
      : "❌ Cache OFF",
  );

  console.log(
    env.JWT_ACCESS_SECRET && env.JWT_REFRESH_SECRET
      ? "🔐 JWT auth configured"
      : "⚠️ JWT using temporary dev secrets",
  );
});