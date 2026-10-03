import type { StepLog, WaterDay, WeightLog } from "@nutrition/shared";
import { prisma } from "../../infra/prisma.js";
import { notFound } from "../../http/errors.js";
import { fromDbDate, resolveDay } from "../../lib/day.js";
import { invalidateActivity } from "../health/health.service.js";

const toWeight = (r: { id: string; date: Date; weightKg: number; notes: string | null }): WeightLog => ({
  id: r.id,
  date: fromDbDate(r.date),
  weightKg: r.weightKg,
  notes: r.notes,
});

const toSteps = (r: { id: string; date: Date; steps: number }): StepLog => ({
  id: r.id,
  date: fromDbDate(r.date),
  steps: r.steps,
});

export async function listWeights(userId: string, limit: number) {
  const rows = await prisma.weightLog.findMany({ where: { userId }, orderBy: { date: "desc" }, take: limit });
  return rows.map(toWeight);
}

export async function saveWeight(userId: string, input: { date?: string; weightKg: number; notes?: string }) {
  const { date, day } = await resolveDay(userId, input.date);
  const notes = input.notes || null;
  const row = await prisma.weightLog.upsert({
    where: { userId_date: { userId, date: day } },
    create: { userId, date: day, weightKg: input.weightKg, notes },
    update: { weightKg: input.weightKg, notes },
  });
  // Weight is carried forward, so it changes the step calories of every later day too.
  await invalidateActivity(userId, date);
  return toWeight(row);
}

export async function deleteWeight(userId: string, id: string) {
  const row = await prisma.weightLog.findFirst({ where: { id, userId }, select: { date: true } });
  if (!row) throw notFound("Weigh-in");
  await prisma.weightLog.delete({ where: { id } });
  await invalidateActivity(userId, fromDbDate(row.date));
}

export async function listSteps(userId: string, limit: number) {
  const rows = await prisma.stepLog.findMany({ where: { userId }, orderBy: { date: "desc" }, take: limit });
  return rows.map(toSteps);
}

export async function saveSteps(userId: string, input: { date?: string; steps: number }) {
  const { date, day } = await resolveDay(userId, input.date);
  const row = await prisma.stepLog.upsert({
    where: { userId_date: { userId, date: day } },
    create: { userId, date: day, steps: input.steps },
    update: { steps: input.steps },
  });
  await invalidateActivity(userId, date, date);
  return toSteps(row);
}

async function waterTarget(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { userId }, select: { waterTargetMl: true } });
  return profile?.waterTargetMl ?? 2500;
}

export async function getWater(userId: string, date?: string): Promise<WaterDay> {
  const { date: iso, day } = await resolveDay(userId, date);
  const [row, targetMl] = await Promise.all([
    prisma.waterLog.findUnique({ where: { userId_date: { userId, date: day } } }),
    waterTarget(userId),
  ]);
  return { date: iso, amountMl: row?.amountMl ?? 0, targetMl };
}

export async function setWater(userId: string, input: { date?: string; amountMl: number }): Promise<WaterDay> {
  const { date, day } = await resolveDay(userId, input.date);
  await prisma.waterLog.upsert({
    where: { userId_date: { userId, date: day } },
    create: { userId, date: day, amountMl: input.amountMl },
    update: { amountMl: input.amountMl },
  });
  return getWater(userId, date);
}

/** Atomic increment so rapid taps from several devices don't lose updates; never goes below zero. */
export async function addWater(userId: string, input: { date?: string; deltaMl: number }): Promise<WaterDay> {
  const { date, day } = await resolveDay(userId, input.date);
  await prisma.$executeRaw`
    INSERT INTO "WaterLog" ("id", "userId", "date", "amountMl")
    VALUES (gen_random_uuid()::text, ${userId}, ${day}::date, GREATEST(${input.deltaMl}::int, 0))
    ON CONFLICT ("userId", "date")
    DO UPDATE SET "amountMl" = GREATEST("WaterLog"."amountMl" + ${input.deltaMl}::int, 0)
  `;
  return getWater(userId, date);
}
