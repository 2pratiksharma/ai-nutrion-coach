import { HEALTH_SOURCES, type DailySummary } from "@nutrition/shared";
import { Panel } from "@/components/common/layout";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/** "How much I ate vs how much I burned" for the day. */
export function EnergyCard({ summary, isToday }: { summary: DailySummary; isToday: boolean }) {
  const { consumed, burned, energyBalance, activity } = summary;
  const deficit = energyBalance < 0;
  const parts = [
    { label: "Body at rest", value: burned.baseline },
    { label: `Workouts · ${activity.exerciseMinutes} min`, value: burned.exercise },
    // Steps and the device are alternatives, never both: whichever measured the day better wins.
    burned.device > 0
      ? { label: `Device · ${HEALTH_SOURCES[activity.stepSource].toLowerCase()}`, value: burned.device }
      : {
          // Only the steps outside a logged walk or run earn calories here.
          label: `Steps · ${formatNumber(activity.countedSteps)}${activity.countedSteps < activity.steps ? " (outside workouts)" : ""}`,
          value: burned.steps,
        },
  ];

  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Eaten vs burned</h2>
          <p className="text-xs text-muted-foreground">{isToday ? "Estimated for the whole day" : "For this day"}</p>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-semibold",
            deficit ? "bg-[color-mix(in_oklch,var(--deficit)_14%,transparent)] text-foreground" : "bg-[color-mix(in_oklch,var(--surplus)_14%,transparent)] text-foreground",
          )}
        >
          <span aria-hidden className={cn("mr-1.5 inline-block size-2 rounded-full", deficit ? "bg-deficit" : "bg-surplus")} />
          {formatNumber(Math.abs(energyBalance))} kcal {deficit ? "deficit" : "surplus"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-muted/60 p-3">
          <p className="text-xs text-muted-foreground">Eaten</p>
          <p className="text-2xl font-semibold">{formatNumber(consumed.calories)}</p>
          <p className="text-xs text-muted-foreground">kcal</p>
        </div>
        <div className="rounded-xl bg-muted/60 p-3">
          <p className="text-xs text-muted-foreground">Burned</p>
          <p className="text-2xl font-semibold">{formatNumber(burned.total)}</p>
          <p className="text-xs text-muted-foreground">kcal</p>
        </div>
      </div>

      <dl className="mt-3 space-y-1.5">
        {parts.map((p) => (
          <div key={p.label} className="flex justify-between text-sm">
            <dt className="text-muted-foreground">{p.label}</dt>
            <dd className="font-medium tabular-nums">{formatNumber(p.value)} kcal</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}
