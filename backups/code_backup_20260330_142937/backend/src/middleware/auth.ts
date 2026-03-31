import { NextFunction, Request, Response } from "express";
import { parseBearerToken, resolveAccessSession, type AuthSession } from "../lib/auth";

export type AuthenticatedRequest = Request & {
  auth?: AuthSession;
};

export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = parseBearerToken(req.headers.authorization);

  if (!token) {
    return next();
  }

  try {
    const resolved = await resolveAccessSession(token);
    (req as AuthenticatedRequest).auth = resolved.session;
    return next();
  } catch (error) {
    console.warn("Rejected invalid access token.", error);
    return res.status(401).json({
      error: "Invalid or expired access token.",
    });
  }
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const auth = (req as AuthenticatedRequest).auth;

  if (!auth) {
    return res.status(401).json({
      error: "Authentication required.",
    });
  }

  return next();
}
