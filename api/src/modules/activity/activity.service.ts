import type { Prisma } from "@prisma/client";
import {
  caloriesForActivity,
  heartPointsFromMet,
  type Activity,
  type DayExercises,
  type ExerciseLog,
} from "@nutrition/shared";
import { prisma } from "../../infra/prisma.js";
import { notFound } from "../../http/errors.js";
import { fromDbDate, resolveDay } from "../../lib/day.js";
import { profileContext } from "../profile/profile.service.js";
import { invalidateActivity } from "../health/health.service.js";

const logInclude = {
  activity: { select: { id: true, name: true, category: true } },
} satisfies Prisma.ExerciseLogInclude;

type LogRow = Prisma.ExerciseLogGetPayload<{ include: typeof logInclude }>;

function toExerciseLog(row: LogRow): ExerciseLog {
  return {
    id: row.id,
    date: fromDbDate(row.date),
    durationMin: row.durationMin,
    caloriesBurned: row.caloriesBurned,
    heartPoints: row.heartPoints,
    notes: row.notes,
    activity: row.activity,
  };
}

export function listActivities(): Promise<Activity[]> {
  return prisma.activity.findMany({ orderBy: [{ category: "asc" }, { met: "asc" }, { name: "asc" }] });
}

export async function getDay(userId: string, date?: string): Promise<DayExercises> {
  const { date: iso, day } = await resolveDay(userId, date);
  const rows = await prisma.exerciseLog.findMany({
    where: { userId, date: day },
    include: logInclude,
    orderBy: { createdAt: "asc" },
  });
  return { date: iso, exercises: rows.map(toExerciseLog) };
}

export async function logExercise(
  userId: string,
  input: { activityId: string; durationMin: number; date?: string; notes?: string },
): Promise<ExerciseLog> {
  const activity = await prisma.activity.findUnique({ where: { id: input.activityId } });
  if (!activity) throw notFound("Activity");

  const { date, day } = await resolveDay(userId, input.date);
  const { weightKg } = await profileContext(userId, date);

  const row = await prisma.exerciseLog.create({
    data: {
      userId,
      activityId: activity.id,
      date: day,
      durationMin: input.durationMin,
      notes: input.notes || null,
      weightKgUsed: weightKg,
      caloriesBurned: caloriesForActivity(activity.met, weightKg, input.durationMin),
      // Snapshot too: a future change to the catalog's MET shouldn't rewrite past weeks.
      heartPoints: heartPointsFromMet(activity.met, input.durationMin),
    },
    include: logInclude,
  });
  await invalidateActivity(userId, date, date);
  return toExerciseLog(row);
}

export async function deleteExercise(userId: string, id: string) {
  const row = await prisma.exerciseLog.findFirst({ where: { id, userId }, select: { date: true } });
  if (!row) throw notFound("Workout");
  await prisma.exerciseLog.delete({ where: { id } });
  const date = fromDbDate(row.date);
  await invalidateActivity(userId, date, date);
}
