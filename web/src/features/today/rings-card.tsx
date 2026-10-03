"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Flame, Footprints, HeartPulse } from "lucide-react";
import type { DailySummary } from "@nutrition/shared";
import { useQuickAdd } from "@/components/app/quick-add";
import { Panel } from "@/components/common/layout";
import { ProgressRing } from "@/components/common/progress-ring";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

interface RingProps {
  icon: ReactNode;
  value: number;
  max: number;
  display: string;
  caption: string;
  tone: string;
  label: string;
}

function Ring({ icon, value, max, display, caption, tone, label }: RingProps) {
  return (
    <span className="flex flex-col items-center gap-1.5">
      <ProgressRing value={value} max={max} size={86} stroke={8} tone={tone} label={label}>
        <span className={cn("grid place-items-center", tone)}>{icon}</span>
      </ProgressRing>
      <span className="text-center">
        <span className="block text-[15px] leading-tight font-semibold tabular-nums">{display}</span>
        <span className="block text-[11px] text-muted-foreground">{caption}</span>
      </span>
    </span>
  );
}

const PACE_COPY = {
  done: "Weekly goal complete. Anything else is a bonus.",
  ahead: "Ahead of pace for the week. Nice work.",
  "on-track": "Right on pace for the week.",
  behind: "Behind pace, but there's still time.",
} as const;

const tile = "rounded-2xl p-2 transition-colors active:bg-muted";

/**
 * The three movement goals, the way a fitness app shows them: heart points for the week,
 * calories burned by moving today, and steps.
 */
export function RingsCard({ summary, date }: { summary: DailySummary; date?: string }) {
  const { openSteps } = useQuickAdd();
  const { activity, targets, week } = summary;
  const perDay = week.pacing.perDay;

  return (
    <Panel className="p-3">
      <div className="grid grid-cols-3 gap-1">
        <Link
          href="/progress"
          className={tile}
          aria-label={`Heart points this week: ${week.heartPoints} of ${targets.heartPointsWeekly}`}
        >
          <Ring
            icon={<HeartPulse className="size-5" />}
            value={week.heartPoints}
            max={targets.heartPointsWeekly}
            display={`${week.heartPoints} / ${targets.heartPointsWeekly}`}
            caption="heart pts · week"
            tone="text-primary"
            label="Heart points this week"
          />
        </Link>

        <Link
          href={date ? `/log/workout?date=${date}` : "/log/workout"}
          className={tile}
          aria-label={`Calories burned moving: ${activity.activeKcal} of ${targets.activeKcal}`}
        >
          <Ring
            icon={<Flame className="size-5" />}
            value={activity.activeKcal}
            max={targets.activeKcal}
            display={`${formatNumber(activity.activeKcal)} / ${formatNumber(targets.activeKcal)}`}
            caption="move kcal"
            tone="text-warning"
            label="Calories burned moving today"
          />
        </Link>

        <button
          type="button"
          className={cn(tile, "text-left")}
          onClick={() => openSteps({ date, current: activity.steps || undefined })}
        >
          <Ring
            icon={<Footprints className="size-5" />}
            value={activity.steps}
            max={targets.steps}
            display={`${formatNumber(activity.steps)}`}
            caption={`of ${formatNumber(targets.steps)} steps`}
            tone="text-chart-2"
            label="Steps today"
          />
        </button>
      </div>

      <p className="mt-1 px-1 text-center text-xs text-muted-foreground">
        {week.pacing.remaining > 0 && week.pacing.status !== "done" ? (
          <>
            <span className="font-medium text-foreground">{week.pacing.remaining} heart points to go</span> this week —
            about {perDay} a day. {PACE_COPY[week.pacing.status]}
          </>
        ) : (
          PACE_COPY[week.pacing.status]
        )}
      </p>
    </Panel>
  );
}
