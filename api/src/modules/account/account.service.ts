import { prisma } from "../../infra/prisma.js";
import { badRequest, conflict, forbidden, notFound } from "../../http/errors.js";
import { hashPassword, toUser, verifyPassword } from "../auth/auth.service.js";

async function requireUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound("Account");
  return user;
}

async function assertPassword(hash: string, password: string | undefined, field: string) {
  if (!password) throw badRequest("Enter your current password to confirm", field);
  if (!(await verifyPassword(password, hash))) throw forbidden("Password is incorrect");
}

export async function updateAccount(userId: string, input: { name?: string; email?: string; currentPassword?: string }) {
  const user = await requireUser(userId);
  const emailChanged = input.email !== undefined && input.email !== user.email;

  if (emailChanged) {
    await assertPassword(user.passwordHash, input.currentPassword, "currentPassword");
    const taken = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
    if (taken) throw conflict("That email is already in use", "email");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { name: input.name, email: emailChanged ? input.email : undefined },
  });
  return toUser(updated);
}

/** Returns the updated user so the caller can reissue this device's session. */
export async function changePassword(userId: string, input: { currentPassword: string; newPassword: string }) {
  const user = await requireUser(userId);
  await assertPassword(user.passwordHash, input.currentPassword, "currentPassword");
  if (input.currentPassword === input.newPassword) {
    throw badRequest("New password must be different", "newPassword");
  }
  return prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(input.newPassword), tokenVersion: { increment: 1 } },
  });
}

export async function deleteAccount(userId: string, password: string) {
  const user = await requireUser(userId);
  await assertPassword(user.passwordHash, password, "password");
  await prisma.user.delete({ where: { id: userId } });
}
