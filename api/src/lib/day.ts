import { todayInTimeZone } from "@nutrition/shared";
import { prisma } from "../infra/prisma.js";

export const DEFAULT_TIMEZONE = "Asia/Kolkata";

/** Calendar dates are stored as DATE columns, which Prisma maps to midnight UTC. */
export function toDbDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

export function fromDbDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function userTimeZone(userId: string): Promise<string> {
  const profile = await prisma.profile.findUnique({ where: { userId }, select: { timezone: true } });
  return profile?.timezone ?? DEFAULT_TIMEZONE;
}

export async function userToday(userId: string): Promise<string> {
  return todayInTimeZone(await userTimeZone(userId));
}

/** Resolves an optional YYYY-MM-DD, defaulting to "today" in the user's timezone. */
export async function resolveDay(userId: string, date?: string) {
  const iso = date ?? (await userToday(userId));
  return { date: iso, day: toDbDate(iso) };
}
