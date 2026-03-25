import { Router, Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";
import { providerRegistry, InferenceRequest, HistoryTurn } from "../lib/adapters";
import { resolveTemplate } from "../lib/promptTemplates";

const router = Router();

const chatBodySchema = z.object({
  message: z.string().min(1).max(1000),
  provider: z.enum(["gemini", "openai"]).default("gemini"),
  templateId: z.string().optional(),
  history: z
    .array(
      z.object({
        sender: z.enum(["user", "ai"]),
        text: z.string(),
      }),
    )
    .max(5)
    .default([]),
  userId: z.string().nullable().optional(),
  tonePreference: z.string().optional(),
  mood: z.string().optional(),
});

// POST /api/chat — non-streaming
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  let body: z.infer<typeof chatBodySchema>;

  try {
    body = chatBodySchema.parse(req.body);
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: "Invalid request body.", details: err.issues });
    }
    return next(err);
  }

  const adapter = providerRegistry[body.provider];
  if (!adapter) {
    return res.status(400).json({ error: `Unknown provider: ${body.provider}` });
  }

  if (!adapter.isAvailable()) {
    return res
      .status(503)
      .json({ error: `Provider ${body.provider} is not configured on this server.` });
  }

  const systemInstruction = resolveTemplate(body.templateId, {
    tonePreference: body.tonePreference,
    mood: body.mood,
  });

  const history: HistoryTurn[] = body.history.slice(-5);

  const inferenceReq: InferenceRequest = {
    message: body.message,
    history,
    template: { systemInstruction },
    userId: body.userId,
  };

  try {
    const reply = await adapter.generate(inferenceReq);
    return res.json({
      reply,
      provider: body.provider,
      model: null,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return next(err);
  }
});

// POST /api/chat/stream — SSE streaming
router.post("/stream", async (req: Request, res: Response, next: NextFunction) => {
  let body: z.infer<typeof chatBodySchema>;

  try {
    body = chatBodySchema.parse(req.body);
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: "Invalid request body.", details: err.issues });
    }
    return next(err);
  }

  const adapter = providerRegistry[body.provider];
  if (!adapter) {
    return res.status(400).json({ error: `Unknown provider: ${body.provider}` });
  }

  if (!adapter.isAvailable()) {
    return res
      .status(503)
      .json({ error: `Provider ${body.provider} is not configured on this server.` });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const systemInstruction = resolveTemplate(body.templateId, {
    tonePreference: body.tonePreference,
    mood: body.mood,
  });

  const history: HistoryTurn[] = body.history.slice(-5);

  const inferenceReq: InferenceRequest = {
    message: body.message,
    history,
    template: { systemInstruction },
    userId: body.userId,
  };

  try {
    await adapter.generateStream(inferenceReq, (chunk: string) => {
      res.write(`data: ${chunk}\n\n`);
    });
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    res.write("data: [ERROR]\n\n");
    res.end();
  }
});

// GET /api/providers — list configured providers
router.get("/providers", (_req: Request, res: Response) => {
  const available = Object.keys(providerRegistry).filter((name) =>
    providerRegistry[name].isAvailable(),
  );
  return res.json(available);
});

export default router;
