import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import type { Session, User } from "@nutrition/shared";
import { env } from "../../config/env.js";
import { prisma } from "../../infra/prisma.js";
import { mailer } from "../../infra/mailer.js";
import { logger } from "../../infra/logger.js";
import { badRequest, conflict, unauthorized } from "../../http/errors.js";

const BCRYPT_ROUNDS = 12;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
// Compared against when the email is unknown so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", BCRYPT_ROUNDS);

export const hashPassword = (password: string) => bcrypt.hash(password, BCRYPT_ROUNDS);
export const verifyPassword = (password: string, hash: string | undefined) => bcrypt.compare(password, hash ?? DUMMY_HASH);

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export function toUser(user: { id: string; name: string; email: string }): User {
  return { id: user.id, name: user.name, email: user.email };
}

export async function signup(input: { name: string; email: string; password: string }) {
  const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) throw conflict("An account with this email already exists", "email");

  const user = await prisma.user.create({
    data: { name: input.name, email: input.email, passwordHash: await hashPassword(input.password) },
  });
  return { user, hasProfile: false };
}

export async function login(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { profile: { select: { id: true } } },
  });
  const valid = await verifyPassword(input.password, user?.passwordHash);
  if (!user || !valid) throw unauthorized("Incorrect email or password");
  return { user, hasProfile: Boolean(user.profile) };
}

export async function getSession(userId: string): Promise<Session> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: { select: { id: true } } },
  });
  if (!user) throw unauthorized();
  return { user: toUser(user), hasProfile: Boolean(user.profile) };
}

/** Always resolves the same way whether or not the email exists, to avoid account enumeration. */
export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true } });
  if (!user) return;

  const token = randomBytes(32).toString("base64url");
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
    }),
  ]);

  const link = new URL("/reset-password", env.APP_URL);
  link.searchParams.set("token", token);

  try {
    await mailer.send({
      to: user.email,
      subject: "Reset your password",
      text: `Hi ${user.name},\n\nReset your password using this link (valid for 1 hour):\n${link}\n\nIf you didn't ask for this, you can ignore this email.`,
    });
  } catch (err) {
    logger.error({ err }, "failed to send password reset email");
  }
}

export async function resetPassword(input: { token: string; password: string }) {
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(input.token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw badRequest("This reset link is invalid or has expired. Request a new one.", "token");
  }

  const passwordHash = await hashPassword(input.password);
  const [, user] = await prisma.$transaction([
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash, tokenVersion: { increment: 1 } },
      include: { profile: { select: { id: true } } },
    }),
  ]);
  return { user, hasProfile: Boolean(user.profile) };
}
