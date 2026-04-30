import { Router } from "express";
import { z } from "zod";
import {
  getConversationContext,
  getConversationMessages,
  listConversationsForUser,
} from "../lib/chat-service";
import { optionalAuth, requireAuth, type AuthenticatedRequest } from "../middleware/auth";

const router = Router();

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const messagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

const paramsSchema = z.object({
  conversationId: z.string().cuid(),
});

router.get("/", optionalAuth, requireAuth, async (req, res, next) => {
  try {
    const auth = (req as AuthenticatedRequest).auth!;
    const query = listQuerySchema.parse(req.query);
    const conversations = await listConversationsForUser(auth, query.limit);

    return res.status(200).json({
      conversations,
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/:conversationId", optionalAuth, requireAuth, async (req, res, next) => {
  try {
    const auth = (req as AuthenticatedRequest).auth!;
    const { conversationId } = paramsSchema.parse(req.params);
    const context = await getConversationContext(conversationId, auth);

    return res.status(200).json(context);
  } catch (error) {
    return next(error);
  }
});

router.get(
  "/:conversationId/messages",
  optionalAuth,
  requireAuth,
  async (req, res, next) => {
    try {
      const auth = (req as AuthenticatedRequest).auth!;
      const { conversationId } = paramsSchema.parse(req.params);
      const query = messagesQuerySchema.parse(req.query);
      const messages = await getConversationMessages(
        conversationId,
        auth,
        query.limit,
      );

      return res.status(200).json({
        messages,
      });
    } catch (error) {
      return next(error);
    }
  },
);

export default router;
