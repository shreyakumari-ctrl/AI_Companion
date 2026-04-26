import { NextFunction, Request, Response, Router } from "express";
import { chatRequestSchema } from "../lib/chat-contract";
import { executeChat } from "../lib/chat-service";
import { optionalAuth, type AuthenticatedRequest } from "../middleware/auth";

const router = Router();

async function handleChatRequest(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const parsedRequest = chatRequestSchema.safeParse(req.body);

    if (!parsedRequest.success) {
      return res.status(400).json({
        error: "Invalid chat payload.",
        details: parsedRequest.error.flatten(),
      });
    }

    // NEW: provider support (default gemini)
    const provider = req.body.provider || "gemini";

    const result = await executeChat(
      {
        ...parsedRequest.data,
        provider, // inject provider here 
      },
      (req as AuthenticatedRequest).auth,
    );

    res.setHeader("x-conversation-id", result.conversationId);
    res.setHeader("x-llm-provider", result.provider);
    res.setHeader("x-llm-model", result.model ?? "");
    res.setHeader("x-response-cache", result.cacheHit ? "hit" : "miss");

    return res.status(200).json({
      reply: result.reply,
      timestamp: new Date().toISOString(),
      provider: result.provider,
      model: result.model,
      context: result.context,
      conversationId: result.conversationId,
      memoryCount: result.memoryCount,
      cacheHit: result.cacheHit,
    });
  } catch (error) {
    return next(error);
  }
}

router.post("/", optionalAuth, handleChatRequest);
router.post("/send", optionalAuth, handleChatRequest);

export default router;