import { Router, type Response } from "express";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  type AuthResponse,
} from "@nutrition/shared";
import { clearAuthCookie, requireAuth, setAuthCookie, signToken } from "../../http/auth.js";
import { authLimiter, passwordResetLimiter } from "../../http/rate-limit.js";
import { authedRoute } from "../../http/router.js";
import * as auth from "./auth.service.js";

function startSession(
  res: Response,
  result: { user: { id: string; name: string; email: string; tokenVersion: number }; hasProfile: boolean },
  status = 200,
) {
  const token = signToken(result.user);
  setAuthCookie(res, token);
  const body: AuthResponse = { user: auth.toUser(result.user), hasProfile: result.hasProfile, token };
  res.status(status).json(body);
}

export const authRouter = Router();

authRouter.post("/signup", authLimiter, async (req, res) => {
  startSession(res, await auth.signup(signupSchema.parse(req.body)), 201);
});

authRouter.post("/login", authLimiter, async (req, res) => {
  startSession(res, await auth.login(loginSchema.parse(req.body)));
});

authRouter.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.status(204).end();
});

authRouter.post("/forgot-password", passwordResetLimiter, async (req, res) => {
  await auth.requestPasswordReset(forgotPasswordSchema.parse(req.body).email);
  res.status(202).json({ ok: true });
});

authRouter.post("/reset-password", passwordResetLimiter, async (req, res) => {
  startSession(res, await auth.resetPassword(resetPasswordSchema.parse(req.body)));
});

authRouter.get(
  "/session",
  requireAuth,
  authedRoute({}, ({ userId }) => auth.getSession(userId)),
);
