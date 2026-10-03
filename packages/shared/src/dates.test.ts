import { describe, expect, it } from "vitest";
import { addDays, dateRange, daysBetween, isIsoDate, minutesInTimeZone, todayInTimeZone } from "./dates.js";

describe("dates", () => {
  it("returns the local calendar day, not the UTC one", () => {
    const lateUtc = new Date("2026-09-15T20:00:00Z"); // 01:30 on the 16th in India
    expect(todayInTimeZone("Asia/Kolkata", lateUtc)).toBe("2026-09-16");
    expect(todayInTimeZone("America/New_York", lateUtc)).toBe("2026-09-15");
    expect(minutesInTimeZone("Asia/Kolkata", lateUtc)).toBe(90);
  });

  it("validates real calendar dates", () => {
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("16/09/2026")).toBe(false);
  });

  it("does date arithmetic across month boundaries", () => {
    expect(addDays("2026-02-27", 2)).toBe("2026-03-01");
    expect(daysBetween("2026-09-01", "2026-09-16")).toBe(15);
    expect(dateRange("2026-09-29", "2026-10-02")).toEqual(["2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"]);
  });
});
