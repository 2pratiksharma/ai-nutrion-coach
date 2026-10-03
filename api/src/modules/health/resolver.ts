import {
  caloriesFromSteps,
  estimatedHeartPointsFromDailySteps,
  heartPointsFromStepBout,
  HEALTH_SOURCE_PRIORITY,
  type HealthSource,
} from "@nutrition/shared";

/** A workout as the resolver sees it: how long, how much it burned, and whether it was on foot. */
export interface ExerciseInput {
  durationMin: number;
  caloriesBurned: number;
  heartPoints: number;
  stepsPerMinute: number | null;
}

/** One source's account of the day's steps. `bouts` is empty for a hand-typed daily total. */
export interface StepCandidate {
  source: HealthSource;
  steps: number;
  bouts: { steps: number; minutes: number }[];
}

export interface ResolveInput {
  exercises: ExerciseInput[];
  stepCandidates: StepCandidate[];
  /** Best available active-energy total for the day, covering workouts as well. */
  deviceKcal: number;
  weightKg: number;
  heightCm: number;
}

export interface ResolvedActivity {
  steps: number;
  /** Steps that weren't already counted as part of a workout; these earn the step calories. */
  countedSteps: number;
  stepSource: HealthSource;
  exerciseMin: number;
  exerciseCount: number;
  exerciseKcal: number;
  stepKcal: number;
  deviceKcal: number;
  activeKcal: number;
  heartPoints: number;
}

const sum = (values: number[]) => values.reduce((total, n) => total + n, 0);

/**
 * Reconciles everything that claims to describe one day's movement into a single answer.
 *
 * Two rules keep the totals honest when sources overlap:
 *  - Steps come from exactly one source, the most trustworthy one that has any (never a sum).
 *  - Nothing is counted twice. Steps taken during a logged walk or run are removed before step
 *    calories are added, and a device's active energy only contributes what it reports *beyond*
 *    the workouts you logged yourself.
 */
export function resolveActivity(input: ResolveInput): ResolvedActivity {
  const { exercises, weightKg, heightCm } = input;

  const exerciseMin = sum(exercises.map((e) => e.durationMin));
  const exerciseKcal = Math.round(sum(exercises.map((e) => e.caloriesBurned)));
  const exercisePoints = sum(exercises.map((e) => e.heartPoints));

  const best = input.stepCandidates
    .filter((c) => c.steps > 0)
    .sort((a, b) => HEALTH_SOURCE_PRIORITY[a.source] - HEALTH_SOURCE_PRIORITY[b.source])[0];
  const steps = best?.steps ?? 0;

  // Steps produced by a workout are already paid for by that workout's calories.
  const workoutSteps = sum(exercises.map((e) => e.durationMin * (e.stepsPerMinute ?? 0)));
  const netSteps = Math.max(0, steps - workoutSteps);
  const countedShare = steps > 0 ? netSteps / steps : 0;

  const stepKcal = caloriesFromSteps(netSteps, weightKg, heightCm);
  const bouts = best?.bouts ?? [];
  const stepPoints = bouts.length
    ? Math.round(sum(bouts.map((b) => heartPointsFromStepBout(b.steps, b.minutes))) * countedShare)
    : estimatedHeartPointsFromDailySteps(netSteps);

  // A watch measures the whole day, workouts included, so only its surplus is new information.
  const deviceOutside = Math.max(0, Math.round(input.deviceKcal) - exerciseKcal);
  const preferDevice = deviceOutside > stepKcal;

  return {
    steps,
    countedSteps: netSteps,
    stepSource: best?.source ?? "MANUAL",
    exerciseMin,
    exerciseCount: exercises.length,
    exerciseKcal,
    stepKcal: preferDevice ? 0 : stepKcal,
    deviceKcal: preferDevice ? deviceOutside : 0,
    activeKcal: exerciseKcal + (preferDevice ? deviceOutside : stepKcal),
    heartPoints: exercisePoints + stepPoints,
  };
}
