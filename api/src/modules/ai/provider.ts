import type {
  CoachTip,
  DailySummary,
  DietPreference,
  Food,
  GoalType,
  MealType,
  Trends,
} from "@nutrition/shared";

/** One food mention extracted from free text, before it is matched to the catalog. */
export interface MealMention {
  text: string;
  foodQuery: string;
  amount: number;
  unit: string | null;
}

export interface SuggestionInput {
  mealType: MealType;
  dietPreference: DietPreference;
  remainingCalories: number;
  remainingProteinG: number;
  calorieTarget: number;
  /** Foods the user may eat, already filtered by diet; providers must only suggest from these. */
  candidates: Food[];
  familiarFoodIds: ReadonlySet<string>;
  seed: string;
}

export interface SuggestedMeal {
  title: string;
  reason: string;
  items: { foodId: string; quantityG: number }[];
}

export interface CoachInput {
  name: string;
  goalType: GoalType;
  summary: DailySummary;
  trends: Trends;
  localMinutes: number;
}

/**
 * Contract for AI backends. Providers only propose; the service layer resolves foods and
 * nutrition from the database so a model can never invent nutrition facts.
 */
export interface AiProvider {
  readonly name: string;
  extractMealMentions(text: string): Promise<MealMention[]>;
  suggestMeals(input: SuggestionInput): Promise<SuggestedMeal[]>;
  coach(input: CoachInput): Promise<{ headline: string; tips: CoachTip[] }>;
}
