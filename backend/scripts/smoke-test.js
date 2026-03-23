const app = require("../dist/app").default;

async function run() {
  const server = app.listen(4010, async () => {
    try {
      const healthResponse = await fetch("http://127.0.0.1:4010/health");
      const chatResponse = await fetch("http://127.0.0.1:4010/chat/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Hello from smoke test",
          userId: null,
        }),
      });

      console.log("HEALTH", await healthResponse.text());
      console.log("CHAT", await chatResponse.text());
    } catch (error) {
      console.error(error);
      process.exitCode = 1;
    } finally {
      server.close();
    }
  });
}

run();
