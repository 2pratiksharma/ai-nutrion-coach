import { z } from "zod";
import {
  ACTIVITY_LEVEL_VALUES,
  DEVICE_SOURCE_VALUES,
  DIET_PREFERENCE_VALUES,
  GOAL_VALUES,
  MEAL_TYPE_VALUES,
  REMINDER_TYPE_VALUES,
  SAMPLE_TYPE_VALUES,
  SEX_VALUES,
} from "./constants.js";
import { isIsoDate, isValidTimeZone } from "./dates.js";

export const isoDateSchema = z.string().refine(isIsoDate, "Date must be a valid YYYY-MM-DD");
const optionalDate = isoDateSchema.optional();

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email").max(254));
const password = z.string().min(8, "Password must be at least 8 characters").max(200);
const name = z.string().trim().min(1, "Name is required").max(100);

// Auth

export const signupSchema = z.object({ name, email, password });
export const loginSchema = z.object({ email, password: z.string().min(1, "Password is required").max(200) });
export const forgotPasswordSchema = z.object({ email });
export const resetPasswordSchema = z.object({ token: z.string().min(20).max(200), password });

// Account

export const updateAccountSchema = z
  .object({
    name: name.optional(),
    email: email.optional(),
    // Required to change the email so a hijacked session can't take over the account.
    currentPassword: z.string().max(200).optional(),
  })
  .refine((v) => v.name !== undefined || v.email !== undefined, "Nothing to update");
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required").max(200),
  newPassword: password,
});
export const deleteAccountSchema = z.object({ password: z.string().min(1, "Password is required").max(200) });

// Profile

const stepTarget = z.coerce.number().int().min(1000, "Aim for at least 1,000 steps").max(50_000);
const activeKcalTarget = z.coerce.number().int().min(50, "Aim for at least 50 kcal").max(5000);
const heartPointsTarget = z.coerce.number().int().min(20, "Aim for at least 20 points a week").max(1000);
const workoutDaysTarget = z.coerce.number().int().min(0).max(7, "A week only has 7 days");

export const profileSchema = z.object({
  sex: z.enum(SEX_VALUES),
  age: z.coerce.number().int().min(13, "Must be at least 13").max(100),
  heightCm: z.coerce.number().min(100, "Height must be 100-250 cm").max(250, "Height must be 100-250 cm"),
  startWeightKg: z.coerce.number().min(30, "Weight must be 30-300 kg").max(300, "Weight must be 30-300 kg"),
  targetWeightKg: z.coerce.number().min(30).max(300).nullish(),
  activityLevel: z.enum(ACTIVITY_LEVEL_VALUES),
  dietPreference: z.enum(DIET_PREFERENCE_VALUES),
  goalType: z.enum(GOAL_VALUES),
  stepTarget: stepTarget.optional(),
  waterTargetMl: z.coerce.number().int().min(500).max(8000).optional(),
  activeKcalTarget: activeKcalTarget.optional(),
  heartPointsTarget: heartPointsTarget.optional(),
  workoutDaysTarget: workoutDaysTarget.optional(),
  timezone: z.string().refine(isValidTimeZone, "Unknown timezone").optional(),
});
export type ProfileInput = z.infer<typeof profileSchema>;

/** Movement goals, edited on their own screen after onboarding. */
export const activityGoalsSchema = z
  .object({
    stepTarget,
    activeKcalTarget,
    heartPointsTarget,
    workoutDaysTarget,
    waterTargetMl: z.coerce.number().int().min(500).max(8000),
  })
  .partial()
  .refine((v) => Object.values(v).some((n) => n !== undefined), "Nothing to update");
export type ActivityGoalsInput = z.infer<typeof activityGoalsSchema>;

// Foods

export const foodSearchSchema = z.object({
  q: z.string().trim().max(100).optional(),
  scope: z.enum(["all", "mine", "favorites", "recent"]).default("all"),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const customFoodSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80),
  category: z.string().trim().min(1).max(40).default("My foods"),
  dietType: z.enum(DIET_PREFERENCE_VALUES).default("VEG"),
  servingLabel: z.string().trim().min(1, "Serving label is required").max(40),
  servingGrams: z.coerce.number().positive().max(2000),
  caloriesPer100g: z.coerce.number().min(0).max(1000),
  proteinPer100g: z.coerce.number().min(0).max(100),
  carbsPer100g: z.coerce.number().min(0).max(100),
  fatPer100g: z.coerce.number().min(0).max(100),
  fiberPer100g: z.coerce.number().min(0).max(100).default(0),
});

// Meals

const quantityG = z.coerce.number().min(1, "Quantity must be at least 1 g").max(5000);

export const addMealItemSchema = z.object({
  foodId: z.string().min(1),
  quantityG,
  type: z.enum(MEAL_TYPE_VALUES),
  date: optionalDate,
});
export const addMealItemsSchema = z.object({
  type: z.enum(MEAL_TYPE_VALUES),
  date: optionalDate,
  items: z.array(z.object({ foodId: z.string().min(1), quantityG })).min(1).max(20),
});
export const updateMealItemSchema = z.object({ quantityG });
export const copyMealsSchema = z.object({
  fromDate: isoDateSchema,
  toDate: isoDateSchema,
  type: z.enum(MEAL_TYPE_VALUES).optional(),
});

// Activity and body logs

export const exerciseSchema = z.object({
  activityId: z.string().min(1),
  durationMin: z.coerce.number().int().min(1, "Duration must be at least 1 minute").max(600),
  date: optionalDate,
  notes: z.string().trim().max(280).optional(),
});
export const weightSchema = z.object({
  date: optionalDate,
  weightKg: z.coerce.number().min(30, "Weight must be 30-300 kg").max(300, "Weight must be 30-300 kg"),
  notes: z.string().trim().max(280).optional(),
});
export const stepsSchema = z.object({
  date: optionalDate,
  steps: z.coerce.number().int().min(0).max(100_000, "That's more than 100,000 steps"),
});
export const waterSchema = z.object({
  date: optionalDate,
  amountMl: z.coerce.number().int().min(0).max(10_000),
});
export const waterAddSchema = z.object({
  date: optionalDate,
  deltaMl: z.coerce.number().int().min(-2000).max(2000).refine((n) => n !== 0, "Amount can't be zero"),
});

export const dateQuerySchema = z.object({ date: optionalDate });
export const historyQuerySchema = z.object({ limit: z.coerce.number().int().min(1).max(365).default(30) });
export const trendsQuerySchema = z.object({ days: z.coerce.number().int().min(7).max(180).default(30) });

// Reminders

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:mm");
export const reminderSettingsSchema = z.object({
  reminders: z
    .array(z.object({ type: z.enum(REMINDER_TYPE_VALUES), enabled: z.boolean(), time }))
    .max(REMINDER_TYPE_VALUES.length),
});
// The server POSTs to this URL, so only accept the browsers' push services (prevents SSRF).
const PUSH_SERVICE_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /^([a-z0-9-]+\.)*push\.apple\.com$/,
  /^([a-z0-9-]+\.)*notify\.windows\.com$/,
];
const pushEndpoint = z
  .url({ protocol: /^https$/ })
  .max(1000)
  .refine((value) => PUSH_SERVICE_HOSTS.some((host) => host.test(new URL(value).hostname)), "Unsupported push service");

export const pushSubscriptionSchema = z.object({
  endpoint: pushEndpoint,
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});
export const pushUnsubscribeSchema = z.object({ endpoint: z.string().max(1000) });

// AI

export const parseMealSchema = z.object({ text: z.string().trim().min(2, "Describe what you ate").max(500) });
export const suggestionsQuerySchema = z.object({ date: optionalDate, meal: z.enum(MEAL_TYPE_VALUES).optional() });

// Health samples

const instant = z.iso.datetime({ offset: true });

export const healthSampleSchema = z
  .object({
    type: z.enum(SAMPLE_TYPE_VALUES),
    // Manual entries go through their own endpoints, so a device can't impersonate one.
    source: z.enum(DEVICE_SOURCE_VALUES),
    startAt: instant,
    endAt: instant,
    value: z.coerce.number().min(0).max(1_000_000),
    /** The provider's own id for the record; repeats are ignored so re-syncing is safe. */
    externalId: z.string().trim().min(1).max(200).optional(),
    deviceName: z.string().trim().max(80).optional(),
  })
  .refine((s) => Date.parse(s.endAt) >= Date.parse(s.startAt), "A sample can't end before it starts");

export const healthSamplesSchema = z.object({
  samples: z.array(healthSampleSchema).min(1, "Nothing to sync").max(500),
});
export type HealthSampleInput = z.infer<typeof healthSampleSchema>;
