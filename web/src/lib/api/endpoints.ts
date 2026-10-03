import type {
  Activity,
  ActivityGoalsInput,
  AuthResponse,
  CoachResponse,
  DailySummary,
  DayActivity,
  DayExercises,
  DayMeals,
  ExerciseLog,
  Food,
  HealthSampleInput,
  MealItem,
  MealType,
  ParsedMeal,
  ProfileInput,
  ProfileResponse,
  ReminderSetting,
  RemindersResponse,
  Session,
  StepLog,
  Suggestions,
  Trends,
  User,
  WaterDay,
  WeekActivity,
  WeightLog,
} from "@nutrition/shared";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type Requester = <T>(method: HttpMethod, path: string, body?: unknown) => Promise<T>;

export type FoodScope = "all" | "mine" | "favorites" | "recent";

export interface CustomFoodInput {
  name: string;
  servingLabel: string;
  servingGrams: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g?: number;
  dietType?: Food["dietType"];
}

function qs(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}

/**
 * Every API call the app makes, in one typed place. The same map runs on the server
 * (forwarding the session cookie) and in the browser (through the /api rewrite).
 */
export function createEndpoints(request: Requester) {
  const get = <T>(path: string) => request<T>("GET", path);
  return {
    auth: {
      session: () => get<Session>("/auth/session"),
      login: (body: { email: string; password: string }) => request<AuthResponse>("POST", "/auth/login", body),
      signup: (body: { name: string; email: string; password: string }) =>
        request<AuthResponse>("POST", "/auth/signup", body),
      logout: () => request<void>("POST", "/auth/logout"),
      forgotPassword: (email: string) => request<{ ok: true }>("POST", "/auth/forgot-password", { email }),
      resetPassword: (body: { token: string; password: string }) =>
        request<AuthResponse>("POST", "/auth/reset-password", body),
    },
    account: {
      update: (body: { name?: string; email?: string; currentPassword?: string }) =>
        request<User>("PATCH", "/account", body),
      changePassword: (body: { currentPassword: string; newPassword: string }) =>
        request<void>("POST", "/account/password", body),
      remove: (password: string) => request<void>("DELETE", "/account", { password }),
    },
    profile: {
      get: () => get<ProfileResponse>("/profile"),
      save: (body: ProfileInput) => request<ProfileResponse>("PUT", "/profile", body),
      saveGoals: (body: ActivityGoalsInput) => request<ProfileResponse>("PATCH", "/profile/goals", body),
    },
    foods: {
      search: (params: { q?: string; scope?: FoodScope; limit?: number }) => get<Food[]>(`/foods${qs(params)}`),
      get: (id: string) => get<Food>(`/foods/${encodeURIComponent(id)}`),
      create: (body: CustomFoodInput) => request<Food>("POST", "/foods", body),
      update: (id: string, body: CustomFoodInput) => request<Food>("PUT", `/foods/${encodeURIComponent(id)}`, body),
      remove: (id: string) => request<void>("DELETE", `/foods/${encodeURIComponent(id)}`),
      favorite: (id: string, on: boolean) =>
        request<void>(on ? "PUT" : "DELETE", `/foods/${encodeURIComponent(id)}/favorite`),
    },
    meals: {
      day: (date?: string) => get<DayMeals>(`/meals${qs({ date })}`),
      add: (body: { foodId: string; quantityG: number; type: MealType; date?: string }) =>
        request<MealItem>("POST", "/meals/items", body),
      addMany: (body: { type: MealType; date?: string; items: { foodId: string; quantityG: number }[] }) =>
        request<MealItem[]>("POST", "/meals/items/bulk", body),
      update: (id: string, quantityG: number) => request<MealItem>("PATCH", `/meals/items/${id}`, { quantityG }),
      remove: (id: string) => request<void>("DELETE", `/meals/items/${id}`),
      copy: (body: { fromDate: string; toDate: string; type?: MealType }) =>
        request<{ copied: number; day: DayMeals }>("POST", "/meals/copy", body),
    },
    activity: {
      catalog: () => get<Activity[]>("/activities"),
      day: (date?: string) => get<DayExercises>(`/exercises${qs({ date })}`),
      log: (body: { activityId: string; durationMin: number; date?: string; notes?: string }) =>
        request<ExerciseLog>("POST", "/exercises", body),
      remove: (id: string) => request<void>("DELETE", `/exercises/${id}`),
    },
    body: {
      weights: (limit = 30) => get<WeightLog[]>(`/weights${qs({ limit })}`),
      saveWeight: (body: { weightKg: number; date?: string; notes?: string }) =>
        request<WeightLog>("PUT", "/weights", body),
      removeWeight: (id: string) => request<void>("DELETE", `/weights/${id}`),
      steps: (limit = 30) => get<StepLog[]>(`/steps${qs({ limit })}`),
      saveSteps: (body: { steps: number; date?: string }) => request<StepLog>("PUT", "/steps", body),
      water: (date?: string) => get<WaterDay>(`/water${qs({ date })}`),
      addWater: (deltaMl: number, date?: string) => request<WaterDay>("POST", "/water/add", { deltaMl, date }),
    },
    health: {
      day: (date?: string) => get<DayActivity>(`/health/day${qs({ date })}`),
      week: (date?: string) => get<WeekActivity>(`/health/week${qs({ date })}`),
      /** Batch upload from a connected device; repeats are ignored server-side. */
      sync: (samples: HealthSampleInput[]) =>
        request<{ accepted: number; duplicates: number; days: string[] }>("POST", "/health/samples", { samples }),
    },
    insights: {
      summary: (date?: string) => get<DailySummary>(`/summary${qs({ date })}`),
      trends: (days: number) => get<Trends>(`/trends${qs({ days })}`),
    },
    reminders: {
      get: () => get<RemindersResponse>("/reminders"),
      save: (reminders: ReminderSetting[]) => request<RemindersResponse>("PUT", "/reminders", { reminders }),
      subscribe: (subscription: PushSubscriptionJSON) => request<void>("POST", "/reminders/subscriptions", subscription),
      unsubscribe: (endpoint: string) => request<void>("DELETE", "/reminders/subscriptions", { endpoint }),
      test: () => request<{ sent: number }>("POST", "/reminders/test"),
    },
    ai: {
      parseMeal: (text: string) => request<ParsedMeal>("POST", "/ai/parse-meal", { text }),
      suggestions: (params: { date?: string; meal?: MealType }) => get<Suggestions>(`/ai/suggestions${qs(params)}`),
      coach: (date?: string) => get<CoachResponse>(`/ai/coach${qs({ date })}`),
    },
  };
}

export type Endpoints = ReturnType<typeof createEndpoints>;
