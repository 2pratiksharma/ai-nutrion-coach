"use client";

import { useState } from "react";
import { macrosForQuantity, MEAL_TYPES, type Food, type MealType } from "@nutrition/shared";
import { BottomSheet } from "@/components/common/bottom-sheet";
import { Field } from "@/components/common/field";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";

const MULTIPLES = [0.5, 1, 1.5, 2, 3];

interface Props {
  food: Food | null;
  meal: MealType;
  onClose: () => void;
  onAdd: (food: Food, quantityG: number) => Promise<void>;
}

export function AddFoodSheet({ food: selected, meal, onClose, onAdd }: Props) {
  const [food, setFood] = useState<Food | null>(selected);
  const [grams, setGrams] = useState("");
  const [pending, setPending] = useState(false);

  const [previous, setPrevious] = useState(selected);
  if (selected !== previous) {
    setPrevious(selected);
    if (selected) {
      setFood(selected);
      setGrams(String(selected.servingGrams));
    }
  }

  if (!food) return null;

  const qty = Number(grams);
  const valid = Number.isFinite(qty) && qty >= 1 && qty <= 5000;
  const macros = macrosForQuantity(food, valid ? qty : 0);

  return (
    <BottomSheet open={selected !== null} onOpenChange={(o) => !o && onClose()} title={food.name} description={`1 serving = ${food.servingLabel} (${food.servingGrams} g)`}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!valid) return;
          setPending(true);
          try {
            await onAdd(food, qty);
            onClose();
          } catch {
            // onAdd reports the error.
          } finally {
            setPending(false);
          }
        }}
      >
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {MULTIPLES.map((m) => {
            const g = Math.round(food.servingGrams * m);
            return (
              <Button
                key={m}
                type="button"
                variant={qty === g ? "default" : "secondary"}
                className="h-10 shrink-0 rounded-full px-4"
                onClick={() => setGrams(String(g))}
              >
                {m === 1 ? "1 serving" : `${m}×`}
              </Button>
            );
          })}
        </div>
        <Field
          label="Amount"
          name="grams"
          inputMode="decimal"
          suffix="g"
          value={grams}
          onChange={(e) => setGrams(e.target.value.replace(/[^\d.]/g, ""))}
          error={grams !== "" && !valid ? "Enter between 1 and 5000 g" : undefined}
        />
        <div className="grid grid-cols-4 gap-2 rounded-xl bg-muted/60 p-3 text-center">
          {[
            ["kcal", formatNumber(macros.calories)],
            ["protein", `${formatNumber(macros.proteinG, 1)}g`],
            ["carbs", `${formatNumber(macros.carbsG, 1)}g`],
            ["fat", `${formatNumber(macros.fatG, 1)}g`],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-base font-semibold">{value}</p>
              <p className="text-[11px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
        <Button type="submit" size="lg" className="h-12 w-full rounded-xl text-base" disabled={!valid || pending}>
          {pending ? "Adding..." : `Add to ${MEAL_TYPES[meal]}`}
        </Button>
      </form>
    </BottomSheet>
  );
}
