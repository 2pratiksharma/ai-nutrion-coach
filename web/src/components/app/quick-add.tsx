"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Droplets, Dumbbell, Footprints, Scale, Sparkles, UtensilsCrossed } from "lucide-react";
import { api } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { BottomSheet } from "@/components/common/bottom-sheet";
import { NumberEntrySheet } from "@/components/common/number-entry-sheet";

type Sheet = "menu" | "weight" | "steps" | null;

interface QuickAddContext {
  open: () => void;
  openWeight: (opts?: { date?: string; current?: number }) => void;
  openSteps: (opts?: { date?: string; current?: number }) => void;
}

const Ctx = createContext<QuickAddContext | null>(null);

export function useQuickAdd() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useQuickAdd must be used inside QuickAddProvider");
  return ctx;
}

export function QuickAddProvider({ children, lastWeightKg }: { children: ReactNode; lastWeightKg?: number }) {
  const router = useRouter();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [target, setTarget] = useState<{ date?: string; current?: number }>({});

  const openWeight = useCallback((opts: { date?: string; current?: number } = {}) => {
    setTarget(opts);
    setSheet("weight");
  }, []);
  const openSteps = useCallback((opts: { date?: string; current?: number } = {}) => {
    setTarget(opts);
    setSheet("steps");
  }, []);
  const value = useMemo(() => ({ open: () => setSheet("menu"), openWeight, openSteps }), [openWeight, openSteps]);

  function go(href: string) {
    setSheet(null);
    router.push(href);
  }

  async function addWater() {
    setSheet(null);
    try {
      const day = await api.body.addWater(250);
      toast.success(`+250 ml water · ${day.amountMl} ml today`);
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  const actions = [
    { label: "Log food", hint: "Search foods or pick a recent one", icon: UtensilsCrossed, onClick: () => go("/log/food") },
    { label: "Describe a meal", hint: "\"2 roti, dal and curd\"", icon: Sparkles, onClick: () => go("/log/describe") },
    { label: "Log workout", hint: "What you did and for how long", icon: Dumbbell, onClick: () => go("/log/workout") },
    { label: "Weigh in", hint: "Keeps your goals accurate", icon: Scale, onClick: () => openWeight() },
    { label: "Steps", hint: "From your phone or watch", icon: Footprints, onClick: () => openSteps() },
    { label: "Glass of water", hint: "Adds 250 ml", icon: Droplets, onClick: addWater },
  ];

  return (
    <Ctx.Provider value={value}>
      {children}

      <BottomSheet open={sheet === "menu"} onOpenChange={(o) => !o && setSheet(null)} title="Add to today">
        <div className="grid grid-cols-2 gap-3">
          {actions.map(({ label, hint, icon: Icon, onClick }) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              className="flex min-h-24 flex-col items-start gap-2 rounded-2xl border bg-card p-3.5 text-left transition-colors active:bg-muted"
            >
              <span className="grid size-9 place-items-center rounded-full bg-secondary text-secondary-foreground">
                <Icon className="size-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold">{label}</span>
                <span className="block text-xs text-muted-foreground">{hint}</span>
              </span>
            </button>
          ))}
        </div>
      </BottomSheet>

      <NumberEntrySheet
        open={sheet === "weight"}
        onOpenChange={(o) => !o && setSheet(null)}
        title="Weigh in"
        description={target.date ? undefined : "Best done in the morning, before breakfast."}
        unit="kg"
        decimals={1}
        step={0.1}
        min={30}
        max={300}
        initialValue={target.current ?? lastWeightKg}
        submitLabel="Save weight"
        onSubmit={async (weightKg) => {
          try {
            await api.body.saveWeight({ weightKg, date: target.date });
            toast.success(`Weight saved: ${weightKg} kg`);
            router.refresh();
          } catch (err) {
            toast.error(errorMessage(err));
            throw err;
          }
        }}
      />

      <NumberEntrySheet
        open={sheet === "steps"}
        onOpenChange={(o) => !o && setSheet(null)}
        title="Steps"
        description="Enter the total for the day from your phone or watch."
        unit="steps"
        step={500}
        min={0}
        max={100000}
        quickSteps={[5000, 8000, 10000, 12000]}
        initialValue={target.current}
        submitLabel="Save steps"
        onSubmit={async (steps) => {
          try {
            await api.body.saveSteps({ steps, date: target.date });
            toast.success(`${steps.toLocaleString("en-IN")} steps saved`);
            router.refresh();
          } catch (err) {
            toast.error(errorMessage(err));
            throw err;
          }
        }}
      />
    </Ctx.Provider>
  );
}
