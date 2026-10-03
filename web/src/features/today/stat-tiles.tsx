"use client";

import Link from "next/link";
import { CalendarCheck, Dumbbell, Scale } from "lucide-react";
import type { DailySummary } from "@nutrition/shared";
import { useQuickAdd } from "@/components/app/quick-add";

const tile = "flex flex-col items-start gap-1 rounded-2xl border bg-card p-3 text-left shadow-xs transition-colors active:bg-muted";

export function StatTiles({ summary, date }: { summary: DailySummary; date?: string }) {
  const { openWeight } = useQuickAdd();
  const { week, targets } = summary;

  return (
    <div className="grid grid-cols-3 gap-2.5">
      <Link href={date ? `/log/workout?date=${date}` : "/log/workout"} className={tile}>
        <Dumbbell className="size-5 text-muted-foreground" />
        <span className="text-lg leading-tight font-semibold">{summary.activity.exerciseMinutes}</span>
        <span className="text-[11px] text-muted-foreground">workout min</span>
      </Link>
      <Link href="/progress" className={tile}>
        <CalendarCheck className="size-5 text-muted-foreground" />
        <span className="text-lg leading-tight font-semibold">
          {week.workoutDays}
          <span className="text-sm font-normal text-muted-foreground">/{targets.workoutDaysWeekly}</span>
        </span>
        <span className="text-[11px] text-muted-foreground">active days · week</span>
      </Link>
      <button type="button" className={tile} onClick={() => openWeight({ date, current: summary.weightKg })}>
        <Scale className="size-5 text-muted-foreground" />
        <span className="text-lg leading-tight font-semibold">{summary.weightKg}</span>
        <span className="text-[11px] text-muted-foreground">{summary.loggedWeightToday ? "kg · logged" : "kg · weigh in"}</span>
      </button>
    </div>
  );
}
