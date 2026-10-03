/** Enum values mirror the Prisma schema; labels are the user-facing copy. */

export const MEAL_TYPES = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  SNACK: "Snack",
} as const;
export type MealType = keyof typeof MEAL_TYPES;
export const MEAL_TYPE_VALUES = Object.keys(MEAL_TYPES) as [MealType, ...MealType[]];

export const SEXES = {
  MALE: "Male",
  FEMALE: "Female",
} as const;
export type Sex = keyof typeof SEXES;
export const SEX_VALUES = Object.keys(SEXES) as [Sex, ...Sex[]];

export const ACTIVITY_LEVELS = {
  SEDENTARY: "Sedentary (little to no exercise)",
  LIGHT: "Light (1-3 days/week)",
  MODERATE: "Moderate (3-5 days/week)",
  ACTIVE: "Active (6-7 days/week)",
  VERY_ACTIVE: "Very active (physical job or 2x/day)",
} as const;
export type ActivityLevel = keyof typeof ACTIVITY_LEVELS;
export const ACTIVITY_LEVEL_VALUES = Object.keys(ACTIVITY_LEVELS) as [ActivityLevel, ...ActivityLevel[]];

export const DIET_PREFERENCES = {
  VEG: "Vegetarian",
  NON_VEG: "Non-vegetarian",
  EGGETARIAN: "Eggetarian",
  VEGAN: "Vegan",
} as const;
export type DietPreference = keyof typeof DIET_PREFERENCES;
export const DIET_PREFERENCE_VALUES = Object.keys(DIET_PREFERENCES) as [DietPreference, ...DietPreference[]];

export const GOALS = {
  LOSE_FAT: "Lose fat",
  MAINTAIN: "Maintain weight",
  GAIN_MUSCLE: "Gain muscle",
} as const;
export type GoalType = keyof typeof GOALS;
export const GOAL_VALUES = Object.keys(GOALS) as [GoalType, ...GoalType[]];

export const REMINDER_TYPES = {
  BREAKFAST: { label: "Log breakfast", defaultTime: "09:00", body: "What did you have for breakfast?" },
  LUNCH: { label: "Log lunch", defaultTime: "13:30", body: "Don't forget to log your lunch." },
  DINNER: { label: "Log dinner", defaultTime: "20:30", body: "Log dinner to close out your day." },
  WEIGH_IN: { label: "Morning weigh-in", defaultTime: "07:30", body: "Step on the scale before breakfast." },
  WATER: { label: "Drink water", defaultTime: "16:00", body: "Time for a glass of water." },
  PROTEIN: { label: "Protein check", defaultTime: "18:00", body: "Check how close you are to your protein goal." },
} as const;
export type ReminderType = keyof typeof REMINDER_TYPES;
export const REMINDER_TYPE_VALUES = Object.keys(REMINDER_TYPES) as [ReminderType, ...ReminderType[]];

export const WATER_QUICK_ADD_ML = [250, 500] as const;

/**
 * Where a health measurement came from. Order matters: when two sources cover the same time,
 * the one earlier in this list wins, so a workout you logged yourself is never overruled by an
 * estimate from a phone in your pocket.
 */
export const HEALTH_SOURCES = {
  MANUAL: "Entered by you",
  APP_TIMER: "Workout timer",
  BLE_DEVICE: "Connected device",
  HEALTH_CONNECT: "Health Connect",
  APPLE_HEALTH: "Apple Health",
  GOOGLE_HEALTH: "Google Health",
  STRAVA: "Strava",
} as const;
export type HealthSource = keyof typeof HEALTH_SOURCES;
export const HEALTH_SOURCE_VALUES = Object.keys(HEALTH_SOURCES) as [HealthSource, ...HealthSource[]];
export const HEALTH_SOURCE_PRIORITY: Record<HealthSource, number> = {
  MANUAL: 0,
  APP_TIMER: 1,
  BLE_DEVICE: 2,
  HEALTH_CONNECT: 3,
  APPLE_HEALTH: 3,
  GOOGLE_HEALTH: 4,
  STRAVA: 4,
};

/** Sources a device or connector may report. MANUAL is reserved for the app's own forms. */
export const DEVICE_SOURCE_VALUES = [
  "APP_TIMER",
  "BLE_DEVICE",
  "HEALTH_CONNECT",
  "APPLE_HEALTH",
  "GOOGLE_HEALTH",
  "STRAVA",
] as const satisfies readonly HealthSource[];

export const SAMPLE_TYPES = {
  STEPS: "steps",
  ACTIVE_ENERGY: "active energy",
  HEART_RATE: "heart rate",
  DISTANCE: "distance",
} as const;
export type SampleType = keyof typeof SAMPLE_TYPES;
export const SAMPLE_TYPE_VALUES = Object.keys(SAMPLE_TYPES) as [SampleType, ...SampleType[]];

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
