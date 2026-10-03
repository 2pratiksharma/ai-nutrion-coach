/** Hour of day (0-23) in the given IANA timezone. */
export function hourIn(timeZone: string, now = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", hourCycle: "h23" }).format(now),
  );
}
