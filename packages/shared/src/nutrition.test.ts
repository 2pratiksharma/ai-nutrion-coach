import { describe, expect, it } from "vitest";
import {
  baselineDailyBurn,
  calculateBMR,
  calculateTargets,
  caloriesForActivity,
  caloriesFromSteps,
  macrosForQuantity,
  projectGoal,
} from "./nutrition.js";

const male = { sex: "MALE" as const, age: 28, heightCm: 175, weightKg: 78 };

describe("targets", () => {
  it("computes Mifflin-St Jeor BMR", () => {
    expect(calculateBMR(male)).toBeCloseTo(1738.75);
    expect(calculateBMR({ ...male, sex: "FEMALE" })).toBeCloseTo(1572.75);
  });

  it("derives calorie and protein targets from goal", () => {
    expect(calculateTargets({ ...male, activityLevel: "MODERATE", goalType: "MAINTAIN" })).toEqual({
      bmr: 1739,
      tdee: 2695,
      calories: 2695,
      proteinG: 125,
    });
    expect(calculateTargets({ ...male, activityLevel: "MODERATE", goalType: "LOSE_FAT" }).calories).toBe(2195);
  });

  it("follows the current weight", () => {
    const lighter = calculateTargets({ ...male, weightKg: 70, activityLevel: "MODERATE", goalType: "LOSE_FAT" });
    expect(lighter.proteinG).toBe(140);
    expect(lighter.calories).toBe(2071);
  });

  it("never targets below the minimum safe intake", () => {
    const small = { sex: "FEMALE" as const, age: 60, heightCm: 145, weightKg: 40 };
    expect(calculateTargets({ ...small, activityLevel: "SEDENTARY", goalType: "LOSE_FAT" }).calories).toBe(1200);
  });
});

describe("energy", () => {
  it("scales macros by quantity", () => {
    const paneer = { caloriesPer100g: 265, proteinPer100g: 18, carbsPer100g: 3.4, fatPer100g: 20 };
    expect(macrosForQuantity(paneer, 150)).toEqual({ calories: 398, proteinG: 27, carbsG: 5.1, fatG: 30 });
  });

  it("computes exercise burn as MET x kg x hours", () => {
    expect(caloriesForActivity(9.8, 78, 30)).toBe(382);
    expect(caloriesForActivity(3.5, 78, 60)).toBe(273);
  });

  it("estimates net step burn from height and weight", () => {
    expect(caloriesFromSteps(0, 78, 175)).toBe(0);
    expect(caloriesFromSteps(10_000, 78, 175)).toBe(283);
  });

  it("uses a sedentary multiplier for the baseline", () => {
    expect(baselineDailyBurn(1739)).toBe(2087);
  });
});

describe("projectGoal", () => {
  const losing = [
    { date: "2026-08-01", weightKg: 80 },
    { date: "2026-08-08", weightKg: 79.5 },
    { date: "2026-08-15", weightKg: 79 },
    { date: "2026-08-22", weightKg: 78.5 },
  ];

  it("projects a date when trending toward the target", () => {
    expect(projectGoal(losing, 76, "2026-08-22")).toEqual({
      status: "on-track",
      weeklyRateKg: -0.5,
      daysRemaining: 35,
      projectedDate: "2026-09-26",
    });
  });

  it("reports off-track when moving away from the target", () => {
    expect(projectGoal(losing, 82, "2026-08-22")).toMatchObject({ status: "off-track", weeklyRateKg: -0.5 });
  });

  it("needs at least a week of data", () => {
    expect(projectGoal(losing.slice(0, 1), 76, "2026-08-01").status).toBe("not-enough-data");
    const shortSpan = [
      { date: "2026-08-19", weightKg: 79 },
      { date: "2026-08-22", weightKg: 78.5 },
    ];
    expect(projectGoal(shortSpan, 76, "2026-08-22").status).toBe("not-enough-data");
    expect(projectGoal(losing.slice(2), 76, "2026-08-22").status).toBe("on-track");
  });

  it("handles missing or reached targets", () => {
    expect(projectGoal(losing, null, "2026-08-22").status).toBe("no-target");
    expect(projectGoal(losing, 78.6, "2026-08-22").status).toBe("reached");
  });

  it("ignores weigh-ins older than six weeks", () => {
    const stale = [
      { date: "2026-01-01", weightKg: 95 },
      { date: "2026-08-19", weightKg: 79 },
      { date: "2026-08-22", weightKg: 78.5 },
    ];
    expect(projectGoal(stale, 76, "2026-08-22").status).toBe("not-enough-data");
  });
});
