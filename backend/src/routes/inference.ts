import { Router, Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";
import { chatRequestSchema } from "../lib/chat-contract";
import { executeChat, streamChat } from "../lib/chat-service";
import { optionalAuth, type AuthenticatedRequest } from "../middleware/auth";

const router = Router();

function writeSseChunk(res: Response, chunk: string) {
  const safeChunk = chunk.replace(/\n/g, "\\n");
  res.write(`data: ${safeChunk}\n\n`);

  if (typeof (res as Response & { flush?: () => void }).flush === "function") {
    (res as Response & { flush?: () => void }).flush?.();
  }
}

// POST /api/chat — non-streaming
router.post(
  "/chat",
  optionalAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    let body: z.infer<typeof chatRequestSchema>;

    try {
      body = chatRequestSchema.parse(req.body);
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          error: "Invalid request body.",
          details: err.issues,
        });
      }
      return next(err);
    }

    try {
      const result = await executeChat(body, (req as AuthenticatedRequest).auth);
      res.setHeader("x-conversation-id", result.conversationId);
      res.setHeader("x-llm-provider", result.provider);
      res.setHeader("x-llm-model", result.model ?? "");

      return res.json({
        reply: result.reply,
        provider: result.provider,
        model: result.model,
        conversationId: result.conversationId,
        timestamp: new Date().toISOString(),
        context: result.context,
        memoryCount: result.memoryCount,
      });
    } catch (err) {
      return next(err);
    }
  },
);

// POST /api/chat/stream — SSE streaming
router.post(
  "/chat/stream",
  optionalAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    let body: z.infer<typeof chatRequestSchema>;

    try {
      body = chatRequestSchema.parse(req.body);
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          error: "Invalid request body.",
          details: err.issues,
        });
      }
      return next(err);
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    res.write(":\n\n");

    try {
      const result = await streamChat(
        body,
        (chunk: string) => {
          writeSseChunk(res, chunk);
        },
        (req as AuthenticatedRequest).auth,
      );

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (err) {
      console.error("Stream generation error:", err);
      res.write("data: [ERROR]\n\n");
      res.end();
    }
  },
);

// GET /api/providers — list configured providers
router.get("/providers", (_req: Request, res: Response) => {
  return res.json(["gemini", "openai", "fallback"]);
});

export default router;
