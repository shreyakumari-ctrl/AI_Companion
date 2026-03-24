import { NextFunction, Request, Response, Router } from "express";
import { z } from "zod";
import { generateAssistantReply } from "../lib/gemini";
import { prisma } from "../lib/prisma";

const router = Router();

const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  userId: z.string().cuid().nullable().optional(),
  history: z
    .array(
      z.object({
        sender: z.enum(["user", "ai"]),
        text: z.string().trim().min(1).max(4000),
      }),
    )
    .optional(),
});

async function bestEffortPersistChatTurn(params: {
  userId: string | null;
  message: string;
  reply: string;
  provider: string;
}) {
  try {
    await prisma.chatMessage.createMany({
      data: [
        {
          role: "user",
          content: params.message,
          userId: params.userId,
          provider: "client",
        },
        {
          role: "assistant",
          content: params.reply,
          userId: params.userId,
          provider: params.provider,
        },
      ],
    });
  } catch (error) {
    console.warn("Chat persistence skipped.", error);
  }
}

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

    const { message, userId } = parsedRequest.data;
    const user = userId
      ? await prisma.user.findUnique({
          where: {
            id: userId,
          },
        })
      : null;

    const context = {
      userId: user?.id ?? null,
      tonePreference: user?.tonePreference ?? "friendly",
      mood: user?.mood ?? "curious",
    };

    const assistantReply = await generateAssistantReply({
      message,
      tonePreference: context.tonePreference,
      mood: context.mood,
    });

    await bestEffortPersistChatTurn({
      userId: context.userId,
      message,
      reply: assistantReply.reply,
      provider: assistantReply.provider,
    });

    return res.status(200).json({
      reply: assistantReply.reply,
      timestamp: new Date().toISOString(),
      provider: assistantReply.provider,
      model: assistantReply.model,
      context,
    });
  } catch (error) {
    return next(error);
  }
}

router.post("/", handleChatRequest);
router.post("/send", handleChatRequest);

export default router;
