import type { DailySummary } from "@nutrition/shared";
import { Panel } from "@/components/common/layout";
import { ProgressRing } from "@/components/common/progress-ring";
import { formatNumber } from "@/lib/format";

function MacroBar({ label, value, target, unit = "g" }: { label: string; value: number; target?: number; unit?: string }) {
  const pct = target ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">
          {formatNumber(value)}
          {target ? <span className="text-muted-foreground"> / {target}</span> : null} {unit}
        </span>
      </div>
      {target ? (
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      ) : null}
    </div>
  );
}

export function CalorieCard({ summary }: { summary: DailySummary }) {
  const { consumed, targets } = summary;
  const remaining = targets.calories - consumed.calories;
  const over = remaining < 0;

  return (
    <Panel className="p-4">
      <div className="flex items-center gap-4">
        <ProgressRing value={consumed.calories} max={targets.calories} label="Calories eaten against goal">
          <div>
            <p className="text-3xl leading-none font-semibold tracking-tight">{formatNumber(Math.abs(remaining))}</p>
            <p className="mt-1 text-xs text-muted-foreground">{over ? "kcal over" : "kcal left"}</p>
          </div>
        </ProgressRing>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Eaten</p>
            <p className="text-lg font-semibold">
              {formatNumber(consumed.calories)} <span className="text-sm font-normal text-muted-foreground">/ {formatNumber(targets.calories)} kcal</span>
            </p>
          </div>
          <MacroBar label="Protein" value={Math.round(consumed.proteinG)} target={targets.proteinG} />
          <div className="grid grid-cols-2 gap-3">
            <MacroBar label="Carbs" value={Math.round(consumed.carbsG)} />
            <MacroBar label="Fat" value={Math.round(consumed.fatG)} />
          </div>
        </div>
      </div>
    </Panel>
  );
}
