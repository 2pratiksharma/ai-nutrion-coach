import type { MealMention } from "../provider.js";

const NUMBER_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  single: 1,
  half: 0.5,
  quarter: 0.25,
  two: 2,
  couple: 2,
  three: 3,
  few: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

const UNIT_ALIASES: Record<string, string> = {
  g: "g",
  gm: "g",
  gms: "g",
  gram: "g",
  grams: "g",
  kg: "kg",
  kgs: "kg",
  ml: "ml",
  l: "l",
  litre: "l",
  liter: "l",
  litres: "l",
  liters: "l",
  katori: "katori",
  katoris: "katori",
  bowl: "bowl",
  bowls: "bowl",
  cup: "cup",
  cups: "cup",
  glass: "glass",
  glasses: "glass",
  plate: "plate",
  plates: "plate",
  serving: "serving",
  servings: "serving",
  scoop: "scoop",
  scoops: "scoop",
  handful: "handful",
  handfuls: "handful",
  slice: "slice",
  slices: "slice",
  tbsp: "tbsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  tsp: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  piece: "piece",
  pieces: "piece",
  pc: "piece",
  pcs: "piece",
  nos: "piece",
};

const FILLER = new Set([
  "i",
  "had",
  "have",
  "ate",
  "eaten",
  "eat",
  "drank",
  "some",
  "of",
  "for",
  "my",
  "today",
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "just",
  "about",
  "around",
  "approx",
  "roughly",
  "the",
  "also",
  "then",
  "small",
  "medium",
  "large",
  "big",
  "full",
]);

const SEPARATORS = /\s*(?:,|;|\+|&|\n|\band\b|\bwith\b|\bplus\b|\balong with\b)\s*/i;

function parseAmount(token: string): number | null {
  if (token in NUMBER_WORDS) return NUMBER_WORDS[token];
  const fraction = token.match(/^(\d+)\/(\d+)$/);
  if (fraction) return Number(fraction[1]) / Number(fraction[2]);
  const numeric = token.match(/^\d+(?:\.\d+)?$/);
  return numeric ? Number(token) : null;
}

/** Splits "200g" or "2x" style tokens into amount and unit parts. */
function splitAttached(token: string): string[] {
  const m = token.match(/^(\d+(?:\.\d+)?)(g|gm|gms|kg|ml|l|x)$/);
  if (!m) return [token];
  return m[2] === "x" ? [m[1]] : [m[1], m[2]];
}

export function extractMentions(text: string): MealMention[] {
  const mentions: MealMention[] = [];

  for (const rawPart of text.toLowerCase().split(SEPARATORS)) {
    const part = rawPart.replace(/[.!?()"]/g, " ").trim();
    if (!part) continue;

    const tokens = part.split(/\s+/).flatMap(splitAttached);
    let amount: number | null = null;
    let unit: string | null = null;
    const words: string[] = [];

    for (const token of tokens) {
      const value: number | null = amount === null && words.length === 0 ? parseAmount(token) : null;
      if (value !== null) {
        amount = value;
        continue;
      }
      if (unit === null && token in UNIT_ALIASES && words.length === 0) {
        unit = UNIT_ALIASES[token];
        continue;
      }
      if (FILLER.has(token) && words.length === 0) continue;
      words.push(token);
    }

    // "rice 200g" / "dal 1 bowl": quantity written after the food.
    const trailingUnit = words.length >= 2 ? UNIT_ALIASES[words.at(-1)!] : undefined;
    if (trailingUnit && words.length >= 3 && amount === null) {
      const value: number | null = parseAmount(words.at(-2)!);
      if (value !== null) {
        amount = value;
        unit = trailingUnit;
        words.splice(-2, 2);
      }
    }
    if (amount === null && words.length >= 2) {
      const value: number | null = parseAmount(words.at(-1)!);
      if (value !== null) {
        amount = value;
        words.pop();
      }
    }

    const foodQuery = words.filter((w) => !FILLER.has(w)).join(" ").trim();
    if (foodQuery.length < 2) continue;

    mentions.push({ text: rawPart.trim(), foodQuery, amount: amount ?? 1, unit });
  }

  return mentions;
}

const UNIT_GRAMS: Record<string, number> = {
  katori: 150,
  bowl: 150,
  cup: 200,
  glass: 250,
  plate: 200,
  scoop: 30,
  handful: 30,
  slice: 30,
  tbsp: 15,
  tsp: 5,
};

/** Converts a mention's amount to grams for a given food. */
export function mentionToGrams(mention: Pick<MealMention, "amount" | "unit">, food: { servingLabel: string; servingGrams: number }): number {
  const { amount, unit } = mention;
  const grams = (() => {
    switch (unit) {
      case "g":
      case "ml":
        return amount;
      case "kg":
      case "l":
        return amount * 1000;
      case null:
      case "piece":
      case "serving":
        return amount * food.servingGrams;
      default:
        // "1 katori" of a food whose serving is a katori -> use the food's own serving size.
        return food.servingLabel.toLowerCase().includes(unit)
          ? amount * food.servingGrams
          : amount * (UNIT_GRAMS[unit] ?? food.servingGrams);
    }
  })();
  return Math.min(5000, Math.max(1, Math.round(grams)));
}
