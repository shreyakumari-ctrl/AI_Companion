import { Router } from "express";
import { z } from "zod";
import {
  clearRefreshCookie,
  createSessionTokens,
  hashPassword,
  readRefreshToken,
  refreshSession,
  revokeRefreshSession,
  setRefreshCookie,
  verifyPassword,
} from "../lib/auth";
import { prisma } from "../lib/prisma";
import { optionalAuth, requireAuth, type AuthenticatedRequest } from "../middleware/auth";

const router = Router();

const registerSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(1).max(120).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
});

const profileSchema = z
  .object({
    name: z.string().trim().min(1).max(120).nullable().optional(),
    tonePreference: z.string().trim().min(1).max(60).optional(),
    mood: z.string().trim().min(1).max(60).optional(),
    bio: z.string().trim().max(500).nullable().optional(),
    avatarUrl: z.string().trim().url().nullable().optional(),
  })
  .refine(
    (payload) =>
      payload.name !== undefined ||
      payload.tonePreference !== undefined ||
      payload.mood !== undefined ||
      payload.bio !== undefined ||
      payload.avatarUrl !== undefined,
    {
      message: "At least one profile field must be provided.",
    },
  );

router.post("/register", async (req, res, next) => {
  try {
    const payload = registerSchema.parse(req.body);
    const email = payload.email.toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return res.status(409).json({
        error: "An account with that email already exists.",
      });
    }

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(payload.password),
        name: payload.name,
      },
    });

    const session = await createSessionTokens(user);
    setRefreshCookie(res, session.refreshToken);

    return res.status(201).json(session);
  } catch (error) {
    return next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);
    const email = payload.email.toLowerCase();

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user?.passwordHash) {
      return res.status(401).json({
        error: "Invalid email or password.",
      });
    }

    const passwordMatches = await verifyPassword(payload.password, user.passwordHash);

    if (!passwordMatches) {
      return res.status(401).json({
        error: "Invalid email or password.",
      });
    }

    const session = await createSessionTokens(user);
    setRefreshCookie(res, session.refreshToken);

    return res.status(200).json(session);
  } catch (error) {
    return next(error);
  }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const refreshToken = readRefreshToken(req);

    if (!refreshToken) {
      return res.status(400).json({
        error: "Refresh token is required.",
      });
    }

    const session = await refreshSession(refreshToken);
    setRefreshCookie(res, session.refreshToken);

    return res.status(200).json(session);
  } catch (error) {
    clearRefreshCookie(res);
    return res.status(401).json({
      error: "Refresh token is invalid or expired.",
    });
  }
});

router.post("/logout", async (req, res) => {
  const refreshToken = readRefreshToken(req);

  clearRefreshCookie(res);

  if (!refreshToken) {
    return res.status(200).json({
      ok: true,
    });
  }

  try {
    await revokeRefreshSession(refreshToken);
  } catch (error) {
    console.warn("Logout skipped revocation because the refresh token was already invalid.", error);
  }

  return res.status(200).json({
    ok: true,
  });
});

router.get("/me", optionalAuth, requireAuth, async (req, res, next) => {
  try {
    const auth = (req as AuthenticatedRequest).auth!;
    const user = await prisma.user.findUnique({
      where: {
        id: auth.userId,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: "User not found.",
      });
    }

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        tonePreference: user.tonePreference,
        mood: user.mood,
      },
      sessionId: auth.sessionId,
    });
  } catch (error) {
    return next(error);
  }
});

router.patch("/profile", optionalAuth, requireAuth, async (req, res, next) => {
  try {
    const auth = (req as AuthenticatedRequest).auth!;
    const payload = profileSchema.parse(req.body);

    const user = await prisma.user.update({
      where: {
        id: auth.userId,
      },
      data: {
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.tonePreference !== undefined
          ? { tonePreference: payload.tonePreference }
          : {}),
        ...(payload.mood !== undefined ? { mood: payload.mood } : {}),
        ...(payload.bio !== undefined ? { bio: payload.bio } : {}),
        ...(payload.avatarUrl !== undefined ? { avatarUrl: payload.avatarUrl } : {}),
      },
    });

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        tonePreference: user.tonePreference,
        mood: user.mood,
      },
      sessionId: auth.sessionId,
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
