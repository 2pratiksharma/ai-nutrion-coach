import type { ActivityLevel } from "./constants.js";

/**
 * Heart Points score movement by intensity rather than duration, the way the WHO writes its
 * guideline: 150 minutes of moderate activity a week, or 75 minutes of vigorous activity.
 * Scoring moderate minutes 1 point and vigorous minutes 2 makes both add up to the same
 * weekly number, so one target covers every kind of exercise.
 */
export const WEEKLY_HEART_POINTS_TARGET = 150;

/** Compendium of Physical Activities intensity bands, in METs. */
export const MODERATE_MET = 3;
export const VIGOROUS_MET = 6;

export type Intensity = "light" | "moderate" | "vigorous";

const POINTS_PER_MINUTE: Record<Intensity, number> = { light: 0, moderate: 1, vigorous: 2 };

export function intensityFromMet(met: number): Intensity {
  if (met >= VIGOROUS_MET) return "vigorous";
  if (met >= MODERATE_MET) return "moderate";
  return "light";
}

export function heartPointsFromMet(met: number, minutes: number): number {
  if (minutes <= 0) return 0;
  return Math.round(POINTS_PER_MINUTE[intensityFromMet(met)] * minutes);
}

/** Tanaka et al., more accurate across adult ages than the older 220 - age. */
export function maxHeartRate(age: number): number {
  return Math.round(208 - 0.7 * age);
}

export const DEFAULT_RESTING_HR = 70;

/** Karvonen heart-rate reserve as a 0-1 fraction; clamped so bad samples can't skew a day. */
export function heartRateReserve(bpm: number, age: number, restingBpm = DEFAULT_RESTING_HR): number {
  const max = maxHeartRate(age);
  if (max <= restingBpm) return 0;
  return Math.min(1, Math.max(0, (bpm - restingBpm) / (max - restingBpm)));
}

/** Same bands the WHO uses for relative intensity: 40-59% of reserve moderate, 60%+ vigorous. */
export function intensityFromHeartRate(bpm: number, age: number, restingBpm = DEFAULT_RESTING_HR): Intensity {
  const reserve = heartRateReserve(bpm, age, restingBpm);
  if (reserve >= 0.6) return "vigorous";
  if (reserve >= 0.4) return "moderate";
  return "light";
}

export function heartPointsFromHeartRate(bpm: number, minutes: number, age: number, restingBpm = DEFAULT_RESTING_HR): number {
  if (minutes <= 0) return 0;
  return Math.round(POINTS_PER_MINUTE[intensityFromHeartRate(bpm, age, restingBpm)] * minutes);
}

/**
 * Keytel et al. — calories per minute from heart rate. Used only while a heart-rate monitor is
 * connected; without one the MET estimate is the better guess.
 */
export function caloriesPerMinuteFromHeartRate(bpm: number, { sex, age, weightKg }: { sex: "MALE" | "FEMALE"; age: number; weightKg: number }): number {
  const kj =
    sex === "MALE"
      ? -55.0969 + 0.6309 * bpm + 0.1988 * weightKg + 0.2017 * age
      : -20.4022 + 0.4472 * bpm - 0.1263 * weightKg + 0.074 * age;
  return Math.max(0, kj / 4.184);
}

/** Cadence (steps per minute) at or above which walking counts as moderate activity. */
export const BRISK_CADENCE = 100;
/** Cadence at or above which it counts as vigorous. */
export const RUNNING_CADENCE = 130;

/** Heart points for one measured walk/run bout, scored on cadence. */
export function heartPointsFromStepBout(steps: number, minutes: number): number {
  if (minutes <= 0 || steps <= 0) return 0;
  const cadence = steps / minutes;
  if (cadence >= RUNNING_CADENCE) return Math.round(minutes * 2);
  if (cadence >= BRISK_CADENCE) return Math.round(minutes);
  return 0;
}

/**
 * A plain daily step count carries no timing, so cadence can't be measured. Steps above a
 * sedentary baseline are credited as moderate walking, but only the share that realistically
 * comes in continuous bouts, and capped so a busy day on foot can't fill the week by itself.
 * Replaced by {@link heartPointsFromStepBout} as soon as a device sends timed samples.
 */
export const STEP_BASELINE = 4000;
export const BRISK_STEP_SHARE = 0.35;
export const MAX_ESTIMATED_STEP_POINTS = 30;

export function estimatedHeartPointsFromDailySteps(steps: number): number {
  const brisk = Math.max(0, steps - STEP_BASELINE) * BRISK_STEP_SHARE;
  return Math.min(MAX_ESTIMATED_STEP_POINTS, Math.floor(brisk / BRISK_CADENCE));
}

export interface ActivityGoals {
  steps: number;
  activeKcal: number;
  heartPointsWeekly: number;
  workoutDaysWeekly: number;
}

/** Starting points offered at onboarding; every one of them is editable afterwards. */
const GOALS_BY_LEVEL: Record<ActivityLevel, ActivityGoals> = {
  SEDENTARY: { steps: 6000, activeKcal: 250, heartPointsWeekly: 150, workoutDaysWeekly: 2 },
  LIGHT: { steps: 8000, activeKcal: 350, heartPointsWeekly: 150, workoutDaysWeekly: 3 },
  MODERATE: { steps: 10_000, activeKcal: 450, heartPointsWeekly: 150, workoutDaysWeekly: 4 },
  ACTIVE: { steps: 12_000, activeKcal: 600, heartPointsWeekly: 200, workoutDaysWeekly: 5 },
  VERY_ACTIVE: { steps: 14_000, activeKcal: 750, heartPointsWeekly: 250, workoutDaysWeekly: 6 },
};

export function defaultActivityGoals(level: ActivityLevel): ActivityGoals {
  return { ...GOALS_BY_LEVEL[level] };
}

export type PaceStatus = "done" | "ahead" | "on-track" | "behind";

export interface WeekPacing {
  points: number;
  target: number;
  /** Points still needed this week. */
  remaining: number;
  /** Days left including today. */
  daysLeft: number;
  /** Points a day needed from here to finish the week on target. */
  perDay: number;
  status: PaceStatus;
}

/** `dayIndex` is 0 for Monday through 6 for Sunday. */
export function weekPacing(points: number, target: number, dayIndex: number): WeekPacing {
  const daysLeft = Math.max(1, 7 - dayIndex);
  const remaining = Math.max(0, target - points);
  const expected = (target * (dayIndex + 1)) / 7;
  const status: PaceStatus =
    points >= target ? "done" : points >= expected * 1.05 ? "ahead" : points >= expected * 0.85 ? "on-track" : "behind";
  return { points, target, remaining, daysLeft, perDay: Math.ceil(remaining / daysLeft), status };
}

/**
 * Suggests a bigger goal once someone has comfortably outgrown the old one. Uses the median so a
 * single 20,000-step wedding day doesn't move the target.
 */
export function suggestGoalBump(recentValues: number[], currentGoal: number, step = 1000): number | null {
  const enough = recentValues.filter((v) => v > 0);
  if (enough.length < 10) return null;
  const sorted = [...enough].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  if (median < currentGoal * 1.2) return null;
  const suggestion = Math.round(median / step) * step;
  return suggestion > currentGoal ? suggestion : null;
}
