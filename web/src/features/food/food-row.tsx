"use client";

import { Heart } from "lucide-react";
import { macrosForQuantity, type Food } from "@nutrition/shared";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export function FoodRow({
  food,
  onSelect,
  onToggleFavorite,
}: {
  food: Food;
  onSelect: (food: Food) => void;
  onToggleFavorite: (food: Food) => void;
}) {
  const serving = macrosForQuantity(food, food.servingGrams);
  return (
    <li className="flex items-center">
      <button type="button" onClick={() => onSelect(food)} className="flex min-h-15 min-w-0 flex-1 flex-col items-start px-4 py-2.5 text-left active:bg-muted">
        <span className="flex w-full items-center gap-1.5">
          <span className="truncate text-[15px] font-medium">{food.name}</span>
          {food.isCustom && <span className="shrink-0 rounded-full bg-secondary px-1.5 text-[10px] font-semibold text-secondary-foreground">MINE</span>}
        </span>
        <span className="text-xs text-muted-foreground">
          {food.servingLabel} · {formatNumber(serving.calories)} kcal · {formatNumber(serving.proteinG, 1)} g protein
        </span>
      </button>
      <button
        type="button"
        aria-label={food.isFavorite ? `Remove ${food.name} from favourites` : `Add ${food.name} to favourites`}
        aria-pressed={food.isFavorite}
        onClick={() => onToggleFavorite(food)}
        className="grid size-12 shrink-0 place-items-center text-muted-foreground active:bg-muted"
      >
        <Heart className={cn("size-5", food.isFavorite && "fill-current text-destructive")} />
      </button>
    </li>
  );
}
