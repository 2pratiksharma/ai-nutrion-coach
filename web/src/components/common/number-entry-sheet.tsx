"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "./bottom-sheet";

interface NumberEntrySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  unit: string;
  initialValue?: number;
  step: number;
  min: number;
  max: number;
  decimals?: number;
  quickSteps?: number[];
  submitLabel: string;
  onSubmit: (value: number) => Promise<void>;
}

/** Big, thumb-friendly numeric input used for weight and steps. */
export function NumberEntrySheet(props: NumberEntrySheetProps) {
  const { open, onOpenChange, title, description, unit, initialValue, step, min, max, decimals = 0 } = props;
  const [raw, setRaw] = useState(initialValue !== undefined ? String(initialValue) : "");
  const [pending, setPending] = useState(false);

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setRaw(initialValue !== undefined ? String(initialValue) : "");
  }

  const value = Number(raw);
  const valid = raw !== "" && Number.isFinite(value) && value >= min && value <= max;

  function nudge(delta: number) {
    const base = Number.isFinite(value) && raw !== "" ? value : (initialValue ?? min);
    const next = Math.min(max, Math.max(min, base + delta));
    setRaw(next.toFixed(decimals));
  }

  async function submit() {
    if (!valid) return;
    setPending(true);
    try {
      await props.onSubmit(value);
      onOpenChange(false);
    } catch {
      // The caller already told the user what went wrong; keep the sheet open to retry.
    } finally {
      setPending(false);
    }
  }

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={title} description={description}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="space-y-5"
      >
        <div className="flex items-center justify-center gap-3">
          <Button type="button" variant="outline" size="icon-lg" className="size-12 rounded-full" onClick={() => nudge(-step)} aria-label={`Decrease by ${step}`}>
            <Minus />
          </Button>
          <label className="flex items-baseline gap-1.5">
            <span className="sr-only">{title}</span>
            <input
              inputMode={decimals > 0 ? "decimal" : "numeric"}
              value={raw}
              onChange={(e) => setRaw(e.target.value.replace(/[^\d.]/g, ""))}
              className="w-36 bg-transparent text-center text-5xl font-semibold tracking-tight outline-none"
              placeholder="0"
              autoFocus
            />
            <span className="text-lg text-muted-foreground">{unit}</span>
          </label>
          <Button type="button" variant="outline" size="icon-lg" className="size-12 rounded-full" onClick={() => nudge(step)} aria-label={`Increase by ${step}`}>
            <Plus />
          </Button>
        </div>
        {props.quickSteps && (
          <div className="flex flex-wrap justify-center gap-2">
            {props.quickSteps.map((q) => (
              <Button key={q} type="button" variant="secondary" size="sm" className="rounded-full" onClick={() => setRaw(String(q))}>
                {q.toLocaleString("en-IN")}
              </Button>
            ))}
          </div>
        )}
        {raw !== "" && !valid && (
          <p className="text-center text-sm text-destructive">
            Enter a value between {min.toLocaleString("en-IN")} and {max.toLocaleString("en-IN")}.
          </p>
        )}
        <Button type="submit" size="lg" className="h-12 w-full rounded-xl text-base" disabled={!valid || pending}>
          {pending ? "Saving..." : props.submitLabel}
        </Button>
      </form>
    </BottomSheet>
  );
}
