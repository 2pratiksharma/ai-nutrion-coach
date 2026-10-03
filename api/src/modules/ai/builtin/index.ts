import type { AiProvider } from "../provider.js";
import { coach } from "./coach.js";
import { extractMentions } from "./meal-text.js";
import { suggestMeals } from "./suggest.js";

/** Free, deterministic provider: rule-based parsing, suggestions and coaching. */
export const builtinProvider: AiProvider = {
  name: "builtin",
  extractMealMentions: async (text) => extractMentions(text),
  suggestMeals: async (input) => suggestMeals(input),
  coach: async (input) => coach(input),
};
