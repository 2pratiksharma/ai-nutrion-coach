"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays } from "@nutrition/shared";
import { relativeDay } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Day-by-day navigation used by the diary; future days are not reachable. */
export function DateSwitcher({ date, today, basePath }: { date: string; today: string; basePath: string }) {
  const router = useRouter();
  const prev = addDays(date, -1);
  const next = addDays(date, 1);
  const canGoForward = date < today;
  const href = (d: string) => (d === today ? basePath : `${basePath}?date=${d}`);

  const arrow = "grid size-11 place-items-center rounded-full active:bg-muted";
  return (
    <div className="flex items-center justify-between rounded-2xl border bg-card px-1 shadow-xs">
      <Link href={href(prev)} aria-label="Previous day" className={arrow} scroll={false}>
        <ChevronLeft className="size-5" />
      </Link>
      <label className="relative flex flex-col items-center px-3 py-1.5">
        <span className="text-[15px] font-semibold">{relativeDay(date, today)}</span>
        {date !== today && <span className="text-[11px] text-muted-foreground">Tap to pick a date</span>}
        <input
          type="date"
          aria-label="Pick a date"
          value={date}
          max={today}
          onChange={(e) => {
            if (e.target.value) router.push(href(e.target.value), { scroll: false });
          }}
          className="absolute inset-0 opacity-0"
        />
      </label>
      {canGoForward ? (
        <Link href={href(next)} aria-label="Next day" className={arrow} scroll={false}>
          <ChevronRight className="size-5" />
        </Link>
      ) : (
        <span className={cn(arrow, "opacity-30")} aria-hidden>
          <ChevronRight className="size-5" />
        </span>
      )}
    </div>
  );
}
