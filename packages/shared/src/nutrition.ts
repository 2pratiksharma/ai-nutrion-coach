import type { ActivityLevel, GoalType, Sex } from "./constants.js";
import { addDays, daysBetween } from "./dates.js";

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  ACTIVE: 1.725,
  VERY_ACTIVE: 1.9,
};

const GOAL_CALORIE_ADJUSTMENT: Record<GoalType, number> = {
  LOSE_FAT: -500,
  MAINTAIN: 0,
  GAIN_MUSCLE: 300,
};

const GOAL_PROTEIN_PER_KG: Record<GoalType, number> = {
  LOSE_FAT: 2.0,
  MAINTAIN: 1.6,
  GAIN_MUSCLE: 1.8,
};

const MIN_CALORIES: Record<Sex, number> = {
  MALE: 1500,
  FEMALE: 1200,
};

export interface BodyStats {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
}

export interface TargetInput extends BodyStats {
  activityLevel: ActivityLevel;
  goalType: GoalType;
}

export interface NutritionTargets {
  bmr: number;
  tdee: number;
  calories: number;
  proteinG: number;
}

/** Mifflin-St Jeor equation. */
export function calculateBMR({ sex, age, heightCm, weightKg }: BodyStats): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "MALE" ? base + 5 : base - 161;
}

export function calculateTargets(input: TargetInput): NutritionTargets {
  const bmr = calculateBMR(input);
  const tdee = bmr * ACTIVITY_MULTIPLIER[input.activityLevel];
  const rawTarget = tdee + GOAL_CALORIE_ADJUSTMENT[input.goalType];
  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    calories: Math.round(Math.max(rawTarget, MIN_CALORIES[input.sex])),
    proteinG: Math.round(input.weightKg * GOAL_PROTEIN_PER_KG[input.goalType]),
  };
}

export interface Per100g {
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

export function macrosForQuantity(food: Per100g, quantityG: number) {
  const factor = quantityG / 100;
  const one = (n: number) => Math.round(n * factor * 10) / 10;
  return {
    calories: Math.round(food.caloriesPer100g * factor),
    proteinG: one(food.proteinPer100g),
    carbsG: one(food.carbsPer100g),
    fatG: one(food.fatPer100g),
  };
}

/** kcal = MET × body weight (kg) × duration (h). */
export function caloriesForActivity(met: number, weightKg: number, durationMin: number): number {
  return Math.round(met * weightKg * (durationMin / 60));
}

/**
 * Net walking cost of ~0.5 kcal per kg per km, with stride length estimated from height.
 * Net (not gross) so it doesn't double count the resting burn already in the daily baseline.
 */
export function caloriesFromSteps(steps: number, weightKg: number, heightCm: number): number {
  const strideKm = (heightCm * 0.415) / 100_000;
  return Math.round(0.5 * weightKg * steps * strideKm);
}

/** Resting burn plus digestion and minimal daily movement, excluding logged activity. */
export function baselineDailyBurn(bmr: number): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIER.SEDENTARY);
}

export interface WeightPoint {
  date: string;
  weightKg: number;
}

export type GoalProjection =
  | { status: "no-target" }
  | { status: "reached" }
  | { status: "not-enough-data" }
  | { status: "off-track"; weeklyRateKg: number }
  | { status: "on-track"; weeklyRateKg: number; projectedDate: string; daysRemaining: number };

const PROJECTION_WINDOW_DAYS = 42;
const MIN_SPAN_DAYS = 7;
const MAX_PROJECTION_DAYS = 730;

/** Least-squares trend over recent weigh-ins, extrapolated to the target weight. */
export function projectGoal(points: WeightPoint[], targetWeightKg: number | null, today: string): GoalProjection {
  if (targetWeightKg == null) return { status: "no-target" };
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted.at(-1);
  if (latest && Math.abs(latest.weightKg - targetWeightKg) < 0.25) return { status: "reached" };

  const recent = sorted.filter((p) => daysBetween(p.date, today) <= PROJECTION_WINDOW_DAYS);
  if (!latest || recent.length < 2 || daysBetween(recent[0].date, recent.at(-1)!.date) < MIN_SPAN_DAYS) {
    return { status: "not-enough-data" };
  }

  const xs = recent.map((p) => daysBetween(recent[0].date, p.date));
  const ys = recent.map((p) => p.weightKg);
  const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
  const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;
  const numerator = xs.reduce((sum, x, i) => sum + (x - meanX) * (ys[i] - meanY), 0);
  const denominator = xs.reduce((sum, x) => sum + (x - meanX) ** 2, 0);
  const slopePerDay = numerator / denominator;
  const weeklyRateKg = Math.round(slopePerDay * 7 * 100) / 100;

  const remainingKg = targetWeightKg - latest.weightKg;
  const movingTowardTarget = Math.sign(slopePerDay) === Math.sign(remainingKg) && Math.abs(weeklyRateKg) >= 0.05;
  if (!movingTowardTarget) return { status: "off-track", weeklyRateKg };

  const daysRemaining = Math.ceil(remainingKg / slopePerDay);
  if (daysRemaining > MAX_PROJECTION_DAYS) return { status: "off-track", weeklyRateKg };

  return {
    status: "on-track",
    weeklyRateKg,
    daysRemaining,
    projectedDate: addDays(latest.date, daysRemaining),
  };
}
