"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { MEAL_TYPE_VALUES, MEAL_TYPES, type Meal, type MealItem } from "@nutrition/shared";
import { Panel } from "@/components/common/layout";
import { formatNumber } from "@/lib/format";
import { ItemEditSheet } from "./item-edit-sheet";

const EMOJI = { BREAKFAST: "🌅", LUNCH: "🍛", SNACK: "🍎", DINNER: "🌙" } as const;

export function MealSections({ meals, date, isToday }: { meals: Meal[]; date: string; isToday: boolean }) {
  const [editing, setEditing] = useState<MealItem | null>(null);
  const byType = new Map(meals.map((m) => [m.type, m]));
  const dateQuery = isToday ? "" : `&date=${date}`;

  return (
    <>
      {MEAL_TYPE_VALUES.map((type) => {
        const meal = byType.get(type);
        const items = meal?.items ?? [];
        const total = items.reduce((s, i) => s + i.calories, 0);
        const protein = items.reduce((s, i) => s + i.proteinG, 0);
        return (
          <Panel key={type} id={type.toLowerCase()} className="scroll-mt-20 overflow-hidden">
            <div className="flex items-center gap-3 px-4 pt-3 pb-2">
              <span className="text-xl" aria-hidden>
                {EMOJI[type]}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-[15px] font-semibold">{MEAL_TYPES[type]}</h2>
                <p className="text-xs text-muted-foreground">
                  {items.length ? `${formatNumber(total)} kcal · ${Math.round(protein)} g protein` : "Nothing logged"}
                </p>
              </div>
              <Link
                href={`/log/food?meal=${type}${dateQuery}`}
                aria-label={`Add food to ${MEAL_TYPES[type]}`}
                className="grid size-10 place-items-center rounded-full bg-secondary text-secondary-foreground active:opacity-80"
              >
                <Plus className="size-5" />
              </Link>
            </div>
            {items.length > 0 && (
              <ul className="divide-y border-t">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setEditing(item)}
                      className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left active:bg-muted"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{item.food.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {formatNumber(item.quantityG)} g · {formatNumber(item.proteinG, 1)} g protein
                        </span>
                      </span>
                      <span className="text-sm tabular-nums">{formatNumber(item.calories)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        );
      })}
      <ItemEditSheet item={editing} onClose={() => setEditing(null)} />
    </>
  );
}
