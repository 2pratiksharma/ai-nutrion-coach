import { describe, expect, it } from "vitest";
import { addDays, todayInTimeZone, type Food } from "@nutrition/shared";
import { computeStreak } from "../src/modules/insights/insights.service.js";
import { onboardedUser, signup } from "./helpers.js";

const DATE = "2026-01-10";
const customFood = {
  name: "Mom's besan chilla",
  servingLabel: "1 chilla",
  servingGrams: 80,
  caloriesPer100g: 200,
  proteinPer100g: 10,
  carbsPer100g: 22,
  fatPer100g: 8,
};

describe("profile", () => {
  it("requires onboarding before day-scoped features", async () => {
    const { agent } = await signup("no-profile");
    await agent.get("/api/v1/profile").expect(404);
    await agent.get("/api/v1/summary").expect(409);
  });

  it("derives targets from the latest weight, not the onboarding weight", async () => {
    const { agent, profile } = await onboardedUser("targets", { goalType: "LOSE_FAT" });
    // Movement goals start from the activity level picked at onboarding (MODERATE).
    expect(profile.targets).toMatchObject({
      calories: 2195,
      proteinG: 156,
      steps: 10_000,
      waterMl: 2500,
      activeKcal: 450,
      heartPointsWeekly: 150,
      workoutDaysWeekly: 4,
    });
    expect(profile.currentWeightKg).toBe(78);

    await agent.put("/api/v1/weights").send({ weightKg: 70 }).expect(200);
    const after = (await agent.get("/api/v1/profile")).body;
    expect(after.currentWeightKg).toBe(70);
    expect(after.targets).toMatchObject({ calories: 2071, proteinG: 140 });
    expect(after.profile.startWeightKg).toBe(78);
  });

  it("updates goals and settings without touching logged weights", async () => {
    const { agent } = await onboardedUser("edit-profile");
    const res = await agent.put("/api/v1/profile").send({
      sex: "MALE",
      age: 29,
      heightCm: 176,
      startWeightKg: 80,
      targetWeightKg: null,
      activityLevel: "ACTIVE",
      dietPreference: "EGGETARIAN",
      goalType: "GAIN_MUSCLE",
      stepTarget: 10000,
      waterTargetMl: 3000,
    });
    expect(res.status).toBe(200);
    expect(res.body.profile).toMatchObject({ age: 29, targetWeightKg: null, stepTarget: 10000, waterTargetMl: 3000 });
    const weights = (await agent.get("/api/v1/weights")).body;
    expect(weights).toHaveLength(1);
    expect(weights[0].weightKg).toBe(78);
  });
});

describe("foods", () => {
  it("searches with prefix matches ranked first", async () => {
    const { agent } = await onboardedUser("search");
    const res = await agent.get("/api/v1/foods?q=pan");
    expect(res.body.map((f: Food) => f.name).slice(0, 2)).toEqual(["Paneer (raw)", "Paneer butter masala"]);
  });

  it("keeps custom foods private to their creator", async () => {
    const owner = await onboardedUser("food-owner");
    const other = await onboardedUser("food-other");
    const created = await owner.agent.post("/api/v1/foods").send(customFood);
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ isCustom: true, category: "My foods" });

    expect((await owner.agent.get("/api/v1/foods?q=chilla")).body).toHaveLength(1);
    expect((await other.agent.get("/api/v1/foods?q=chilla")).body).toHaveLength(0);
    await other.agent.get(`/api/v1/foods/${created.body.id}`).expect(404);
    await other.agent.post("/api/v1/meals/items").send({ foodId: created.body.id, quantityG: 80, type: "LUNCH" }).expect(404);
    await other.agent.delete(`/api/v1/foods/${created.body.id}`).expect(404);
  });

  it("archives a used custom food instead of deleting it", async () => {
    const { agent } = await onboardedUser("archive");
    const food = (await agent.post("/api/v1/foods").send(customFood)).body;
    const unused = (await agent.post("/api/v1/foods").send({ ...customFood, name: "Unused food" })).body;
    await agent.post("/api/v1/meals/items").send({ foodId: food.id, quantityG: 80, type: "BREAKFAST", date: DATE });

    await agent.delete(`/api/v1/foods/${food.id}`).expect(204);
    await agent.delete(`/api/v1/foods/${unused.id}`).expect(204);
    expect((await agent.get("/api/v1/foods?scope=mine")).body).toHaveLength(0);

    const day = (await agent.get(`/api/v1/meals?date=${DATE}`)).body;
    expect(day.meals[0].items[0].food.name).toBe(customFood.name);
  });

  it("tracks favorites and recent foods", async () => {
    const { agent } = await onboardedUser("fav");
    const [idli] = (await agent.get("/api/v1/foods?q=idli")).body;
    await agent.put(`/api/v1/foods/${idli.id}/favorite`).expect(204);
    await agent.put(`/api/v1/foods/${idli.id}/favorite`).expect(204);

    const favorites = (await agent.get("/api/v1/foods?scope=favorites")).body;
    expect(favorites).toHaveLength(1);
    expect(favorites[0].isFavorite).toBe(true);

    await agent.post("/api/v1/meals/items").send({ foodId: "Banana", quantityG: 120, type: "SNACK" });
    await agent.post("/api/v1/meals/items").send({ foodId: "Idli", quantityG: 80, type: "BREAKFAST" });
    await agent.post("/api/v1/meals/items").send({ foodId: "Banana", quantityG: 120, type: "SNACK" });
    const recent = (await agent.get("/api/v1/foods?scope=recent")).body;
    expect(recent.map((f: Food) => f.id)).toEqual(["Banana", "Idli"]);

    await agent.delete(`/api/v1/foods/${idli.id}/favorite`).expect(204);
    expect((await agent.get("/api/v1/foods?scope=favorites")).body).toHaveLength(0);
  });
});

describe("meals", () => {
  it("adds, edits and removes items, cleaning up empty meals", async () => {
    const { agent } = await onboardedUser("meals");
    const item = (await agent.post("/api/v1/meals/items").send({ foodId: "Paneer (raw)", quantityG: 150, type: "LUNCH", date: DATE })).body;
    expect(item).toMatchObject({ calories: 398, proteinG: 27, food: { name: "Paneer (raw)" } });

    const edited = await agent.patch(`/api/v1/meals/items/${item.id}`).send({ quantityG: 75 });
    expect(edited.body).toMatchObject({ quantityG: 75, calories: 199, proteinG: 13.5 });

    await agent.delete(`/api/v1/meals/items/${item.id}`).expect(204);
    expect((await agent.get(`/api/v1/meals?date=${DATE}`)).body.meals).toHaveLength(0);
  });

  it("adds several items at once and orders meals by time of day", async () => {
    const { agent } = await onboardedUser("bulk");
    await agent.post("/api/v1/meals/items").send({ foodId: "Banana", quantityG: 120, type: "SNACK", date: DATE });
    const bulk = await agent.post("/api/v1/meals/items/bulk").send({
      type: "BREAKFAST",
      date: DATE,
      items: [
        { foodId: "Idli", quantityG: 80 },
        { foodId: "Sambar", quantityG: 150 },
      ],
    });
    expect(bulk.status).toBe(201);
    expect(bulk.body).toHaveLength(2);

    const day = (await agent.get(`/api/v1/meals?date=${DATE}`)).body;
    expect(day.meals.map((m: { type: string }) => m.type)).toEqual(["BREAKFAST", "SNACK"]);
    expect(day.meals[0].items).toHaveLength(2);
  });

  it("rolls back a bulk add if any food is invalid", async () => {
    const { agent } = await onboardedUser("bulk-bad");
    await agent
      .post("/api/v1/meals/items/bulk")
      .send({ type: "LUNCH", date: DATE, items: [{ foodId: "Idli", quantityG: 80 }, { foodId: "nope", quantityG: 10 }] })
      .expect(404);
    expect((await agent.get(`/api/v1/meals?date=${DATE}`)).body.meals).toHaveLength(0);
  });

  it("copies a day's meals", async () => {
    const { agent } = await onboardedUser("copy");
    await agent.post("/api/v1/meals/items").send({ foodId: "Idli", quantityG: 80, type: "BREAKFAST", date: DATE });
    await agent.post("/api/v1/meals/items").send({ foodId: "Dal tadka", quantityG: 150, type: "LUNCH", date: DATE });

    const next = addDays(DATE, 1);
    const onlyLunch = await agent.post("/api/v1/meals/copy").send({ fromDate: DATE, toDate: next, type: "LUNCH" });
    expect(onlyLunch.status).toBe(201);
    expect(onlyLunch.body.copied).toBe(1);

    const all = await agent.post("/api/v1/meals/copy").send({ fromDate: DATE, toDate: addDays(DATE, 2) });
    expect(all.body.day.meals).toHaveLength(2);

    await agent.post("/api/v1/meals/copy").send({ fromDate: "2025-01-01", toDate: DATE }).expect(404);
    await agent.post("/api/v1/meals/copy").send({ fromDate: DATE, toDate: DATE }).expect(400);
  });

  it("does not let users touch each other's entries", async () => {
    const owner = await onboardedUser("owner");
    const other = await onboardedUser("intruder");
    const item = (await owner.agent.post("/api/v1/meals/items").send({ foodId: "Idli", quantityG: 40, type: "BREAKFAST" })).body;
    const ex = (await owner.agent.post("/api/v1/exercises").send({ activityId: "yoga-hatha", durationMin: 20 })).body;
    const weights = (await owner.agent.get("/api/v1/weights")).body;

    await other.agent.patch(`/api/v1/meals/items/${item.id}`).send({ quantityG: 1 }).expect(404);
    await other.agent.delete(`/api/v1/meals/items/${item.id}`).expect(404);
    await other.agent.delete(`/api/v1/exercises/${ex.id}`).expect(404);
    await other.agent.delete(`/api/v1/weights/${weights[0].id}`).expect(404);
  });
});

describe("body logs and water", () => {
  it("adds water atomically and never goes below zero", async () => {
    const { agent } = await onboardedUser("water");
    await Promise.all([250, 250, 500].map((deltaMl) => agent.post("/api/v1/water/add").send({ deltaMl, date: DATE })));
    expect((await agent.get(`/api/v1/water?date=${DATE}`)).body).toMatchObject({ amountMl: 1000, targetMl: 2500 });

    const down = await agent.post("/api/v1/water/add").send({ deltaMl: -2000, date: DATE });
    expect(down.body.amountMl).toBe(0);
    await agent.post("/api/v1/water/add").send({ deltaMl: 0 }).expect(400);
  });

  it("logs workouts with the weight as of that day", async () => {
    const { agent } = await onboardedUser("workout");
    await agent.put("/api/v1/weights").send({ date: "2026-01-01", weightKg: 90 }).expect(200);
    const run = await agent.post("/api/v1/exercises").send({ activityId: "walking-moderate", durationMin: 60, date: DATE });
    expect(run.body).toMatchObject({ caloriesBurned: 315, date: DATE });
    await agent.post("/api/v1/exercises").send({ activityId: "nope", durationMin: 10 }).expect(404);
  });
});

describe("insights", () => {
  it("summarises consumed vs burned for a day", async () => {
    const { agent } = await onboardedUser("summary");
    await agent.post("/api/v1/meals/items").send({ foodId: "Paneer (raw)", quantityG: 150, type: "LUNCH", date: DATE });
    await agent.post("/api/v1/exercises").send({ activityId: "running-10", durationMin: 30, date: DATE });
    await agent.put("/api/v1/steps").send({ date: DATE, steps: 10_000 });
    await agent.post("/api/v1/water/add").send({ date: DATE, deltaMl: 750 });

    const summary = (await agent.get(`/api/v1/summary?date=${DATE}`)).body;
    expect(summary).toMatchObject({
      date: DATE,
      weightKg: 78,
      consumed: { calories: 398, proteinG: 27 },
      // 30 min of running at ~170 steps/min accounts for 5,100 of the 10,000 steps, so only the
      // remaining 4,900 earn step calories on top of the workout.
      activity: { steps: 10_000, exerciseMinutes: 30, exerciseCount: 1, stepSource: "MANUAL", heartPoints: 60 + 3 },
      burned: { baseline: 2087, exercise: 382, steps: 139, device: 0, total: 2608 },
      energyBalance: 398 - 2608,
      waterMl: 750,
      loggedWeightToday: false,
    });
    await agent.get("/api/v1/summary?date=2026-02-30").expect(400);
  });

  it("builds trends with averages over logged days and a streak", async () => {
    const { agent } = await onboardedUser("trends");
    const today = todayInTimeZone("Asia/Kolkata");
    for (const offset of [0, 1, 2, 5]) {
      await agent
        .post("/api/v1/meals/items")
        .send({ foodId: "Dal tadka", quantityG: 150 * (offset + 1), type: "LUNCH", date: addDays(today, -offset) });
    }
    await agent.put("/api/v1/weights").send({ date: addDays(today, -10), weightKg: 80 });

    const trends = (await agent.get("/api/v1/trends?days=14")).body;
    expect(trends.days).toHaveLength(14);
    expect(trends.to).toBe(today);
    expect(trends.averages.loggedDays).toBe(4);
    expect(trends.averages.consumed).toBe(Math.round((174 + 348 + 522 + 1044) / 4));
    expect(trends.streak).toEqual({ current: 3, longest: 3 });
    expect(trends.weight).toMatchObject({ start: 78, latest: 78, target: 72 });
    expect(trends.days.find((d: { date: string }) => d.date === addDays(today, -10)).weightKg).toBe(80);
  });
});

describe("computeStreak", () => {
  const today = "2026-09-16";
  it("doesn't break the streak before today is logged", () => {
    const dates = new Set(["2026-09-15", "2026-09-14", "2026-09-10"]);
    expect(computeStreak(dates, today, 30)).toEqual({ current: 2, longest: 2 });
  });

  it("counts today and finds the longest run", () => {
    const dates = new Set(["2026-09-16", "2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04"]);
    expect(computeStreak(dates, today, 30)).toEqual({ current: 1, longest: 4 });
    expect(computeStreak(new Set(), today, 30)).toEqual({ current: 0, longest: 0 });
  });
});
