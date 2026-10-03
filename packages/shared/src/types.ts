import type {
  ActivityLevel,
  DietPreference,
  GoalType,
  HealthSource,
  MealType,
  ReminderType,
  Sex,
} from "./constants.js";
import type { PaceStatus } from "./activity.js";
import type { GoalProjection } from "./nutrition.js";

/** Response shapes of the v1 API. Dates are YYYY-MM-DD strings. */

export interface ApiErrorBody {
  error: string;
  field?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Session {
  user: User;
  hasProfile: boolean;
}

export interface AuthResponse extends Session {
  token: string;
}

export interface Profile {
  sex: Sex;
  age: number;
  heightCm: number;
  startWeightKg: number;
  targetWeightKg: number | null;
  activityLevel: ActivityLevel;
  dietPreference: DietPreference;
  goalType: GoalType;
  stepTarget: number;
  waterTargetMl: number;
  activeKcalTarget: number;
  heartPointsTarget: number;
  workoutDaysTarget: number;
  timezone: string;
}

export interface Targets {
  bmr: number;
  tdee: number;
  calories: number;
  proteinG: number;
  steps: number;
  waterMl: number;
  /** Calories from movement, on top of what the body burns at rest. */
  activeKcal: number;
  /** Heart points for the whole week, not the day. */
  heartPointsWeekly: number;
  workoutDaysWeekly: number;
}

export interface ProfileResponse {
  profile: Profile;
  currentWeightKg: number;
  targets: Targets;
  today: string;
}

export interface Food {
  id: string;
  name: string;
  category: string;
  dietType: DietPreference;
  servingLabel: string;
  servingGrams: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number;
  isCustom: boolean;
  isFavorite: boolean;
}

export interface MealItem {
  id: string;
  quantityG: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  food: Pick<Food, "id" | "name" | "servingLabel" | "servingGrams">;
}

export interface Meal {
  id: string;
  type: MealType;
  items: MealItem[];
}

export interface DayMeals {
  date: string;
  meals: Meal[];
}

export interface Activity {
  id: string;
  name: string;
  category: string;
  met: number;
  /** Set for activities done on foot, so their steps aren't also counted separately. */
  stepsPerMinute: number | null;
}

export interface ExerciseLog {
  id: string;
  date: string;
  durationMin: number;
  caloriesBurned: number;
  heartPoints: number;
  notes: string | null;
  activity: Pick<Activity, "id" | "name" | "category">;
}

export interface DayExercises {
  date: string;
  exercises: ExerciseLog[];
}

export interface WeightLog {
  id: string;
  date: string;
  weightKg: number;
  notes: string | null;
}

export interface StepLog {
  id: string;
  date: string;
  steps: number;
}

export interface WaterDay {
  date: string;
  amountMl: number;
  targetMl: number;
}

/** One day of movement, after every source has been reconciled. */
export interface DayActivity {
  date: string;
  steps: number;
  /** Steps that earned step calories; the rest were already part of a logged workout. */
  countedSteps: number;
  /** Where the step count came from, so the UI can say "from your watch". */
  stepSource: HealthSource;
  activeKcal: number;
  heartPoints: number;
  exerciseMinutes: number;
  exerciseCount: number;
  /** Calories making up activeKcal, for the "eaten vs burned" breakdown. */
  breakdown: { exercise: number; steps: number; device: number };
}

export interface WeekActivity {
  from: string;
  to: string;
  heartPoints: number;
  activeKcal: number;
  steps: number;
  workoutDays: number;
  days: { date: string; heartPoints: number; steps: number; activeKcal: number }[];
  pacing: { target: number; remaining: number; daysLeft: number; perDay: number; status: PaceStatus };
}

export interface DailySummary {
  date: string;
  weightKg: number;
  targets: Targets;
  consumed: { calories: number; proteinG: number; carbsG: number; fatG: number };
  activity: DayActivity;
  burned: { baseline: number; exercise: number; steps: number; device: number; total: number };
  energyBalance: number;
  waterMl: number;
  loggedWeightToday: boolean;
  week: { heartPoints: number; workoutDays: number; pacing: WeekActivity["pacing"] };
}

export interface TrendDay {
  date: string;
  logged: boolean;
  consumed: number;
  burned: number;
  balance: number;
  proteinG: number;
  steps: number;
  exerciseMinutes: number;
  heartPoints: number;
  activeKcal: number;
  weightKg: number | null;
}

export interface Trends {
  from: string;
  to: string;
  days: TrendDay[];
  averages: {
    loggedDays: number;
    consumed: number;
    burned: number;
    balance: number;
    proteinG: number;
    steps: number;
    heartPoints: number;
    activeKcal: number;
  };
  weight: {
    start: number;
    latest: number;
    change: number;
    target: number | null;
    projection: GoalProjection;
  };
  streak: { current: number; longest: number };
}

export interface ReminderSetting {
  type: ReminderType;
  enabled: boolean;
  time: string;
}

export interface RemindersResponse {
  reminders: ReminderSetting[];
  push: { configured: boolean; publicKey: string | null; subscriptions: number };
  timezone: string;
}

export interface ParsedMealLine {
  text: string;
  quantityG: number;
  confidence: number;
  food: Food | null;
  alternatives: Food[];
}

export interface ParsedMeal {
  provider: string;
  items: ParsedMealLine[];
}

export interface MealSuggestion {
  title: string;
  reason: string;
  items: { food: Food; quantityG: number }[];
  calories: number;
  proteinG: number;
}

export interface Suggestions {
  provider: string;
  remaining: { calories: number; proteinG: number };
  mealType: MealType;
  suggestions: MealSuggestion[];
}

export interface CoachTip {
  tone: "positive" | "tip" | "warning";
  title: string;
  body: string;
}

export interface CoachResponse {
  provider: string;
  date: string;
  headline: string;
  tips: CoachTip[];
}
