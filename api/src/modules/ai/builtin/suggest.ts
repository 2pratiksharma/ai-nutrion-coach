import { macrosForQuantity, type Food, type MealType } from "@nutrition/shared";
import type { SuggestedMeal, SuggestionInput } from "../provider.js";

const MEAL_SHARE: Record<MealType, number> = { BREAKFAST: 0.25, LUNCH: 0.35, DINNER: 0.3, SNACK: 0.12 };

const EGG = /\begg/i;
const LIGHT_PROTEIN = /egg|paneer \(raw\)|curd|yogurt|milk|whey|sprout|chana|chilla/i;
const BREAKFAST_GRAIN = /poha|upma|idli|dosa|paratha|oats/i;
const MAIN_MEAL_GRAIN = /rice|naan|roti/i;
const CURRY = /curry|masala|tadka|rajma|chole|sambar|bharta|gobi|bhindi|palak/i;
// Foods eaten on their own or with fruit, not with rice or roti.
const STANDALONE = /whey|yogurt|milk|sprout|chana|almond/i;

type Role = "protein" | "base";

/** Which foods can play which role in a given meal. */
function roleFor(food: Food, meal: MealType): Role | null {
  const { category, name } = food;
  const proteinRich = food.proteinPer100g >= 10 || proteinShare(food) >= 0.25;

  if (food.isCustom) return proteinRich ? "protein" : "base";

  switch (meal) {
    case "BREAKFAST":
      if (proteinRich && LIGHT_PROTEIN.test(name)) return "protein";
      if (category === "Grains" && BREAKFAST_GRAIN.test(name)) return "base";
      if (category === "Fruits") return "base";
      return null;
    case "SNACK":
      if (proteinRich && (LIGHT_PROTEIN.test(name) || category === "Snacks")) return "protein";
      if (category === "Fruits") return "base";
      return null;
    case "LUNCH":
    case "DINNER":
      if (BREAKFAST_GRAIN.test(name) || category === "Supplements" || category === "Snacks") return null;
      if (proteinRich && (["Non-Veg", "Dals & Legumes", "Paneer & Dairy"].includes(category) || CURRY.test(name))) {
        return EGG.test(name) && !/bhurji|curry/i.test(name) ? null : "protein";
      }
      if (category === "Grains" && MAIN_MEAL_GRAIN.test(name)) return "base";
      if (category === "Vegetables") return "base";
      return null;
  }
}

function proteinShare(f: Food): number {
  return f.caloriesPer100g > 0 ? (f.proteinPer100g * 4) / f.caloriesPer100g : 0;
}

function canPair(protein: Food, base: Food): boolean {
  if (STANDALONE.test(protein.name)) return base.category === "Fruits";
  return base.category !== "Fruits";
}

const PROTEIN_SCALES = [0.75, 1, 1.5];
const roundTo5 = (g: number) => Math.max(5, Math.round(g / 5) * 5);

/** Typical number of servings of a base eaten with a meal (rotis come in pairs). */
function baseServings(base: Food): number {
  return base.servingGrams <= 60 ? 2 : 1;
}

/** Small deterministic jitter so suggestions vary by day without being random per request. */
function jitter(seed: string, key: string): number {
  let h = 2166136261;
  for (const c of `${seed}:${key}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

interface Candidate {
  parts: { food: Food; grams: number }[];
  calories: number;
  proteinG: number;
  score: number;
}

export function suggestMeals(input: SuggestionInput): SuggestedMeal[] {
  const share = MEAL_SHARE[input.mealType];
  const calorieAim = Math.max(120, Math.min(input.remainingCalories, input.calorieTarget * share));
  const calorieCap = calorieAim * 1.25;
  // Aim for this meal's share of the day's protein; a single meal can't fix the whole day.
  const proteinAim = Math.min(input.remainingProteinG, Math.max(8, (input.calorieTarget * share * 0.3) / 4));

  const proteins: Food[] = [];
  const bases: Food[] = [];
  for (const food of input.candidates) {
    const role = roleFor(food, input.mealType);
    if (role === "protein") proteins.push(food);
    else if (role === "base") bases.push(food);
  }

  const candidates: Candidate[] = [];
  for (const protein of proteins) {
    const pairings = [null, ...bases.filter((b) => b.id !== protein.id && canPair(protein, b))];
    for (const base of pairings) {
      for (const scale of PROTEIN_SCALES) {
        const parts = [{ food: protein, grams: roundTo5(protein.servingGrams * scale) }];
        if (base) parts.push({ food: base, grams: roundTo5(base.servingGrams * baseServings(base)) });

        const totals = parts.reduce(
          (acc, p) => {
            const m = macrosForQuantity(p.food, p.grams);
            return { calories: acc.calories + m.calories, proteinG: acc.proteinG + m.proteinG };
          },
          { calories: 0, proteinG: 0 },
        );
        if (totals.calories > calorieCap) continue;

        const calorieFit = 1 - Math.min(1, Math.abs(totals.calories - calorieAim) / calorieAim);
        const proteinFit = proteinAim > 0 ? Math.min(totals.proteinG / proteinAim, 1) : 0.5;
        const familiar = parts.some((p) => input.familiarFoodIds.has(p.food.id)) ? 0.2 : 0;
        const complete = base && input.mealType !== "SNACK" ? 0.25 : 0;
        const key = parts.map((p) => p.food.id).join("+");
        candidates.push({
          parts,
          calories: totals.calories,
          proteinG: Math.round(totals.proteinG * 10) / 10,
          score: proteinFit * 1.5 + calorieFit + familiar + complete + jitter(input.seed, key) * 0.35,
        });
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  const picked: Candidate[] = [];
  const used = new Set<string>();
  for (const c of candidates) {
    if (c.parts.some((p) => used.has(p.food.id))) continue;
    c.parts.forEach((p) => used.add(p.food.id));
    picked.push(c);
    if (picked.length === 3) break;
  }

  return picked.map((c) => {
    const pct = input.remainingProteinG > 0 ? Math.min(100, Math.round((c.proteinG / input.remainingProteinG) * 100)) : 0;
    const protein = Math.round(c.proteinG);
    return {
      title: c.parts.map((p) => p.food.name).join(" + "),
      reason:
        input.remainingProteinG > 0
          ? `About ${c.calories} kcal with ${protein} g protein (${pct}% of what you still need today).`
          : `About ${c.calories} kcal and ${protein} g protein. You've already hit today's protein goal.`,
      items: c.parts.map((p) => ({ foodId: p.food.id, quantityG: p.grams })),
    };
  });
}
