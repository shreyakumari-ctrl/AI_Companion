const path = require("path");
const Database = require("better-sqlite3");

process.chdir(path.resolve(__dirname, ".."));

const app = require("../dist/app").default;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function readJson(response) {
  const text = await response.text();

  try {
    return {
      text,
      json: JSON.parse(text),
    };
  } catch {
    return {
      text,
      json: null,
    };
  }
}

async function run() {
  const database = new Database(path.join(process.cwd(), "prisma", "dev.db"));
  const beforeCount = database
    .prepare("SELECT COUNT(*) AS count FROM ChatMessage")
    .get().count;

  const server = app.listen(5011, async () => {
    try {
      const healthResponse = await fetch("http://127.0.0.1:5011/health");
      const health = await readJson(healthResponse);
      assert(healthResponse.status === 200, "GET /health should return 200.");
      assert(health.json && health.json.status === "ok", "GET /health should report ok.");

      const statusResponse = await fetch("http://127.0.0.1:5011/status");
      const status = await readJson(statusResponse);
      assert(statusResponse.status === 200, "GET /status should return 200.");
      assert(status.json && status.json.status === "ok", "GET /status should report ok.");

      const preflightResponse = await fetch("http://127.0.0.1:5011/api/chat", {
        method: "OPTIONS",
        headers: {
          Origin: "http://localhost:3000",
          "Access-Control-Request-Method": "POST",
        },
      });
      assert(
        preflightResponse.status === 204,
        "OPTIONS /api/chat should return 204 for allowed origins.",
      );
      assert(
        preflightResponse.headers.get("access-control-allow-origin") ===
          "http://localhost:3000",
        "CORS should allow the localhost frontend origin.",
      );

      const blockedCorsResponse = await fetch("http://127.0.0.1:5011/api/chat", {
        method: "OPTIONS",
        headers: {
          Origin: "http://evil.example",
          "Access-Control-Request-Method": "POST",
        },
      });
      const blockedCors = await readJson(blockedCorsResponse);
      assert(
        blockedCorsResponse.status === 403,
        "Disallowed origins should receive 403 instead of a generic 500.",
      );
      assert(
        blockedCors.text.includes("not allowed by CORS"),
        "CORS rejection should explain the reason.",
      );

      const chatResponse = await fetch("http://127.0.0.1:5011/api/chat", {
        method: "POST",
        headers: {
          Origin: "http://localhost:3000",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Verify the current main frontend contract",
        }),
      });
      const chat = await readJson(chatResponse);
      assert(chatResponse.status === 200, "POST /api/chat should return 200.");
      assert(chat.json && typeof chat.json.reply === "string", "POST /api/chat should return a reply string.");
      assert(
        chat.json && ["fallback", "gemini"].includes(chat.json.provider),
        "POST /api/chat should identify the response provider.",
      );

      const invalidChatResponse = await fetch("http://127.0.0.1:5011/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "",
        }),
      });
      assert(
        invalidChatResponse.status === 400,
        "POST /api/chat should validate empty messages.",
      );

      const legacyChatResponse = await fetch("http://127.0.0.1:5011/chat/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Verify legacy route compatibility",
          userId: null,
        }),
      });
      const legacyChat = await readJson(legacyChatResponse);
      assert(
        legacyChatResponse.status === 200,
        "POST /chat/send should still work for older clients.",
      );
      assert(
        legacyChat.json && typeof legacyChat.json.reply === "string",
        "POST /chat/send should return a reply string.",
      );

      const afterCount = database
        .prepare("SELECT COUNT(*) AS count FROM ChatMessage")
        .get().count;
      assert(
        afterCount >= beforeCount + 4,
        "Successful chat requests should be persisted in ChatMessage.",
      );

      console.log("VERIFY health ok");
      console.log("VERIFY status ok");
      console.log("VERIFY cors ok");
      console.log("VERIFY validation ok");
      console.log("VERIFY api route ok");
      console.log("VERIFY legacy route ok");
      console.log("VERIFY persistence ok");
      console.log(`VERIFY provider ${chat.json.provider}`);
    } catch (error) {
      console.error(error);
      process.exitCode = 1;
    } finally {
      database.close();
      server.close();
    }
  });
}

run();
