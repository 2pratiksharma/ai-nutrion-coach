import type { Profile as ProfileRow } from "@prisma/client";
import {
  addDays,
  baselineDailyBurn,
  calculateBMR,
  dateRange,
  projectGoal,
  type DailySummary,
  type HealthSource,
  type TrendDay,
  type Trends,
} from "@nutrition/shared";
import { prisma } from "../../infra/prisma.js";
import { fromDbDate, toDbDate } from "../../lib/day.js";
import { dayActivities, getWeekActivity } from "../health/health.service.js";
import { profileContext, targetsFor } from "../profile/profile.service.js";

const round1 = (n: number) => Math.round(n * 10) / 10;
const STREAK_LOOKBACK_DAYS = 365;

interface DayTotals extends TrendDay {
  carbsG: number;
  fatG: number;
  exerciseCount: number;
  stepSource: HealthSource;
  countedSteps: number;
  stepCalories: number;
  exerciseCalories: number;
  deviceCalories: number;
  baseline: number;
  bmr: number;
  weightUsed: number;
}

interface NutritionRow {
  date: Date;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  items: bigint;
}

/**
 * Aggregates every log type per day for [from, to]. Food is one grouped query; movement comes
 * from the activity resolver, which has already reconciled manual logs against any devices.
 */
async function aggregateDays(userId: string, profile: ProfileRow, from: string, to: string): Promise<DayTotals[]> {
  const start = toDbDate(from);
  const end = toDbDate(to);

  const [nutrition, weights, priorWeight] = await Promise.all([
    prisma.$queryRaw<NutritionRow[]>`
      SELECT m."date" AS date,
             COALESCE(SUM(mi."calories"), 0)::float AS calories,
             COALESCE(SUM(mi."proteinG"), 0)::float AS protein,
             COALESCE(SUM(mi."carbsG"), 0)::float AS carbs,
             COALESCE(SUM(mi."fatG"), 0)::float AS fat,
             COUNT(mi."id") AS items
      FROM "Meal" m
      JOIN "MealItem" mi ON mi."mealId" = m."id"
      WHERE m."userId" = ${userId} AND m."date" BETWEEN ${start}::date AND ${end}::date
      GROUP BY m."date"`,
    prisma.weightLog.findMany({ where: { userId, date: { gte: start, lte: end } }, orderBy: { date: "asc" } }),
    prisma.weightLog.findFirst({ where: { userId, date: { lt: start } }, orderBy: { date: "desc" } }),
  ]);

  const nutritionByDay = new Map(nutrition.map((r) => [fromDbDate(r.date), r]));
  const weightByDay = new Map(weights.map((r) => [fromDbDate(r.date), r.weightKg]));

  // Each day uses the most recent weigh-in on or before it, carried forward.
  const dates = dateRange(from, to);
  const carried = new Map<string, number>();
  let weight = priorWeight?.weightKg ?? profile.startWeightKg;
  for (const date of dates) {
    weight = weightByDay.get(date) ?? weight;
    carried.set(date, weight);
  }

  const activity = await dayActivities(userId, profile, from, to, (date) => carried.get(date) ?? weight);

  return dates.map((date) => {
    const weightUsed = carried.get(date)!;
    const food = nutritionByDay.get(date);
    const move = activity.get(date)!;

    const bmr = Math.round(calculateBMR({ ...profile, weightKg: weightUsed }));
    const baseline = baselineDailyBurn(bmr);
    const consumed = Math.round(food?.calories ?? 0);
    const burned = baseline + move.activeKcal;

    return {
      date,
      logged: Boolean(food && food.items > 0n),
      consumed,
      burned,
      balance: consumed - burned,
      proteinG: round1(food?.protein ?? 0),
      carbsG: round1(food?.carbs ?? 0),
      fatG: round1(food?.fat ?? 0),
      steps: move.steps,
      countedSteps: move.countedSteps,
      stepSource: move.stepSource,
      exerciseMinutes: move.exerciseMin,
      exerciseCount: move.exerciseCount,
      heartPoints: move.heartPoints,
      activeKcal: move.activeKcal,
      weightKg: weightByDay.get(date) ?? null,
      weightUsed,
      bmr,
      baseline,
      exerciseCalories: move.exerciseKcal,
      stepCalories: move.stepKcal,
      deviceCalories: move.deviceKcal,
    };
  });
}

export async function dailySummary(userId: string, date?: string): Promise<DailySummary> {
  const ctx = await profileContext(userId, date);
  const iso = date ?? ctx.today;
  const [[day], water, week] = await Promise.all([
    aggregateDays(userId, ctx.row, iso, iso),
    prisma.waterLog.findUnique({ where: { userId_date: { userId, date: toDbDate(iso) } } }),
    getWeekActivity(userId, iso),
  ]);

  return {
    date: iso,
    weightKg: day.weightUsed,
    targets: targetsFor(ctx.row, day.weightUsed),
    consumed: { calories: day.consumed, proteinG: day.proteinG, carbsG: day.carbsG, fatG: day.fatG },
    activity: {
      date: iso,
      steps: day.steps,
      countedSteps: day.countedSteps,
      stepSource: day.stepSource,
      activeKcal: day.activeKcal,
      heartPoints: day.heartPoints,
      exerciseMinutes: day.exerciseMinutes,
      exerciseCount: day.exerciseCount,
      breakdown: { exercise: day.exerciseCalories, steps: day.stepCalories, device: day.deviceCalories },
    },
    burned: {
      baseline: day.baseline,
      exercise: day.exerciseCalories,
      steps: day.stepCalories,
      device: day.deviceCalories,
      total: day.burned,
    },
    energyBalance: day.balance,
    waterMl: water?.amountMl ?? 0,
    loggedWeightToday: day.weightKg !== null,
    week: { heartPoints: week.heartPoints, workoutDays: week.workoutDays, pacing: week.pacing },
  };
}

async function loggedDates(userId: string, since: string): Promise<Set<string>> {
  const rows = await prisma.$queryRaw<{ date: Date }[]>`
    SELECT DISTINCT m."date" AS date
    FROM "Meal" m
    WHERE m."userId" = ${userId} AND m."date" >= ${toDbDate(since)}::date
      AND EXISTS (SELECT 1 FROM "MealItem" mi WHERE mi."mealId" = m."id")`;
  return new Set(rows.map((r) => fromDbDate(r.date)));
}

/** A streak counts consecutive days with food logged; today doesn't break it until it's over. */
export function computeStreak(dates: Set<string>, today: string, lookbackDays: number) {
  let current = 0;
  let cursor = dates.has(today) ? today : addDays(today, -1);
  while (dates.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }

  let longest = 0;
  let run = 0;
  for (const date of dateRange(addDays(today, -lookbackDays), today)) {
    run = dates.has(date) ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  return { current, longest };
}

export async function trends(userId: string, days: number): Promise<Trends> {
  const ctx = await profileContext(userId);
  const to = ctx.today;
  const from = addDays(to, -(days - 1));

  const [series, dates, recentWeights, latestWeight] = await Promise.all([
    aggregateDays(userId, ctx.row, from, to),
    loggedDates(userId, addDays(to, -STREAK_LOOKBACK_DAYS)),
    prisma.weightLog.findMany({
      where: { userId, date: { gte: toDbDate(addDays(to, -60)) } },
      orderBy: { date: "asc" },
    }),
    prisma.weightLog.findFirst({ where: { userId }, orderBy: { date: "desc" } }),
  ]);

  const logged = series.filter((d) => d.logged);
  const avg = (pick: (d: DayTotals) => number, rows: DayTotals[] = logged) =>
    rows.length ? Math.round(rows.reduce((s, d) => s + pick(d), 0) / rows.length) : 0;

  const latest = latestWeight?.weightKg ?? ctx.row.startWeightKg;

  return {
    from,
    to,
    days: series.map((d) => ({
      date: d.date,
      logged: d.logged,
      consumed: d.consumed,
      burned: d.burned,
      balance: d.balance,
      proteinG: d.proteinG,
      steps: d.steps,
      exerciseMinutes: d.exerciseMinutes,
      heartPoints: d.heartPoints,
      activeKcal: d.activeKcal,
      weightKg: d.weightKg,
    })),
    averages: {
      loggedDays: logged.length,
      consumed: avg((d) => d.consumed),
      burned: avg((d) => d.burned),
      balance: avg((d) => d.balance),
      proteinG: avg((d) => d.proteinG),
      steps: avg((d) => d.steps, series),
      heartPoints: avg((d) => d.heartPoints, series),
      activeKcal: avg((d) => d.activeKcal, series),
    },
    weight: {
      start: ctx.row.startWeightKg,
      latest,
      change: round1(latest - ctx.row.startWeightKg),
      target: ctx.row.targetWeightKg,
      projection: projectGoal(
        recentWeights.map((w) => ({ date: fromDbDate(w.date), weightKg: w.weightKg })),
        ctx.row.targetWeightKg,
        to,
      ),
    },
    streak: computeStreak(dates, to, STREAK_LOOKBACK_DAYS),
  };
}
