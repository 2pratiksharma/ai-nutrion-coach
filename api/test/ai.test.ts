import { describe, expect, it } from "vitest";
import type { Food, ParsedMeal, Suggestions } from "@nutrition/shared";
import { extractMentions, mentionToGrams } from "../src/modules/ai/builtin/meal-text.js";
import { normalizeFoodQuery } from "../src/modules/ai/food-matcher.js";
import { onboardedUser } from "./helpers.js";

const DATE = "2026-01-10";

describe("extractMentions", () => {
  it("splits items and reads leading quantities and units", () => {
    expect(extractMentions("I had 2 chapati, 1 katori dal and a glass of milk")).toEqual([
      { text: "i had 2 chapati", foodQuery: "chapati", amount: 2, unit: null },
      { text: "1 katori dal", foodQuery: "dal", amount: 1, unit: "katori" },
      { text: "a glass of milk", foodQuery: "milk", amount: 1, unit: "glass" },
    ]);
  });

  it("reads trailing and attached quantities", () => {
    expect(extractMentions("rice 200g + paneer 100 gm, banana 2")).toEqual([
      { text: "rice 200g", foodQuery: "rice", amount: 200, unit: "g" },
      { text: "paneer 100 gm", foodQuery: "paneer", amount: 100, unit: "g" },
      { text: "banana 2", foodQuery: "banana", amount: 2, unit: null },
    ]);
  });

  it("handles fractions, words and filler", () => {
    expect(extractMentions("half plate poha for breakfast")).toEqual([
      { text: "half plate poha for breakfast", foodQuery: "poha", amount: 0.5, unit: "plate" },
    ]);
    expect(extractMentions("1/2 cup curd")[0]).toMatchObject({ amount: 0.5, unit: "cup", foodQuery: "curd" });
    expect(extractMentions("and, ,")).toEqual([]);
  });

  it("converts units to grams using the food's serving when it matches", () => {
    const roti = { servingLabel: "1 roti", servingGrams: 40 };
    const dal = { servingLabel: "1 katori", servingGrams: 150 };
    const milk = { servingLabel: "1 glass", servingGrams: 250 };
    expect(mentionToGrams({ amount: 2, unit: null }, roti)).toBe(80);
    expect(mentionToGrams({ amount: 1, unit: "bowl" }, dal)).toBe(150);
    expect(mentionToGrams({ amount: 0.5, unit: "glass" }, milk)).toBe(125);
    expect(mentionToGrams({ amount: 200, unit: "g" }, dal)).toBe(200);
    expect(mentionToGrams({ amount: 1, unit: "tbsp" }, dal)).toBe(15);
    expect(mentionToGrams({ amount: 100, unit: "kg" }, dal)).toBe(5000);
  });

  it("normalises Indian names and plurals", () => {
    expect(normalizeFoodQuery("Chapatis")).toBe("roti");
    expect(normalizeFoodQuery("dahi")).toBe("curd");
    expect(normalizeFoodQuery("boiled eggs")).toBe("boiled egg");
  });
});

describe("parse-meal endpoint", () => {
  it("matches mentions to catalog foods with grams", async () => {
    const { agent } = await onboardedUser("parse");
    const res = await agent.post("/api/v1/ai/parse-meal").send({ text: "2 chapatis, 1 katori daal, dahi and xyzzy" });
    expect(res.status).toBe(200);
    const body = res.body as ParsedMeal;
    expect(body.provider).toBe("builtin");

    const [roti, dal, curd, unknown] = body.items;
    expect(roti).toMatchObject({ quantityG: 80, food: { name: "Roti (whole wheat)" } });
    expect(dal.food?.name).toMatch(/dal/i);
    expect(dal.quantityG).toBe(150);
    expect(dal.alternatives.length).toBeGreaterThan(0);
    expect(curd.food?.name).toBe("Curd / dahi (plain)");
    expect(unknown).toMatchObject({ food: null, confidence: 0 });
  });

  it("prefers the user's own foods only for that user", async () => {
    const { agent } = await onboardedUser("parse-custom");
    await agent.post("/api/v1/foods").send({
      name: "Sprouted moong chilla",
      servingLabel: "1 chilla",
      servingGrams: 70,
      caloriesPer100g: 180,
      proteinPer100g: 11,
      carbsPer100g: 20,
      fatPer100g: 6,
    });
    const res = await agent.post("/api/v1/ai/parse-meal").send({ text: "2 moong chilla" });
    expect(res.body.items[0]).toMatchObject({ quantityG: 140, food: { name: "Sprouted moong chilla", isCustom: true } });
  });

  it("validates input", async () => {
    const { agent } = await onboardedUser("parse-bad");
    await agent.post("/api/v1/ai/parse-meal").send({ text: "" }).expect(400);
  });
});

describe("suggestions", () => {
  it("only suggests foods that fit the diet and the remaining budget", async () => {
    const { agent } = await onboardedUser("suggest-veg", { dietPreference: "VEG" });
    await agent.post("/api/v1/meals/items").send({ foodId: "Poha", quantityG: 200, type: "BREAKFAST", date: DATE });

    const res = await agent.get(`/api/v1/ai/suggestions?date=${DATE}&meal=LUNCH`);
    expect(res.status).toBe(200);
    const body = res.body as Suggestions;
    expect(body.mealType).toBe("LUNCH");
    expect(body.remaining).toEqual({ calories: 2695 - 260, proteinG: 125 - 5 });
    expect(body.suggestions.length).toBeGreaterThan(0);
    for (const s of body.suggestions) {
      expect(s.calories).toBeLessThanOrEqual(2695 * 0.35 * 1.2 * 1.25);
      for (const item of s.items) expect(["VEG", "VEGAN"]).toContain(item.food.dietType);
    }
    const names = body.suggestions.flatMap((s) => s.items.map((i) => i.food.name));
    expect(names.some((n) => /chicken|fish|mutton|egg/i.test(n))).toBe(false);
    expect(new Set(body.suggestions.map((s) => s.items[0].food.id)).size).toBe(body.suggestions.length);
  });

  it("offers non-veg options to non-veg users and avoids curries at breakfast", async () => {
    const { agent } = await onboardedUser("suggest-nonveg", { dietPreference: "NON_VEG" });
    const dinner = (await agent.get(`/api/v1/ai/suggestions?date=${DATE}&meal=DINNER`)).body as Suggestions;
    const dinnerFoods: Food[] = dinner.suggestions.flatMap((s) => s.items.map((i) => i.food));
    expect(dinnerFoods.some((f) => f.dietType === "NON_VEG")).toBe(true);

    const breakfast = (await agent.get(`/api/v1/ai/suggestions?date=${DATE}&meal=BREAKFAST`)).body as Suggestions;
    const breakfastNames = breakfast.suggestions.flatMap((s) => s.items.map((i) => i.food.name));
    expect(breakfastNames.some((n) => /curry|masala|rajma|chole/i.test(n))).toBe(false);
  });
});

describe("coach", () => {
  it("returns a headline and prioritised tips", async () => {
    const { agent } = await onboardedUser("coach");
    await agent.post("/api/v1/meals/items").send({ foodId: "Samosa", quantityG: 1200, type: "SNACK", date: DATE });
    const res = await agent.get(`/api/v1/ai/coach?date=${DATE}`);
    expect(res.status).toBe(200);
    expect(res.body.headline).toContain("Test");
    const titles = res.body.tips.map((t: { title: string }) => t.title);
    expect(titles).toContain("Over your calorie goal");
    expect(res.body.tips[0].tone).toBe("warning");
    expect(res.body.tips.length).toBeLessThanOrEqual(4);
  });
});

describe("matching quality", () => {
  it("does not match look-alike words", async () => {
    const { agent } = await onboardedUser("lookalike");
    const res = (await agent.post("/api/v1/ai/parse-meal").send({ text: "1 cup chai, coconut chutney, paneer tikka 150g" })).body as ParsedMeal;
    expect(res.items[0].food).toBeNull();
    expect(res.items[1].food).toBeNull();
    expect(res.items[2]).toMatchObject({ quantityG: 150 });
    expect(res.items[2].food?.name).toMatch(/paneer/i);
  });
});

describe("suggestion sanity", () => {
  it("keeps portions realistic and pairings sensible", async () => {
    const { agent } = await onboardedUser("sane", { dietPreference: "NON_VEG", goalType: "LOSE_FAT" });
    for (const meal of ["BREAKFAST", "LUNCH", "SNACK", "DINNER"] as const) {
      const body = (await agent.get(`/api/v1/ai/suggestions?date=${DATE}&meal=${meal}`)).body as Suggestions;
      expect(body.suggestions.length).toBeGreaterThan(0);
      for (const s of body.suggestions) {
        expect(s.calories).toBeLessThanOrEqual(Math.ceil(2195 * { BREAKFAST: 0.25, LUNCH: 0.35, DINNER: 0.3, SNACK: 0.12 }[meal] * 1.25));
        for (const { food, quantityG } of s.items) expect(quantityG).toBeLessThanOrEqual(food.servingGrams * 2);
        const names = s.items.map((i) => i.food.name).join(" ");
        if (meal === "BREAKFAST") expect(names).not.toMatch(/rice|naan|chicken|fish|mutton|curry/i);
        if (meal === "LUNCH" || meal === "DINNER") expect(names).not.toMatch(/whey|poha|idli|dosa/i);
        expect(names).not.toMatch(/whey.*rice|yogurt.*(rice|roti|naan)/i);
      }
    }
  });
});
