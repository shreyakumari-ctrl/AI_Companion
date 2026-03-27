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
  let currentEvent = "message";
  let meta = null;

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

      if (trimmed.startsWith("event: ")) {
        currentEvent = trimmed.slice("event: ".length);
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

      if (currentEvent === "meta") {
        meta = JSON.parse(data);
        currentEvent = "message";
        continue;
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
    meta,
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

      const cachedMissResponse = await fetch("http://127.0.0.1:5011/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Cache this exact prompt for a quick replay.",
        }),
      });
      const cachedMiss = await readJson(cachedMissResponse);
      assert(cachedMissResponse.status === 200, "First cacheable /api/chat request should return 200.");
      assert(
        cachedMissResponse.headers.get("x-response-cache") === "miss",
        "First cacheable /api/chat request should be a cache miss.",
      );
      assert(
        cachedMiss.json && cachedMiss.json.cacheHit === false,
        "First cacheable /api/chat request should report cacheHit false.",
      );

      const cachedHitResponse = await fetch("http://127.0.0.1:5011/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Cache this exact prompt for a quick replay.",
        }),
      });
      const cachedHit = await readJson(cachedHitResponse);
      assert(cachedHitResponse.status === 200, "Repeated /api/chat request should return 200.");
      assert(
        cachedHitResponse.headers.get("x-response-cache") === "hit",
        "Repeated /api/chat request should be served from cache.",
      );
      assert(
        cachedHit.json && cachedHit.json.cacheHit === true,
        "Repeated /api/chat request should report cacheHit true.",
      );
      assert(
        cachedHit.json && cachedHit.json.reply === cachedMiss.json.reply,
        "Cached response should return the same reply body.",
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
      assert(
        streamed.meta && streamed.meta.conversationId === firstChat.json.conversationId,
        "Streaming endpoint should emit metadata with the active conversationId.",
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

      const profileResponse = await fetch("http://127.0.0.1:5011/api/auth/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${login.json.accessToken}`,
        },
        body: JSON.stringify({
          tonePreference: "grounded",
          mood: "focused",
        }),
      });
      const profile = await readJson(profileResponse);
      assert(profileResponse.status === 200, "PATCH /api/auth/profile should update the authenticated user.");
      assert(
        profile.json && profile.json.user.tonePreference === "grounded",
        "PATCH /api/auth/profile should persist tonePreference.",
      );
      assert(
        profile.json && profile.json.user.mood === "focused",
        "PATCH /api/auth/profile should persist mood.",
      );

      const conversationsUnauthedResponse = await fetch("http://127.0.0.1:5011/api/conversations");
      assert(
        conversationsUnauthedResponse.status === 401,
        "GET /api/conversations should require authentication.",
      );

      const authedChatResponse = await fetch("http://127.0.0.1:5011/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${login.json.accessToken}`,
        },
        body: JSON.stringify({
          message: "Create an authenticated conversation for listing.",
        }),
      });
      const authedChat = await readJson(authedChatResponse);
      assert(
        authedChatResponse.status === 200,
        "Authenticated /api/chat request should return 200.",
      );
      assert(
        authedChat.json && typeof authedChat.json.conversationId === "string",
        "Authenticated /api/chat request should return a conversationId.",
      );

      const conversationsResponse = await fetch("http://127.0.0.1:5011/api/conversations", {
        headers: {
          Authorization: `Bearer ${login.json.accessToken}`,
        },
      });
      const conversations = await readJson(conversationsResponse);
      assert(
        conversationsResponse.status === 200,
        "GET /api/conversations should return 200 for authenticated users.",
      );
      assert(
        conversations.json &&
          Array.isArray(conversations.json.conversations) &&
          conversations.json.conversations.some(
            (conversation) => conversation.id === authedChat.json.conversationId,
          ),
        "GET /api/conversations should list the authenticated user's conversation.",
      );

      const contextResponse = await fetch(
        `http://127.0.0.1:5011/api/conversations/${authedChat.json.conversationId}`,
        {
          headers: {
            Authorization: `Bearer ${login.json.accessToken}`,
          },
        },
      );
      const context = await readJson(contextResponse);
      assert(
        contextResponse.status === 200,
        "GET /api/conversations/:conversationId should return 200.",
      );
      assert(
        context.json && context.json.conversation.id === authedChat.json.conversationId,
        "Conversation context endpoint should return the requested conversation.",
      );
      assert(
        context.json && context.json.memoryCount >= 2,
        "Conversation context endpoint should expose conversation memory turns.",
      );

      const messagesResponse = await fetch(
        `http://127.0.0.1:5011/api/conversations/${authedChat.json.conversationId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${login.json.accessToken}`,
          },
        },
      );
      const messages = await readJson(messagesResponse);
      assert(
        messagesResponse.status === 200,
        "GET /api/conversations/:conversationId/messages should return 200.",
      );
      assert(
        messages.json &&
          Array.isArray(messages.json.messages) &&
          messages.json.messages.length >= 2,
        "Conversation messages endpoint should return the stored conversation turns.",
      );

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
      console.log("VERIFY cache ok");
      console.log("VERIFY memory ok");
      console.log("VERIFY streaming ok");
      console.log("VERIFY legacy route ok");
      console.log("VERIFY auth ok");
      console.log("VERIFY conversations ok");
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
