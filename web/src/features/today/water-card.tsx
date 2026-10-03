"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Droplets, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { WATER_QUICK_ADD_ML } from "@nutrition/shared";
import { Panel } from "@/components/common/layout";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { formatLitres } from "@/lib/format";

export function WaterCard({ amountMl, targetMl, date }: { amountMl: number; targetMl: number; date?: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [optimistic, apply] = useOptimistic(amountMl, (current, delta: number) => Math.max(0, current + delta));
  const pct = Math.min(100, (optimistic / targetMl) * 100);
  const glasses = Math.round(optimistic / 250);

  function change(delta: number) {
    startTransition(async () => {
      apply(delta);
      try {
        await api.body.addWater(delta, date);
        router.refresh();
      } catch (err) {
        toast.error(errorMessage(err));
      }
    });
  }

  return (
    <Panel className="p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-full bg-[color-mix(in_oklch,var(--series)_14%,transparent)] text-foreground">
          <Droplets className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Water</p>
          <p className="text-xs text-muted-foreground">
            {formatLitres(optimistic)} of {formatLitres(targetMl)} · {glasses} {glasses === 1 ? "glass" : "glasses"}
          </p>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted" role="meter" aria-label="Water against goal" aria-valuemin={0} aria-valuemax={targetMl} aria-valuenow={optimistic}>
        <div className="h-full rounded-full bg-series transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-3 flex gap-2">
        <Button variant="outline" className="h-11 flex-1 rounded-xl" aria-label="Remove 250 ml" disabled={optimistic === 0} onClick={() => change(-250)}>
          <Minus />
          250
        </Button>
        {WATER_QUICK_ADD_ML.map((ml) => (
          <Button key={ml} variant="secondary" className="h-11 flex-1 rounded-xl" onClick={() => change(ml)} aria-label={`Add ${ml} ml`}>
            <Plus />
            {ml} ml
          </Button>
        ))}
      </div>
    </Panel>
  );
}
