import { describe, expect, it } from "vitest";
import {
  caloriesPerMinuteFromHeartRate,
  defaultActivityGoals,
  estimatedHeartPointsFromDailySteps,
  heartPointsFromHeartRate,
  heartPointsFromMet,
  heartPointsFromStepBout,
  intensityFromHeartRate,
  intensityFromMet,
  maxHeartRate,
  suggestGoalBump,
  weekPacing,
  WEEKLY_HEART_POINTS_TARGET,
} from "./activity.js";
import { endOfWeek, startOfWeek, weekdayIndex } from "./dates.js";

describe("heart points from intensity", () => {
  it("scores moderate activity 1 point a minute and vigorous 2", () => {
    expect(heartPointsFromMet(3.5, 30)).toBe(30); // brisk-ish walk
    expect(heartPointsFromMet(8.3, 30)).toBe(60); // running
    expect(heartPointsFromMet(2.5, 30)).toBe(0); // gentle yoga
  });

  it("makes the WHO guideline add up either way", () => {
    expect(heartPointsFromMet(4, 150)).toBe(WEEKLY_HEART_POINTS_TARGET);
    expect(heartPointsFromMet(8, 75)).toBe(WEEKLY_HEART_POINTS_TARGET);
  });

  it("bands METs at the compendium thresholds", () => {
    expect(intensityFromMet(2.9)).toBe("light");
    expect(intensityFromMet(3)).toBe("moderate");
    expect(intensityFromMet(5.9)).toBe("moderate");
    expect(intensityFromMet(6)).toBe("vigorous");
  });
});

describe("heart points from heart rate", () => {
  const age = 30;

  it("uses heart-rate reserve, not raw bpm", () => {
    // max 187, resting 60 -> reserve 127. 40% = 111 bpm, 60% = 136 bpm.
    expect(intensityFromHeartRate(105, age, 60)).toBe("light");
    expect(intensityFromHeartRate(115, age, 60)).toBe("moderate");
    expect(intensityFromHeartRate(140, age, 60)).toBe("vigorous");
  });

  it("scales the same bpm by the person's age", () => {
    expect(intensityFromHeartRate(140, 20, 60)).toBe("moderate");
    expect(intensityFromHeartRate(140, 60, 60)).toBe("vigorous");
  });

  it("uses Tanaka for max heart rate", () => {
    expect(maxHeartRate(30)).toBe(187);
    expect(maxHeartRate(50)).toBe(173);
  });

  it("awards points per minute at the measured intensity", () => {
    expect(heartPointsFromHeartRate(140, 20, age, 60)).toBe(40);
  });

  it("estimates calories from heart rate", () => {
    const perMin = caloriesPerMinuteFromHeartRate(150, { sex: "MALE", age: 30, weightKg: 78 });
    expect(perMin).toBeGreaterThan(10);
    expect(perMin).toBeLessThan(20);
    // A calmer heart burns less.
    expect(caloriesPerMinuteFromHeartRate(110, { sex: "MALE", age: 30, weightKg: 78 })).toBeLessThan(perMin);
  });
});

describe("heart points from steps", () => {
  it("scores a measured bout on cadence", () => {
    expect(heartPointsFromStepBout(1000, 10)).toBe(10); // 100 spm, brisk
    expect(heartPointsFromStepBout(1400, 10)).toBe(20); // 140 spm, running
    expect(heartPointsFromStepBout(800, 10)).toBe(0); // 80 spm, strolling
  });

  it("estimates conservatively when a day has no timing", () => {
    expect(estimatedHeartPointsFromDailySteps(3000)).toBe(0);
    expect(estimatedHeartPointsFromDailySteps(10_000)).toBe(21);
    // Capped, so one long day on foot can't fill the week.
    expect(estimatedHeartPointsFromDailySteps(30_000)).toBe(30);
  });
});

describe("weekly pacing", () => {
  it("compares progress against the share of the week that has passed", () => {
    // By Wednesday a steady week is ~64 points in.
    expect(weekPacing(80, 150, 2).status).toBe("ahead");
    expect(weekPacing(60, 150, 2).status).toBe("on-track");
    expect(weekPacing(20, 150, 3).status).toBe("behind");
    expect(weekPacing(150, 150, 0).status).toBe("done");
  });

  it("splits what is left over the days that remain", () => {
    const pacing = weekPacing(82, 150, 4); // Friday
    expect(pacing.remaining).toBe(68);
    expect(pacing.daysLeft).toBe(3);
    expect(pacing.perDay).toBe(23);
  });

  it("never asks for more once the target is met", () => {
    expect(weekPacing(200, 150, 6)).toMatchObject({ remaining: 0, perDay: 0 });
  });
});

describe("goals", () => {
  it("suggests a starting point per activity level", () => {
    expect(defaultActivityGoals("SEDENTARY").steps).toBeLessThan(defaultActivityGoals("ACTIVE").steps);
    expect(defaultActivityGoals("MODERATE").heartPointsWeekly).toBe(WEEKLY_HEART_POINTS_TARGET);
  });

  it("raises a goal only once it is comfortably beaten", () => {
    const beating = Array.from({ length: 14 }, () => 12_500);
    expect(suggestGoalBump(beating, 8000)).toBe(13_000);
    expect(suggestGoalBump(Array.from({ length: 14 }, () => 8200), 8000)).toBeNull();
    expect(suggestGoalBump([12_500, 12_400], 8000)).toBeNull(); // too little history
  });

  it("ignores a single exceptional day", () => {
    const usual = Array.from({ length: 13 }, () => 7800);
    expect(suggestGoalBump([...usual, 40_000], 8000)).toBeNull();
  });
});

describe("weeks", () => {
  it("starts weeks on Monday", () => {
    expect(weekdayIndex("2026-09-14")).toBe(0); // a Monday
    expect(weekdayIndex("2026-09-20")).toBe(6); // the Sunday after
    expect(startOfWeek("2026-09-18")).toBe("2026-09-14");
    expect(startOfWeek("2026-09-20")).toBe("2026-09-14");
    expect(endOfWeek("2026-09-14")).toBe("2026-09-20");
  });
});
