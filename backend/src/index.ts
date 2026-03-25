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
});
