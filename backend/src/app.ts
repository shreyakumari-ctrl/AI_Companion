import cors from "cors";
import express from "express";
import chatRouter from "./routes/chat";

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
  }),
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "ai-companion-backend",
    timestamp: new Date().toISOString(),
  });
});

app.use("/chat", chatRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);

  res.status(500).json({
    error: "Internal server error.",
  });
});

export default app;
