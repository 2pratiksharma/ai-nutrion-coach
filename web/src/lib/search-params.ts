import { isIsoDate, MEAL_TYPE_VALUES, type MealType } from "@nutrition/shared";
import { hourIn } from "./time";

type Params = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** A past or present date from the URL; undefined means "today". */
export function dateParam(params: Params, today: string): string | undefined {
  const value = first(params.date);
  return value && isIsoDate(value) && value < today ? value : undefined;
}

export function mealForHour(hour: number): MealType {
  if (hour < 11) return "BREAKFAST";
  if (hour < 16) return "LUNCH";
  if (hour < 19) return "SNACK";
  return "DINNER";
}

export function mealParam(params: Params, timeZone: string): MealType {
  const value = first(params.meal);
  return value && (MEAL_TYPE_VALUES as string[]).includes(value) ? (value as MealType) : mealForHour(hourIn(timeZone));
}
