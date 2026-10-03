"use client";

import { useRouter } from "next/navigation";
import { Flame, Target, TrendingDown, TrendingUp } from "lucide-react";
import type { Trends } from "@nutrition/shared";
import { Segmented } from "@/components/common/choice-list";
import { Panel } from "@/components/common/layout";
import { formatDay, formatNumber } from "@/lib/format";
import { BarChart, ChartFrame, LineChart, type Point } from "./charts";

const RANGES = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
];

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-2xl border bg-card p-3 shadow-xs">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-xl leading-tight font-semibold">
        {value}
        {unit && <span className="ml-0.5 text-xs font-normal text-muted-foreground">{unit}</span>}
      </p>
    </div>
  );
}

function projectionText(trends: Trends): string {
  const { projection, target } = trends.weight;
  switch (projection.status) {
    case "no-target":
      return "Set a target weight in your profile to see when you'll reach it.";
    case "reached":
      return "You've reached your target weight. Consider switching your goal to maintain.";
    case "not-enough-data":
      return "Weigh in a few times over at least a week to see your projected date.";
    case "off-track":
      return `Your weight is changing ${Math.abs(projection.weeklyRateKg)} kg/week, not toward ${target} kg yet.`;
    case "on-track":
      return `At ${Math.abs(projection.weeklyRateKg)} kg/week you'll reach ${target} kg around ${formatDay(projection.projectedDate, { day: "numeric", month: "long", year: "numeric" })}.`;
  }
}

export function ProgressView({
  trends,
  days,
  calorieTarget,
  proteinTarget,
  stepTarget,
  heartPointsWeekly,
}: {
  trends: Trends;
  days: number;
  calorieTarget: number;
  proteinTarget: number;
  stepTarget: number;
  heartPointsWeekly: number;
}) {
  const router = useRouter();
  const label = (date: string) => formatDay(date, days > 7 ? { day: "numeric", month: "short" } : { weekday: "short" });
  const kcal = (n: number) => formatNumber(n);
  const { weight, averages, streak } = trends;
  const losing = weight.change < 0;

  const weightPoints: Point[] = trends.days
    .filter((d) => d.weightKg !== null)
    .map((d) => ({ key: d.date, label: label(d.date), value: d.weightKg }));

  const balancePoints: Point[] = trends.days.map((d) => ({
    key: d.date,
    label: label(d.date),
    value: d.logged ? d.balance : null,
    details: d.logged
      ? [
          { label: "Eaten", value: `${kcal(d.consumed)}` },
          { label: "Burned", value: `${kcal(d.burned)}` },
        ]
      : [{ label: "Food", value: "not logged" }],
  }));

  const stepPoints: Point[] = trends.days.map((d) => ({ key: d.date, label: label(d.date), value: d.steps || null }));
  const heartPoints: Point[] = trends.days.map((d) => ({
    key: d.date,
    label: label(d.date),
    value: d.heartPoints || null,
    details: [
      { label: "Workouts", value: `${d.exerciseMinutes} min` },
      { label: "Move", value: `${kcal(d.activeKcal)} kcal` },
    ],
  }));
  const dailyHeartTarget = Math.round(heartPointsWeekly / 7);
  const activeDays = trends.days.filter((d) => d.exerciseMinutes > 0).length;
  const proteinPoints: Point[] = trends.days.map((d) => ({ key: d.date, label: label(d.date), value: d.logged ? Math.round(d.proteinG) : null }));

  return (
    <div className="space-y-4 px-4 pt-1 pb-6">
      <Segmented label="Time range" value={String(days)} onChange={(v) => router.replace(`/progress?days=${v}`, { scroll: false })} options={RANGES} />

      <Panel className="p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-full bg-secondary text-secondary-foreground">
            {weight.target !== null ? <Target className="size-5" /> : losing ? <TrendingDown className="size-5" /> : <TrendingUp className="size-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Since you started</p>
            <p className="text-xl font-semibold">
              {weight.change > 0 ? "+" : ""}
              {formatNumber(weight.change, 1)} kg
              <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                {weight.start} → {weight.latest} kg{weight.target !== null ? ` · goal ${weight.target}` : ""}
              </span>
            </p>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{projectionText(trends)}</p>
      </Panel>

      <div className="grid grid-cols-3 gap-2.5">
        <Stat label="Avg eaten" value={kcal(averages.consumed)} unit="kcal" />
        <Stat label="Avg burned" value={kcal(averages.burned)} unit="kcal" />
        <Stat label={averages.balance < 0 ? "Avg deficit" : "Avg surplus"} value={kcal(Math.abs(averages.balance))} unit="kcal" />
        <Stat label="Avg protein" value={String(averages.proteinG)} unit="g" />
        <Stat label="Avg steps" value={formatNumber(averages.steps)} />
        <Stat label="Avg heart pts" value={String(averages.heartPoints)} unit="/day" />
        <Stat label="Avg move" value={kcal(averages.activeKcal)} unit="kcal" />
        <Stat label="Active days" value={`${activeDays}/${days}`} />
        <Stat label="Days logged" value={`${averages.loggedDays}/${days}`} />
      </div>

      <Panel className="flex items-center gap-3 p-4">
        <Flame className="size-7 text-warning" aria-hidden />
        <div>
          <p className="text-sm font-semibold">
            {streak.current} day{streak.current === 1 ? "" : "s"} in a row
          </p>
          <p className="text-xs text-muted-foreground">
            Longest streak this year: {streak.longest} day{streak.longest === 1 ? "" : "s"}
          </p>
        </div>
      </Panel>

      <ChartFrame title="Weight" subtitle="kg, from your weigh-ins" points={weightPoints} valueLabel="kg" format={(n) => formatNumber(n, 1)}>
        {(w) => (
          <LineChart
            width={w}
            points={weightPoints}
            format={(n) => formatNumber(n, 1)}
            reference={weight.target !== null ? { value: weight.target, label: `Goal ${weight.target}` } : undefined}
          />
        )}
      </ChartFrame>

      <ChartFrame
        title="Energy balance"
        subtitle={
          <span className="flex flex-wrap gap-x-3">
            <span className="flex items-center gap-1">
              <span className="inline-block size-2 rounded-sm bg-deficit" /> deficit (burned more)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block size-2 rounded-sm bg-surplus" /> surplus (ate more)
            </span>
          </span>
        }
        points={balancePoints}
        valueLabel="kcal"
        format={kcal}
      >
        {(w) => <BarChart width={w} points={balancePoints} format={kcal} diverging />}
      </ChartFrame>

      <ChartFrame title="Protein" subtitle={`g per day · goal ${proteinTarget} g`} points={proteinPoints} valueLabel="g" format={(n) => formatNumber(n)}>
        {(w) => <BarChart width={w} points={proteinPoints} format={(n) => formatNumber(n)} reference={{ value: proteinTarget, label: `Goal ${proteinTarget}` }} />}
      </ChartFrame>

      <ChartFrame
        title="Heart points"
        subtitle={`per day · ${heartPointsWeekly} a week is about ${dailyHeartTarget} a day`}
        points={heartPoints}
        valueLabel="pts"
        format={(n) => formatNumber(n)}
      >
        {(w) => (
          <BarChart
            width={w}
            points={heartPoints}
            format={(n) => formatNumber(n)}
            reference={{ value: dailyHeartTarget, label: "Daily pace" }}
          />
        )}
      </ChartFrame>

      <ChartFrame title="Steps" subtitle={`per day · goal ${formatNumber(stepTarget)}`} points={stepPoints} valueLabel="steps" format={(n) => formatNumber(n)}>
        {(w) => (
          <BarChart
            width={w}
            points={stepPoints}
            format={(n) => (n >= 1000 ? `${formatNumber(n / 1000, 1)}k` : formatNumber(n))}
            reference={{ value: stepTarget, label: "Goal" }}
          />
        )}
      </ChartFrame>

      <p className="px-1 text-xs text-muted-foreground">
        Your calorie goal is {formatNumber(calorieTarget)} kcal a day. Burned is an estimate: resting metabolism plus
        logged workouts and steps. Heart points follow the WHO guideline — a point for each moderate minute, two for
        each vigorous one.
      </p>
    </div>
  );
}
