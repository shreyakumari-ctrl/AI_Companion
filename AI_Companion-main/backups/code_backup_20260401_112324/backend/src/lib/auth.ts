import crypto from "node:crypto";
import { promisify } from "node:util";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "./env";
import { prisma } from "./prisma";

const scryptAsync = promisify(crypto.scrypt);
const refreshCookieName = "clidy_refresh_token";
const accessSecret = env.JWT_ACCESS_SECRET ?? crypto.randomBytes(32).toString("hex");
const refreshSecret = env.JWT_REFRESH_SECRET ?? crypto.randomBytes(32).toString("hex");

if (!env.JWT_ACCESS_SECRET || !env.JWT_REFRESH_SECRET) {
  console.warn(
    "JWT secrets are missing from the environment. Using ephemeral development secrets for this process only.",
  );
}

export { refreshCookieName };

export type AuthSession = {
  userId: string;
  sessionId: string;
  email: string | null;
};

type TokenKind = "access" | "refresh";

type TokenPayload = {
  sub: string;
  sid: string;
  email: string | null;
  type: TokenKind;
};

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function tokenExpiryDate(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function parseStoredPassword(value: string) {
  const [salt, derivedKey] = value.split(":");

  if (!salt || !derivedKey) {
    throw new Error("Stored password hash is malformed.");
  }

  return {
    salt,
    derivedKey,
  };
}

function signToken(kind: TokenKind, session: AuthSession) {
  return jwt.sign(
    {
      sub: session.userId,
      sid: session.sessionId,
      email: session.email,
      type: kind,
    },
    kind === "access" ? accessSecret : refreshSecret,
    {
      jwtid: crypto.randomUUID(),
      expiresIn:
        kind === "access"
          ? `${env.JWT_ACCESS_TTL_MINUTES}m`
          : `${env.JWT_REFRESH_TTL_DAYS}d`,
    },
  );
}

function verifyToken(token: string, kind: TokenKind): TokenPayload {
  const decoded = jwt.verify(
    token,
    kind === "access" ? accessSecret : refreshSecret,
  ) as TokenPayload;

  if (decoded.type !== kind) {
    throw new Error("Unexpected token type.");
  }

  return decoded;
}

export function parseBearerToken(headerValue?: string | null) {
  if (!headerValue) {
    return null;
  }

  const [scheme, token] = headerValue.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token.trim();
}

export function readRefreshToken(req: Request) {
  const bodyToken =
    typeof req.body === "object" &&
    req.body !== null &&
    "refreshToken" in req.body &&
    typeof (req.body as { refreshToken?: unknown }).refreshToken === "string"
      ? (req.body as { refreshToken: string }).refreshToken
      : null;

  const cookieToken =
    typeof req.cookies?.[refreshCookieName] === "string"
      ? req.cookies[refreshCookieName]
      : null;

  return bodyToken ?? cookieToken;
}

export function setRefreshCookie(res: Response, refreshToken: string) {
  res.cookie(refreshCookieName, refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth",
    maxAge: env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(refreshCookieName, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth",
  });
}

export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, storedPasswordHash: string) {
  const { salt, derivedKey } = parseStoredPassword(storedPasswordHash);
  const actualDerivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  const storedBuffer = Buffer.from(derivedKey, "hex");

  return crypto.timingSafeEqual(actualDerivedKey, storedBuffer);
}

function sanitizeUser(user: {
  id: string;
  email: string | null;
  name: string | null;
  tonePreference: string;
  mood: string;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    tonePreference: user.tonePreference,
    mood: user.mood,
  };
}

export async function createSessionTokens(user: {
  id: string;
  email: string | null;
  name: string | null;
  tonePreference: string;
  mood: string;
}) {
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash: "pending",
      expiresAt: tokenExpiryDate(env.JWT_REFRESH_TTL_DAYS),
    },
  });

  const sessionIdentity: AuthSession = {
    userId: user.id,
    sessionId: session.id,
    email: user.email,
  };

  const accessToken = signToken("access", sessionIdentity);
  const refreshToken = signToken("refresh", sessionIdentity);

  await prisma.session.update({
    where: {
      id: session.id,
    },
    data: {
      refreshTokenHash: hashToken(refreshToken),
    },
  });

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
    sessionId: session.id,
    accessTokenExpiresInMinutes: env.JWT_ACCESS_TTL_MINUTES,
    refreshTokenExpiresInDays: env.JWT_REFRESH_TTL_DAYS,
  };
}

export async function resolveAccessSession(accessToken: string) {
  const payload = verifyToken(accessToken, "access");

  const session = await prisma.session.findUnique({
    where: {
      id: payload.sid,
    },
    include: {
      user: true,
    },
  });

  if (
    !session ||
    session.userId !== payload.sub ||
    session.revokedAt ||
    session.expiresAt <= new Date()
  ) {
    throw new Error("Access session is invalid or expired.");
  }

  return {
    session: {
      userId: session.userId,
      sessionId: session.id,
      email: session.user.email,
    } satisfies AuthSession,
    user: sanitizeUser(session.user),
  };
}

export async function refreshSession(refreshToken: string) {
  const payload = verifyToken(refreshToken, "refresh");

  const session = await prisma.session.findUnique({
    where: {
      id: payload.sid,
    },
    include: {
      user: true,
    },
  });

  if (
    !session ||
    session.userId !== payload.sub ||
    session.revokedAt ||
    session.expiresAt <= new Date()
  ) {
    throw new Error("Refresh session is invalid or expired.");
  }

  if (session.refreshTokenHash !== hashToken(refreshToken)) {
    throw new Error("Refresh token does not match the active session.");
  }

  const sessionIdentity: AuthSession = {
    userId: session.userId,
    sessionId: session.id,
    email: session.user.email,
  };
  const nextAccessToken = signToken("access", sessionIdentity);
  const nextRefreshToken = signToken("refresh", sessionIdentity);

  await prisma.session.update({
    where: {
      id: session.id,
    },
    data: {
      refreshTokenHash: hashToken(nextRefreshToken),
      expiresAt: tokenExpiryDate(env.JWT_REFRESH_TTL_DAYS),
      lastUsedAt: new Date(),
    },
  });

  return {
    user: sanitizeUser(session.user),
    accessToken: nextAccessToken,
    refreshToken: nextRefreshToken,
    sessionId: session.id,
    accessTokenExpiresInMinutes: env.JWT_ACCESS_TTL_MINUTES,
    refreshTokenExpiresInDays: env.JWT_REFRESH_TTL_DAYS,
  };
}

export async function revokeRefreshSession(refreshToken: string) {
  const payload = verifyToken(refreshToken, "refresh");

  const session = await prisma.session.findUnique({
    where: {
      id: payload.sid,
    },
  });

  if (!session || session.userId !== payload.sub) {
    throw new Error("Refresh session not found.");
  }

  if (session.refreshTokenHash !== hashToken(refreshToken)) {
    throw new Error("Refresh token does not match the active session.");
  }

  await prisma.session.update({
    where: {
      id: session.id,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}
