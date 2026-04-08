import "./load-env";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { ZodError } from "zod";
import { env } from "./lib/env";
import { HttpError } from "./lib/http-error";
import authRouter from "./routes/auth";
import chatRouter from "./routes/chat";
import conversationsRouter from "./routes/conversations";
import inferenceRouter from "./routes/inference";
import activityRouter from "./routes/activity";

const app = express();

function isAllowedOrigin(origin: string) {
  try {
    const parsedOrigin = new URL(origin);
    const configuredOrigin = new URL(env.FRONTEND_URL);

    if (origin === env.FRONTEND_URL) {
      return true;
    }

    if (
      parsedOrigin.protocol === configuredOrigin.protocol &&
      parsedOrigin.hostname === configuredOrigin.hostname
    ) {
      return true;
    }

    if (
      parsedOrigin.protocol === "http:" &&
      (parsedOrigin.hostname === "localhost" ||
        parsedOrigin.hostname === "127.0.0.1")
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

app.use(
  cors({
    credentials: true,
    exposedHeaders: [
      "x-conversation-id",
      "x-llm-provider",
      "x-llm-model",
      "x-response-cache",
    ],
    allowedHeaders: ["Content-Type", "Authorization"],
    origin(origin, callback) {
      if (!origin || isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    },
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));

function sendHeartbeat(res: express.Response) {
  res.status(200).json({
    status: "ok",
    service: "ai-companion-backend",
    timestamp: new Date().toISOString(),
  });
}

app.get("/health", (_req, res) => {
  sendHeartbeat(res);
});

app.get("/status", (_req, res) => {
  sendHeartbeat(res);
});

app.use("/chat", chatRouter);
app.use("/api", inferenceRouter);
app.use("/api/auth", authRouter);
app.use("/api/conversations", conversationsRouter);
app.use("/api/activity", activityRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof Error && error.message.includes("allowed by CORS")) {
    console.warn(error.message);

    return res.status(403).json({
      error: error.message,
    });
  }

  if (error instanceof ZodError) {
    return res.status(400).json({
      error: "Invalid request payload.",
      details: error.flatten(),
    });
  }

  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({
      error: error.message,
    });
  }

  console.error(error);

  res.status(500).json({
    error: "Internal server error.",
  });
});

export default app;
