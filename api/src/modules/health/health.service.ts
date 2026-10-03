import type { Profile as ProfileRow } from "@prisma/client";
import {
  addDays,
  HEALTH_SOURCE_PRIORITY,
  dateRange,
  endOfWeek,
  startOfWeek,
  todayInTimeZone,
  weekdayIndex,
  weekPacing,
  type DayActivity,
  type HealthSampleInput,
  type HealthSource,
  type WeekActivity,
} from "@nutrition/shared";
import { prisma } from "../../infra/prisma.js";
import { fromDbDate, toDbDate } from "../../lib/day.js";
import { profileContext } from "../profile/profile.service.js";
import { resolveActivity, type ResolvedActivity, type StepCandidate } from "./resolver.js";

export interface ResolvedDay extends ResolvedActivity {
  date: string;
}

/** Looks up the weight to use for a given day; the same carried-forward rule the charts use. */
export type WeightFor = (date: string) => number;

/**
 * A sample is filed under the local day it started in, so a run that crosses midnight belongs to
 * the day it began. Querying a day either side covers every timezone offset.
 */
const SAMPLE_PADDING_DAYS = 1;
const MINUTE_MS = 60_000;

function toResolved(row: {
  date: Date;
  steps: number;
  countedSteps: number;
  stepSource: HealthSource;
  exerciseMin: number;
  exerciseCount: number;
  exerciseKcal: number;
  stepKcal: number;
  deviceKcal: number;
  activeKcal: number;
  heartPoints: number;
}): ResolvedDay {
  return { ...row, date: fromDbDate(row.date) };
}

async function computeDays(
  userId: string,
  profile: ProfileRow,
  dates: string[],
  weightFor: WeightFor,
): Promise<ResolvedDay[]> {
  if (dates.length === 0) return [];
  const from = dates[0];
  const to = dates.at(-1)!;

  const [exercises, stepLogs, samples] = await Promise.all([
    prisma.exerciseLog.findMany({
      where: { userId, date: { gte: toDbDate(from), lte: toDbDate(to) } },
      select: {
        date: true,
        durationMin: true,
        caloriesBurned: true,
        heartPoints: true,
        activity: { select: { stepsPerMinute: true } },
      },
    }),
    prisma.stepLog.findMany({ where: { userId, date: { gte: toDbDate(from), lte: toDbDate(to) } } }),
    prisma.healthSample.findMany({
      where: {
        userId,
        type: { in: ["STEPS", "ACTIVE_ENERGY"] },
        startAt: {
          gte: toDbDate(addDays(from, -SAMPLE_PADDING_DAYS)),
          lt: toDbDate(addDays(to, SAMPLE_PADDING_DAYS + 1)),
        },
      },
      select: { type: true, source: true, startAt: true, endAt: true, value: true },
    }),
  ]);

  const wanted = new Set(dates);
  const byDay = new Map<string, { exercises: typeof exercises; steps: number | null; samples: typeof samples }>(
    dates.map((date) => [date, { exercises: [], steps: null, samples: [] }]),
  );
  for (const log of exercises) byDay.get(fromDbDate(log.date))?.exercises.push(log);
  for (const log of stepLogs) {
    const day = byDay.get(fromDbDate(log.date));
    if (day) day.steps = log.steps;
  }
  for (const sample of samples) {
    const date = todayInTimeZone(profile.timezone, sample.startAt);
    if (wanted.has(date)) byDay.get(date)!.samples.push(sample);
  }

  return dates.map((date) => {
    const day = byDay.get(date)!;

    const stepsBySource = new Map<HealthSource, StepCandidate>();
    const energyBySource = new Map<HealthSource, number>();
    for (const sample of day.samples) {
      if (sample.type === "STEPS") {
        const candidate = stepsBySource.get(sample.source) ?? { source: sample.source, steps: 0, bouts: [] };
        candidate.steps += sample.value;
        const minutes = (sample.endAt.getTime() - sample.startAt.getTime()) / MINUTE_MS;
        if (minutes > 0) candidate.bouts.push({ steps: sample.value, minutes });
        stepsBySource.set(sample.source, candidate);
      } else {
        energyBySource.set(sample.source, (energyBySource.get(sample.source) ?? 0) + sample.value);
      }
    }

    const stepCandidates = [...stepsBySource.values()].map((c) => ({ ...c, steps: Math.round(c.steps) }));
    if (day.steps !== null) stepCandidates.push({ source: "MANUAL", steps: day.steps, bouts: [] });

    // Active energy comes from one source too, the most trustworthy that reported any.
    const [energy] = [...energyBySource.entries()].sort(
      ([a], [b]) => HEALTH_SOURCE_PRIORITY[a] - HEALTH_SOURCE_PRIORITY[b],
    );

    const resolved = resolveActivity({
      exercises: day.exercises.map((e) => ({
        durationMin: e.durationMin,
        caloriesBurned: e.caloriesBurned,
        heartPoints: e.heartPoints,
        stepsPerMinute: e.activity.stepsPerMinute,
      })),
      stepCandidates,
      deviceKcal: energy?.[1] ?? 0,
      weightKg: weightFor(date),
      heightCm: profile.heightCm,
    });
    return { date, ...resolved };
  });
}

/**
 * Resolved movement for every day in the range, served from the `DailyActivity` cache and
 * computing (then storing) whatever is missing. The cache only ever holds derived values, so
 * dropping a row is always safe.
 */
export async function dayActivities(
  userId: string,
  profile: ProfileRow,
  from: string,
  to: string,
  weightFor: WeightFor,
): Promise<Map<string, ResolvedDay>> {
  const cached = await prisma.dailyActivity.findMany({
    where: { userId, date: { gte: toDbDate(from), lte: toDbDate(to) } },
  });
  const result = new Map(cached.map((row) => [fromDbDate(row.date), toResolved(row)]));

  const missing = dateRange(from, to).filter((date) => !result.has(date));
  const computed = await computeDays(userId, profile, missing, weightFor);
  for (const day of computed) result.set(day.date, day);

  if (computed.length > 0) {
    // Another request may have cached the same day first; that row is identical, so ignore it.
    await prisma.dailyActivity.createMany({
      data: computed.map(({ date, ...rest }) => ({ userId, date: toDbDate(date), ...rest })),
      skipDuplicates: true,
    });
  }
  return result;
}

/** Drops cached days so they are rebuilt on the next read. Everything that writes a log calls this. */
export async function invalidateActivity(userId: string, from?: string, to?: string): Promise<void> {
  await prisma.dailyActivity.deleteMany({
    where: {
      userId,
      ...(from || to ? { date: { ...(from ? { gte: toDbDate(from) } : {}), ...(to ? { lte: toDbDate(to) } : {}) } } : {}),
    },
  });
}

function toDayActivity(day: ResolvedDay): DayActivity {
  return {
    date: day.date,
    steps: day.steps,
    countedSteps: day.countedSteps,
    stepSource: day.stepSource,
    activeKcal: day.activeKcal,
    heartPoints: day.heartPoints,
    exerciseMinutes: day.exerciseMin,
    exerciseCount: day.exerciseCount,
    breakdown: { exercise: day.exerciseKcal, steps: day.stepKcal, device: day.deviceKcal },
  };
}

export async function getDayActivity(userId: string, date?: string): Promise<DayActivity> {
  const ctx = await profileContext(userId, date);
  const iso = date ?? ctx.today;
  const days = await dayActivities(userId, ctx.row, iso, iso, () => ctx.weightKg);
  return toDayActivity(days.get(iso)!);
}

export async function getWeekActivity(userId: string, date?: string): Promise<WeekActivity> {
  const ctx = await profileContext(userId, date);
  const iso = date ?? ctx.today;
  const from = startOfWeek(iso);
  const to = endOfWeek(iso);

  // Weight is carried forward from the last weigh-in on or before each day.
  const weights = await prisma.weightLog.findMany({
    where: { userId, date: { lte: toDbDate(to) } },
    orderBy: { date: "desc" },
    take: 30,
  });
  const weightFor: WeightFor = (day) =>
    weights.find((w) => fromDbDate(w.date) <= day)?.weightKg ?? ctx.row.startWeightKg;

  const resolved = await dayActivities(userId, ctx.row, from, to, weightFor);
  // Days after today have no data yet and shouldn't count against the pace.
  const elapsed = dateRange(from, iso).map((d) => resolved.get(d)!);
  const days = dateRange(from, to).map((d) => {
    const day = resolved.get(d);
    return { date: d, heartPoints: day?.heartPoints ?? 0, steps: day?.steps ?? 0, activeKcal: day?.activeKcal ?? 0 };
  });

  const heartPoints = elapsed.reduce((total, d) => total + d.heartPoints, 0);
  const pacing = weekPacing(heartPoints, ctx.row.heartPointsTarget, weekdayIndex(iso));

  return {
    from,
    to,
    heartPoints,
    activeKcal: elapsed.reduce((total, d) => total + d.activeKcal, 0),
    steps: elapsed.reduce((total, d) => total + d.steps, 0),
    workoutDays: elapsed.filter((d) => d.exerciseCount > 0).length,
    days,
    pacing: {
      target: pacing.target,
      remaining: pacing.remaining,
      daysLeft: pacing.daysLeft,
      perDay: pacing.perDay,
      status: pacing.status,
    },
  };
}

export interface IngestResult {
  accepted: number;
  duplicates: number;
  days: string[];
}

/**
 * Stores samples from a device or connector. Re-sending the same records is safe: anything
 * carrying an id we've already seen is skipped, so a sync can retry without inflating a day.
 */
export async function ingestSamples(userId: string, samples: HealthSampleInput[]): Promise<IngestResult> {
  const timezone = (await prisma.profile.findUnique({ where: { userId }, select: { timezone: true } }))?.timezone;
  const days = new Set<string>();

  const data = samples.map((sample) => {
    const startAt = new Date(sample.startAt);
    if (timezone) days.add(todayInTimeZone(timezone, startAt));
    return {
      userId,
      type: sample.type,
      source: sample.source,
      startAt,
      endAt: new Date(sample.endAt),
      value: sample.value,
      externalId: sample.externalId ?? null,
      deviceName: sample.deviceName ?? null,
    };
  });

  const { count } = await prisma.healthSample.createMany({ data, skipDuplicates: true });
  const sorted = [...days].sort();
  if (sorted.length > 0) await invalidateActivity(userId, sorted[0], sorted.at(-1));

  return { accepted: count, duplicates: samples.length - count, days: sorted };
}
