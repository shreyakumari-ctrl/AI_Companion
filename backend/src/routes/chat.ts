import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const router = Router();

const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  userId: z.string().cuid().nullable().optional(),
});

router.post("/send", async (req, res, next) => {
  try {
    const parsedRequest = chatRequestSchema.safeParse(req.body);

    if (!parsedRequest.success) {
      return res.status(400).json({
        error: "Invalid chat payload.",
        details: parsedRequest.error.flatten(),
      });
    }

    const { message, userId } = parsedRequest.data;
    const userProfile = userId
      ? await prisma.userProfile.findUnique({
          where: {
            id: userId,
          },
        })
      : null;

    const context = {
      userId: userProfile?.id ?? null,
      tonePreference: userProfile?.tonePreference ?? "friendly",
      mood: userProfile?.mood ?? "curious",
    };

    return res.status(200).json({
      reply: `Starter AI reply: I heard "${message}". The model is still stubbed, but the full stack handshake is alive.`,
      timestamp: new Date().toISOString(),
      context,
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
