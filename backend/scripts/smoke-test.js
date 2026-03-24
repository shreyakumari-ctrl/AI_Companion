const app = require("../dist/app").default;

async function run() {
  const server = app.listen(5010, async () => {
    try {
      const healthResponse = await fetch("http://127.0.0.1:5010/health");
      const statusResponse = await fetch("http://127.0.0.1:5010/status");
      const apiChatResponse = await fetch("http://127.0.0.1:5010/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Hello from smoke test via /api/chat",
        }),
      });
      const legacyChatResponse = await fetch("http://127.0.0.1:5010/chat/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Hello from smoke test via /chat/send",
          userId: null,
        }),
      });

      console.log("HEALTH", await healthResponse.text());
      console.log("STATUS", await statusResponse.text());
      console.log("API_CHAT", await apiChatResponse.text());
      console.log("LEGACY_CHAT", await legacyChatResponse.text());
    } catch (error) {
      console.error(error);
      process.exitCode = 1;
    } finally {
      server.close();
    }
  });
}

run();
