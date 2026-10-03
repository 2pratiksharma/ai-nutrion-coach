"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { MEAL_TYPES, type MealSuggestion, type Suggestions } from "@nutrition/shared";
import { Panel } from "@/components/common/layout";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { formatNumber } from "@/lib/format";

export function SuggestionsCard({ data, date }: { data: Suggestions; date?: string }) {
  const router = useRouter();
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const meal = MEAL_TYPES[data.mealType].toLowerCase();

  if (data.suggestions.length === 0) return null;

  async function add(s: MealSuggestion) {
    setAdding(s.title);
    try {
      await api.meals.addMany({
        type: data.mealType,
        date,
        items: s.items.map((i) => ({ foodId: i.food.id, quantityG: i.quantityG })),
      });
      setAdded((prev) => new Set(prev).add(s.title));
      toast.success(`Added to ${meal}`);
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setAdding(null);
    }
  }

  return (
    <Panel className="p-4">
      <div className="mb-3">
        <h2 className="text-sm font-semibold">Ideas for {meal}</h2>
        <p className="text-xs text-muted-foreground">
          {formatNumber(data.remaining.calories)} kcal and {data.remaining.proteinG} g protein left today
        </p>
      </div>
      <ul className="space-y-2.5">
        {data.suggestions.map((s) => {
          const done = added.has(s.title);
          return (
            <li key={s.title} className="flex items-center gap-3 rounded-xl bg-muted/60 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {s.items.map((i) => `${i.food.name} · ${i.quantityG} g`).join(" + ")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(s.calories)} kcal · {Math.round(s.proteinG)} g protein
                </p>
              </div>
              <Button
                size="icon-lg"
                variant={done ? "secondary" : "default"}
                className="size-10 shrink-0 rounded-full"
                aria-label={done ? `Added ${s.title}` : `Add ${s.title} to ${meal}`}
                disabled={adding !== null || done}
                onClick={() => void add(s)}
              >
                {done ? <Check /> : <Plus />}
              </Button>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
