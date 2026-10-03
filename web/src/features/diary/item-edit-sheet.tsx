"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { MealItem } from "@nutrition/shared";
import { BottomSheet } from "@/components/common/bottom-sheet";
import { Field } from "@/components/common/field";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { formatNumber } from "@/lib/format";

interface Props {
  item: MealItem | null;
  onClose: () => void;
}

export function ItemEditSheet({ item: selected, onClose }: Props) {
  const router = useRouter();
  const [grams, setGrams] = useState("");
  const [busy, setBusy] = useState<"save" | "delete" | "fav" | null>(null);
  // Keep showing the last item while the sheet animates closed.
  const [item, setItem] = useState<MealItem | null>(selected);

  const [previous, setPrevious] = useState(selected);
  if (selected !== previous) {
    setPrevious(selected);
    if (selected) {
      setItem(selected);
      setGrams(String(selected.quantityG));
    }
  }

  if (!item) return null;

  const qty = Number(grams);
  const valid = Number.isFinite(qty) && qty >= 1 && qty <= 5000;
  const ratio = valid ? qty / item.quantityG : 1;
  const servings = item.food.servingGrams > 0 ? qty / item.food.servingGrams : 0;

  async function run(kind: "save" | "delete" | "fav", action: () => Promise<unknown>, message: string) {
    setBusy(kind);
    try {
      await action();
      toast.success(message);
      router.refresh();
      if (kind !== "fav") onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <BottomSheet open={selected !== null} onOpenChange={(o) => !o && onClose()} title={item.food.name} description={`Serving: ${item.food.servingLabel} (${item.food.servingGrams} g)`}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) void run("save", () => api.meals.update(item.id, qty), "Updated");
        }}
      >
        <Field
          label="Amount"
          name="grams"
          inputMode="decimal"
          suffix="g"
          value={grams}
          onChange={(e) => setGrams(e.target.value.replace(/[^\d.]/g, ""))}
          error={grams !== "" && !valid ? "Enter between 1 and 5000 g" : undefined}
          hint={valid ? `≈ ${formatNumber(servings, 1)} × ${item.food.servingLabel}` : undefined}
        />
        <div className="flex gap-2">
          {[0.5, 1, 1.5, 2].map((m) => (
            <Button
              key={m}
              type="button"
              variant="secondary"
              size="sm"
              className="flex-1 rounded-full"
              onClick={() => setGrams(String(Math.round(item.food.servingGrams * m)))}
            >
              {m}×
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-2 rounded-xl bg-muted/60 p-3 text-center">
          {[
            ["kcal", Math.round(item.calories * ratio)],
            ["protein", `${formatNumber(item.proteinG * ratio, 1)}g`],
            ["carbs", `${formatNumber(item.carbsG * ratio, 1)}g`],
            ["fat", `${formatNumber(item.fatG * ratio, 1)}g`],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-base font-semibold">{value}</p>
              <p className="text-[11px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
        <Button type="submit" size="lg" className="h-12 w-full rounded-xl" disabled={!valid || busy !== null}>
          {busy === "save" ? "Saving..." : "Save"}
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl"
            disabled={busy !== null}
            onClick={() => void run("fav", () => api.foods.favorite(item.food.id, true), "Added to favourites")}
          >
            <Heart /> Favourite
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="h-11 rounded-xl"
            disabled={busy !== null}
            onClick={() => void run("delete", () => api.meals.remove(item.id), `Removed ${item.food.name}`)}
          >
            <Trash2 /> Remove
          </Button>
        </div>
      </form>
    </BottomSheet>
  );
}
