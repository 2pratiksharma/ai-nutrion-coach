"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { customFoodSchema, DIET_PREFERENCES, type DietPreference, type Food } from "@nutrition/shared";
import { Segmented } from "@/components/common/choice-list";
import { Field, FormError } from "@/components/common/field";
import { Panel, Section } from "@/components/common/layout";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { useSubmit } from "@/lib/forms";

const NUTRIENTS = [
  { key: "calories", label: "Calories", unit: "kcal" },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "carbs", label: "Carbs", unit: "g" },
  { key: "fat", label: "Fat", unit: "g" },
  { key: "fiber", label: "Fiber", unit: "g" },
] as const;
type Nutrient = (typeof NUTRIENTS)[number]["key"];

const round = (n: number) => Math.round(n * 10) / 10;

export function CustomFoodForm({ food }: { food?: Food }) {
  const router = useRouter();
  const [name, setName] = useState(food?.name ?? "");
  const [servingLabel, setServingLabel] = useState(food?.servingLabel ?? "1 serving");
  const [servingGrams, setServingGrams] = useState(food ? String(food.servingGrams) : "");
  const [dietType, setDietType] = useState<DietPreference>(food?.dietType ?? "VEG");
  const [basis, setBasis] = useState<"100g" | "serving">("100g");
  const [values, setValues] = useState<Record<Nutrient, string>>({
    calories: food ? String(food.caloriesPer100g) : "",
    protein: food ? String(food.proteinPer100g) : "",
    carbs: food ? String(food.carbsPer100g) : "",
    fat: food ? String(food.fatPer100g) : "",
    fiber: food ? String(food.fiberPer100g) : "",
  });
  const [deleting, setDeleting] = useState(false);
  const { errors, formError, pending, submit } = useSubmit(customFoodSchema);

  const grams = Number(servingGrams);
  const per100 = (key: Nutrient) => {
    const v = Number(values[key] || 0);
    return basis === "100g" ? v : grams > 0 ? round((v / grams) * 100) : Number.NaN;
  };

  function switchBasis(next: "100g" | "serving") {
    if (next === basis || !(grams > 0)) return setBasis(next);
    const factor = next === "serving" ? grams / 100 : 100 / grams;
    setValues((vs) => Object.fromEntries(Object.entries(vs).map(([k, v]) => [k, v === "" ? "" : String(round(Number(v) * factor))])) as Record<Nutrient, string>);
    setBasis(next);
  }

  async function remove() {
    if (!food) return;
    setDeleting(true);
    try {
      await api.foods.remove(food.id);
      toast.success(`${food.name} removed`);
      router.replace("/me/foods");
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
      setDeleting(false);
    }
  }

  const fieldError = (key: Nutrient) => errors[`${key}Per100g`];

  return (
    <form
      noValidate
      className="space-y-5 px-4 pt-2 pb-8"
      onSubmit={(e) => {
        e.preventDefault();
        const body = {
          name,
          servingLabel,
          servingGrams,
          dietType,
          caloriesPer100g: per100("calories"),
          proteinPer100g: per100("protein"),
          carbsPer100g: per100("carbs"),
          fatPer100g: per100("fat"),
          fiberPer100g: per100("fiber"),
        };
        void submit(body, async (data) => {
          if (food) await api.foods.update(food.id, data);
          else await api.foods.create(data);
          toast.success(food ? "Food updated" : `${data.name} added to your foods`);
          router.back();
          router.refresh();
        });
      }}
    >
      <FormError message={formError} />
      <Section title="Food">
        <Panel className="space-y-4 p-4">
          <Field label="Name" name="name" placeholder="e.g. Mom's besan chilla" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Serving name" name="servingLabel" placeholder="1 chilla" value={servingLabel} onChange={(e) => setServingLabel(e.target.value)} error={errors.servingLabel} />
            <Field label="Serving weight" name="servingGrams" inputMode="decimal" suffix="g" value={servingGrams} onChange={(e) => setServingGrams(e.target.value)} error={errors.servingGrams} />
          </div>
          <Segmented
            label="Diet type"
            value={dietType}
            onChange={setDietType}
            options={(["VEG", "EGGETARIAN", "NON_VEG", "VEGAN"] as const).map((v) => ({
              value: v,
              label: DIET_PREFERENCES[v].replace("Non-vegetarian", "Non-veg").replace("Vegetarian", "Veg").replace("Eggetarian", "Egg"),
            }))}
          />
        </Panel>
      </Section>

      <Section title="Nutrition">
        <Panel className="space-y-4 p-4">
          <Segmented
            label="Values are per"
            value={basis}
            onChange={switchBasis}
            options={[
              { value: "100g", label: "Per 100 g" },
              { value: "serving", label: "Per serving" },
            ]}
          />
          {basis === "serving" && !(grams > 0) && <p className="text-sm text-destructive">Enter the serving weight first.</p>}
          <div className="grid grid-cols-2 gap-3">
            {NUTRIENTS.map((n) => (
              <Field
                key={n.key}
                label={n.label}
                name={n.key}
                inputMode="decimal"
                suffix={n.unit}
                value={values[n.key]}
                onChange={(e) => setValues((vs) => ({ ...vs, [n.key]: e.target.value }))}
                error={fieldError(n.key)}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Check the nutrition label, or use values from a trusted recipe calculator.</p>
        </Panel>
      </Section>

      <Button type="submit" size="lg" className="h-12 w-full rounded-xl text-base" disabled={pending}>
        {pending ? "Saving..." : food ? "Save changes" : "Add food"}
      </Button>
      {food && (
        <Button type="button" variant="destructive" className="h-11 w-full rounded-xl" disabled={deleting} onClick={() => void remove()}>
          <Trash2 /> {deleting ? "Removing..." : "Remove food"}
        </Button>
      )}
    </form>
  );
}
