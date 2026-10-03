import {
  minutesInTimeZone,
  type CoachResponse,
  type DietPreference,
  type MealType,
  type ParsedMeal,
  type Suggestions,
} from "@nutrition/shared";
import { env } from "../../config/env.js";
import { prisma } from "../../infra/prisma.js";
import { dailySummary, trends } from "../insights/insights.service.js";
import { mapFoods, visibleFoods } from "../foods/foods.service.js";
import { profileContext } from "../profile/profile.service.js";
import { builtinProvider } from "./builtin/index.js";
import { mentionToGrams } from "./builtin/meal-text.js";
import { matchFoods } from "./food-matcher.js";
import type { AiProvider } from "./provider.js";

const providers: Record<typeof env.AI_PROVIDER, AiProvider> = {
  builtin: builtinProvider,
};

const provider = providers[env.AI_PROVIDER];

const ALLOWED_DIETS: Record<DietPreference, DietPreference[]> = {
  VEG: ["VEG", "VEGAN"],
  VEGAN: ["VEGAN"],
  EGGETARIAN: ["VEG", "VEGAN", "EGGETARIAN"],
  NON_VEG: ["VEG", "VEGAN", "EGGETARIAN", "NON_VEG"],
};

const MIN_CONFIDENCE = 0.3;

export async function parseMeal(userId: string, text: string): Promise<ParsedMeal> {
  const mentions = await provider.extractMealMentions(text);

  const items = await Promise.all(
    mentions.slice(0, 20).map(async (mention) => {
      const matches = await matchFoods(userId, mention.foodQuery);
      const rows = matches.length
        ? await prisma.food.findMany({ where: { id: { in: matches.map((m) => m.foodId) } } })
        : [];
      const foods = await mapFoods(userId, rows);
      const byId = new Map(foods.map((f) => [f.id, f]));
      const ranked = matches.map((m) => ({ food: byId.get(m.foodId)!, score: m.score })).filter((m) => m.food);

      const best = ranked[0] && ranked[0].score >= MIN_CONFIDENCE ? ranked[0] : null;
      return {
        text: mention.text,
        quantityG: best ? mentionToGrams(mention, best.food) : 100,
        confidence: best?.score ?? 0,
        food: best?.food ?? null,
        alternatives: ranked.filter((m) => m !== best).map((m) => m.food),
      };
    }),
  );

  return { provider: provider.name, items };
}

function mealForTime(minutes: number): MealType {
  if (minutes < 11 * 60) return "BREAKFAST";
  if (minutes < 16 * 60) return "LUNCH";
  if (minutes < 19 * 60) return "SNACK";
  return "DINNER";
}

async function familiarFoodIds(userId: string): Promise<Set<string>> {
  const [favorites, recent] = await Promise.all([
    prisma.favoriteFood.findMany({ where: { userId }, select: { foodId: true } }),
    prisma.mealItem.findMany({
      where: { meal: { userId } },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { foodId: true },
    }),
  ]);
  return new Set([...favorites, ...recent].map((r) => r.foodId));
}

export async function suggestions(userId: string, opts: { date?: string; meal?: MealType }): Promise<Suggestions> {
  const ctx = await profileContext(userId, opts.date);
  const date = opts.date ?? ctx.today;
  const [summary, rows, familiar] = await Promise.all([
    dailySummary(userId, date),
    prisma.food.findMany({
      where: { ...visibleFoods(userId), dietType: { in: ALLOWED_DIETS[ctx.row.dietPreference] } },
      orderBy: { name: "asc" },
      take: 500,
    }),
    familiarFoodIds(userId),
  ]);
  const candidates = await mapFoods(userId, rows);
  const mealType = opts.meal ?? mealForTime(minutesInTimeZone(ctx.row.timezone));

  const remaining = {
    calories: Math.max(0, summary.targets.calories - summary.consumed.calories),
    proteinG: Math.max(0, Math.round(summary.targets.proteinG - summary.consumed.proteinG)),
  };

  const proposed = await provider.suggestMeals({
    mealType,
    dietPreference: ctx.row.dietPreference,
    remainingCalories: remaining.calories,
    remainingProteinG: remaining.proteinG,
    calorieTarget: summary.targets.calories,
    candidates,
    familiarFoodIds: familiar,
    seed: `${userId}:${date}:${mealType}`,
  });

  const byId = new Map(candidates.map((f) => [f.id, f]));
  return {
    provider: provider.name,
    remaining,
    mealType,
    suggestions: proposed
      .map((s) => {
        // Drop anything a provider proposed outside the allowed candidate list.
        const items = s.items.filter((i) => byId.has(i.foodId)).map((i) => ({ food: byId.get(i.foodId)!, quantityG: i.quantityG }));
        const totals = items.reduce(
          (acc, i) => ({
            calories: acc.calories + (i.food.caloriesPer100g * i.quantityG) / 100,
            proteinG: acc.proteinG + (i.food.proteinPer100g * i.quantityG) / 100,
          }),
          { calories: 0, proteinG: 0 },
        );
        return {
          title: s.title,
          reason: s.reason,
          items,
          calories: Math.round(totals.calories),
          proteinG: Math.round(totals.proteinG * 10) / 10,
        };
      })
      .filter((s) => s.items.length > 0),
  };
}

export async function coachReport(userId: string, date?: string): Promise<CoachResponse> {
  const ctx = await profileContext(userId, date);
  const [summary, trend, user] = await Promise.all([
    dailySummary(userId, date),
    trends(userId, 14),
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } }),
  ]);
  const report = await provider.coach({
    name: user.name,
    goalType: ctx.row.goalType,
    summary,
    trends: trend,
    // Past days are reviewed as if the day were over.
    localMinutes: !date || date === ctx.today ? minutesInTimeZone(ctx.row.timezone) : 24 * 60 - 1,
  });
  return { provider: provider.name, date: summary.date, ...report };
}
