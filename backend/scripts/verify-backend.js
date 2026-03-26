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

async function readSse(response) {
  assert(response.body, "Streaming responses should include a body.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let sawDone = false;
  let eventCount = 0;
  let singleCharacterEvents = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith(":")) {
        continue;
      }

      if (!trimmed.startsWith("data: ")) {
        continue;
      }

      const data = trimmed.slice("data: ".length);

      if (data === "[DONE]") {
        sawDone = true;
        continue;
      }

      if (data === "[ERROR]") {
        throw new Error("SSE stream returned [ERROR].");
      }

      const decodedChunk = data.replace(/\\n/g, "\n");
      text += decodedChunk;
      eventCount += 1;

      if (Array.from(decodedChunk).length === 1) {
        singleCharacterEvents += 1;
      }
    }
  }

  return {
    text,
    sawDone,
    eventCount,
    singleCharacterEvents,
  };
}

async function run() {
  const database = new Database(path.join(process.cwd(), "prisma", "dev.db"));
  const beforeMessageCount = database
    .prepare('SELECT COUNT(*) AS count FROM "ChatMessage"')
    .get().count;
  const beforeSessionCount = database
    .prepare('SELECT COUNT(*) AS count FROM "Session"')
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

      const firstChatResponse = await fetch("http://127.0.0.1:5011/api/chat", {
        method: "POST",
        headers: {
          Origin: "http://localhost:3000",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Remember this phrase for the next request.",
        }),
      });
      const firstChat = await readJson(firstChatResponse);
      assert(firstChatResponse.status === 200, "POST /api/chat should return 200.");
      assert(firstChat.json && typeof firstChat.json.reply === "string", "POST /api/chat should return a reply string.");
      assert(
        firstChat.json && typeof firstChat.json.conversationId === "string",
        "POST /api/chat should return a conversationId.",
      );

      const secondChatResponse = await fetch("http://127.0.0.1:5011/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Use the saved conversation memory.",
          conversationId: firstChat.json.conversationId,
        }),
      });
      const secondChat = await readJson(secondChatResponse);
      assert(secondChatResponse.status === 200, "POST /api/chat with a conversationId should return 200.");
      assert(
        secondChat.json && secondChat.json.conversationId === firstChat.json.conversationId,
        "Conversation memory should stay inside the same conversationId.",
      );
      assert(
        secondChat.json && secondChat.json.memoryCount >= 2,
        "Second chat request should load recent conversation history from the database.",
      );

      const streamResponse = await fetch("http://127.0.0.1:5011/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Stream this reply one character at a time.",
          conversationId: firstChat.json.conversationId,
        }),
      });
      assert(streamResponse.status === 200, "POST /api/chat/stream should return 200.");
      const streamed = await readSse(streamResponse);
      assert(streamed.sawDone, "Streaming endpoint should finish with [DONE].");
      assert(streamed.text.length > 0, "Streaming endpoint should emit response text.");
      assert(streamed.eventCount > 10, "Streaming endpoint should emit many SSE events.");
      assert(
        streamed.singleCharacterEvents >= Math.floor(streamed.eventCount * 0.9),
        "Streaming endpoint should emit character-sized chunks for nearly all events.",
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

      const email = `verify-${Date.now()}@clidy.ai`;
      const registerResponse = await fetch("http://127.0.0.1:5011/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password: "Sup3rSecurePass!",
          name: "Verify Bot",
        }),
      });
      const register = await readJson(registerResponse);
      assert(registerResponse.status === 201, "POST /api/auth/register should create a user.");
      assert(register.json && typeof register.json.accessToken === "string", "Register should return an access token.");
      assert(register.json && typeof register.json.refreshToken === "string", "Register should return a refresh token.");
      assert(register.json && register.json.user.email === email, "Register should return the created user.");

      const loginResponse = await fetch("http://127.0.0.1:5011/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password: "Sup3rSecurePass!",
        }),
      });
      const login = await readJson(loginResponse);
      assert(loginResponse.status === 200, "POST /api/auth/login should accept valid credentials.");
      assert(login.json && typeof login.json.accessToken === "string", "Login should return an access token.");
      assert(login.json && typeof login.json.refreshToken === "string", "Login should return a refresh token.");

      const meResponse = await fetch("http://127.0.0.1:5011/api/auth/me", {
        headers: {
          Authorization: `Bearer ${login.json.accessToken}`,
        },
      });
      const me = await readJson(meResponse);
      assert(meResponse.status === 200, "GET /api/auth/me should work with a valid bearer token.");
      assert(me.json && me.json.user.email === email, "GET /api/auth/me should return the authenticated user.");

      const refreshResponse = await fetch("http://127.0.0.1:5011/api/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refreshToken: login.json.refreshToken,
        }),
      });
      const refresh = await readJson(refreshResponse);
      assert(refreshResponse.status === 200, "POST /api/auth/refresh should rotate the session.");
      assert(
        refresh.json && refresh.json.accessToken !== login.json.accessToken,
        "Refresh should return a new access token.",
      );
      assert(
        refresh.json && refresh.json.refreshToken !== login.json.refreshToken,
        "Refresh should rotate the refresh token.",
      );

      const logoutResponse = await fetch("http://127.0.0.1:5011/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refreshToken: refresh.json.refreshToken,
        }),
      });
      const logout = await readJson(logoutResponse);
      assert(logoutResponse.status === 200, "POST /api/auth/logout should return 200.");
      assert(logout.json && logout.json.ok === true, "Logout should acknowledge success.");

      const meAfterLogoutResponse = await fetch("http://127.0.0.1:5011/api/auth/me", {
        headers: {
          Authorization: `Bearer ${refresh.json.accessToken}`,
        },
      });
      assert(
        meAfterLogoutResponse.status === 401,
        "Revoked sessions should no longer authorize access tokens.",
      );

      const conversationMessageCount = database
        .prepare('SELECT COUNT(*) AS count FROM "ChatMessage" WHERE "conversationId" = ?')
        .get(firstChat.json.conversationId).count;
      assert(
        conversationMessageCount >= 6,
        "Chat messages should be persisted under the same conversation.",
      );

      const afterMessageCount = database
        .prepare('SELECT COUNT(*) AS count FROM "ChatMessage"')
        .get().count;
      const afterSessionCount = database
        .prepare('SELECT COUNT(*) AS count FROM "Session"')
        .get().count;

      assert(
        afterMessageCount >= beforeMessageCount + 6,
        "Successful chat requests should increase ChatMessage persistence.",
      );
      assert(
        afterSessionCount >= beforeSessionCount + 2,
        "Register and login should create persisted sessions.",
      );

      console.log("VERIFY health ok");
      console.log("VERIFY status ok");
      console.log("VERIFY cors ok");
      console.log("VERIFY validation ok");
      console.log("VERIFY api route ok");
      console.log("VERIFY memory ok");
      console.log("VERIFY streaming ok");
      console.log("VERIFY legacy route ok");
      console.log("VERIFY auth ok");
      console.log("VERIFY persistence ok");
      console.log(`VERIFY provider ${firstChat.json.provider}`);
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
