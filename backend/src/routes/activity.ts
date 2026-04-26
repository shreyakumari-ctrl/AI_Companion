import { Router } from "express";
import { listConversationsForUser } from "../lib/chat-service";
import { prisma } from "../lib/prisma";
import { optionalAuth, requireAuth, type AuthenticatedRequest } from "../middleware/auth";

const router = Router();

router.get("/", optionalAuth, requireAuth, async (req, res, next) => {
  try {
    const auth = (req as AuthenticatedRequest).auth!;

    const conversations = await listConversationsForUser(auth, 10);

    const rawMessages = await prisma.chatMessage.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const messages = rawMessages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      provider: m.provider,
      conversationId: m.conversationId,
      createdAt: m.createdAt.toISOString(),
    }));

    return res.status(200).json({ conversations, messages });
  } catch (error) {
    return next(error);
  }
});

export default router;
