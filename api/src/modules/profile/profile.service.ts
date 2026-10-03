import type { Profile as ProfileRow } from "@prisma/client";
import {
  calculateTargets,
  defaultActivityGoals,
  todayInTimeZone,
  type ActivityGoalsInput,
  type Profile,
  type ProfileInput,
  type ProfileResponse,
  type Targets,
} from "@nutrition/shared";
import { prisma } from "../../infra/prisma.js";
import { conflict, notFound } from "../../http/errors.js";
import { DEFAULT_TIMEZONE, toDbDate } from "../../lib/day.js";
import { invalidateActivity } from "../health/health.service.js";

export function toProfile(row: ProfileRow): Profile {
  return {
    sex: row.sex,
    age: row.age,
    heightCm: row.heightCm,
    startWeightKg: row.startWeightKg,
    targetWeightKg: row.targetWeightKg,
    activityLevel: row.activityLevel,
    dietPreference: row.dietPreference,
    goalType: row.goalType,
    stepTarget: row.stepTarget,
    waterTargetMl: row.waterTargetMl,
    activeKcalTarget: row.activeKcalTarget,
    heartPointsTarget: row.heartPointsTarget,
    workoutDaysTarget: row.workoutDaysTarget,
    timezone: row.timezone,
  };
}

export function targetsFor(profile: ProfileRow, weightKg: number): Targets {
  const t = calculateTargets({ ...profile, weightKg });
  return {
    bmr: t.bmr,
    tdee: t.tdee,
    calories: t.calories,
    proteinG: t.proteinG,
    steps: profile.stepTarget,
    waterMl: profile.waterTargetMl,
    activeKcal: profile.activeKcalTarget,
    heartPointsWeekly: profile.heartPointsTarget,
    workoutDaysWeekly: profile.workoutDaysTarget,
  };
}

/** Most recent weigh-in on or before the day, falling back to the onboarding weight. */
export async function weightOnDay(userId: string, day: Date, fallbackKg: number): Promise<number> {
  const log = await prisma.weightLog.findFirst({
    where: { userId, date: { lte: day } },
    orderBy: { date: "desc" },
    select: { weightKg: true },
  });
  return log?.weightKg ?? fallbackKg;
}

export interface ProfileContext {
  row: ProfileRow;
  today: string;
  weightKg: number;
  targets: Targets;
}

/** Everything day-scoped features need about the user, evaluated as of `date` (default today). */
export async function profileContext(userId: string, date?: string): Promise<ProfileContext> {
  const row = await prisma.profile.findUnique({ where: { userId } });
  if (!row) throw conflict("Complete your profile first");
  const today = todayInTimeZone(row.timezone);
  const weightKg = await weightOnDay(userId, toDbDate(date ?? today), row.startWeightKg);
  return { row, today, weightKg, targets: targetsFor(row, weightKg) };
}

export async function getProfile(userId: string): Promise<ProfileResponse> {
  const exists = await prisma.profile.count({ where: { userId } });
  if (!exists) throw notFound("Profile");
  const ctx = await profileContext(userId);
  return { profile: toProfile(ctx.row), currentWeightKg: ctx.weightKg, targets: ctx.targets, today: ctx.today };
}

export async function saveProfile(userId: string, input: ProfileInput): Promise<{ created: boolean; body: ProfileResponse }> {
  const existing = await prisma.profile.findUnique({ where: { userId }, select: { id: true } });
  // First time through, movement goals start from the activity level the user just picked.
  const suggested = defaultActivityGoals(input.activityLevel);
  const data = {
    ...input,
    targetWeightKg: input.targetWeightKg ?? null,
    ...(existing
      ? {}
      : {
          stepTarget: input.stepTarget ?? suggested.steps,
          activeKcalTarget: input.activeKcalTarget ?? suggested.activeKcal,
          heartPointsTarget: input.heartPointsTarget ?? suggested.heartPointsWeekly,
          workoutDaysTarget: input.workoutDaysTarget ?? suggested.workoutDaysWeekly,
        }),
  };

  await prisma.$transaction(async (tx) => {
    await tx.profile.upsert({ where: { userId }, create: { userId, ...data }, update: data });
    if (!existing) {
      // The onboarding weight doubles as the first weigh-in.
      const day = toDbDate(todayInTimeZone(input.timezone ?? DEFAULT_TIMEZONE));
      await tx.weightLog.upsert({
        where: { userId_date: { userId, date: day } },
        create: { userId, date: day, weightKg: input.startWeightKg },
        update: {},
      });
    }
  });

  // Height and weight feed the calorie estimates behind every cached day.
  await invalidateActivity(userId);
  return { created: !existing, body: await getProfile(userId) };
}

/** Partial update for the movement goals screen. */
export async function saveActivityGoals(userId: string, input: ActivityGoalsInput): Promise<ProfileResponse> {
  const { count } = await prisma.profile.updateMany({ where: { userId }, data: input });
  if (count === 0) throw notFound("Profile");
  return getProfile(userId);
}
