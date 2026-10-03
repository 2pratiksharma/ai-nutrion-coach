import {
  ACTIVITY_LEVELS,
  DIET_PREFERENCES,
  GOALS,
  type ActivityLevel,
  type DietPreference,
  type GoalType,
} from "@nutrition/shared";
import type { Choice } from "@/components/common/choice-list";

export const goalChoices: Choice<GoalType>[] = [
  { value: "LOSE_FAT", label: GOALS.LOSE_FAT, description: "About 500 kcal below what you burn, high protein", icon: "🔥" },
  { value: "MAINTAIN", label: GOALS.MAINTAIN, description: "Eat what you burn, stay consistent", icon: "⚖️" },
  { value: "GAIN_MUSCLE", label: GOALS.GAIN_MUSCLE, description: "A small surplus with plenty of protein", icon: "💪" },
];

export const activityChoices: Choice<ActivityLevel>[] = (Object.keys(ACTIVITY_LEVELS) as ActivityLevel[]).map((value) => {
  const [label, detail] = ACTIVITY_LEVELS[value].split(" (");
  return { value, label, description: detail?.replace(/\)$/, "") };
});

export const dietChoices: Choice<DietPreference>[] = [
  { value: "VEG", label: DIET_PREFERENCES.VEG, description: "Dairy but no meat or eggs", icon: "🥗" },
  { value: "EGGETARIAN", label: DIET_PREFERENCES.EGGETARIAN, description: "Vegetarian plus eggs", icon: "🥚" },
  { value: "NON_VEG", label: DIET_PREFERENCES.NON_VEG, description: "Everything, including meat and fish", icon: "🍗" },
  { value: "VEGAN", label: DIET_PREFERENCES.VEGAN, description: "No animal products", icon: "🌱" },
];

export const sexOptions = [
  { value: "MALE" as const, label: "Male" },
  { value: "FEMALE" as const, label: "Female" },
];
