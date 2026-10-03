import { addDays } from "@nutrition/shared";

const LOCALE = "en-IN";

/** Formats an API calendar date (YYYY-MM-DD) without shifting it across timezones. */
export function formatDay(date: string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }): string {
  return new Date(`${date.slice(0, 10)}T00:00:00Z`).toLocaleDateString(LOCALE, { timeZone: "UTC", ...options });
}

export function relativeDay(date: string, today: string): string {
  if (date === today) return "Today";
  if (date === addDays(today, -1)) return "Yesterday";
  if (date === addDays(today, 1)) return "Tomorrow";
  return formatDay(date, { weekday: "short", day: "numeric", month: "short" });
}

export const formatNumber = (n: number, maximumFractionDigits = 0) =>
  n.toLocaleString(LOCALE, { maximumFractionDigits });

export const kcal = (n: number) => `${formatNumber(Math.round(n))} kcal`;
export const grams = (n: number) => `${formatNumber(n, n < 10 ? 1 : 0)} g`;

export function formatLitres(ml: number): string {
  return ml >= 1000 ? `${formatNumber(ml / 1000, 2)} L` : `${formatNumber(ml)} ml`;
}

export function greeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Only allow same-site relative paths as post-login destinations (prevents open redirects). */
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
