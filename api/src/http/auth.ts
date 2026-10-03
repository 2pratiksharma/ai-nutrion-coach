import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../infra/prisma.js";
import { unauthorized } from "./errors.js";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export const AUTH_COOKIE = "token";
const TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

interface TokenClaims {
  sub: string;
  ver: number;
}

export function signToken(user: { id: string; tokenVersion: number }): string {
  const claims: TokenClaims = { sub: user.id, ver: user.tokenVersion };
  return jwt.sign(claims, env.JWT_SECRET, { expiresIn: TOKEN_TTL_SECONDS, algorithm: "HS256" });
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    maxAge: TOKEN_TTL_SECONDS * 1000,
    path: "/",
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE, { path: "/", httpOnly: true, sameSite: "lax", secure: env.isProduction });
}

function readToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return req.cookies?.[AUTH_COOKIE];
}

function verify(token: string): TokenClaims | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
    if (typeof payload === "string" || typeof payload.sub !== "string" || typeof payload.ver !== "number") {
      return null;
    }
    return { sub: payload.sub, ver: payload.ver };
  } catch {
    return null;
  }
}

/**
 * Verifies the token and that it hasn't been revoked. The version lookup is a primary-key read;
 * swap in a short-lived cache here if it ever shows up in profiles.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = readToken(req);
  if (!token) throw unauthorized();

  const claims = verify(token);
  if (!claims) throw unauthorized("Your session has expired. Please log in again.");

  const user = await prisma.user.findUnique({ where: { id: claims.sub }, select: { tokenVersion: true } });
  if (!user || user.tokenVersion !== claims.ver) {
    throw unauthorized("Your session has expired. Please log in again.");
  }

  req.userId = claims.sub;
  next();
}

export function userIdOf(req: Request): string {
  if (!req.userId) throw unauthorized();
  return req.userId;
}
