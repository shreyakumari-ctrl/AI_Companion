import app from "./app";
import { env } from "./lib/env";

const port = env.PORT;

app.listen(port, () => {
  console.log(`AI Companion backend listening on http://localhost:${port}`);
  console.log(
    env.GEMINI_API_KEY
      ? `Gemini configured with model ${env.GEMINI_MODEL}`
      : "Gemini not configured. Add GEMINI_API_KEY to backend/.env or root .env.",
  );
});
