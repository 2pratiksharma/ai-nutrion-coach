"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleAlert, Loader2, Mic, MicOff, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { macrosForQuantity, MEAL_TYPES, MEAL_TYPE_VALUES, type Food, type MealType, type ParsedMealLine } from "@nutrition/shared";
import { Segmented } from "@/components/common/choice-list";
import { Panel } from "@/components/common/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useDictation } from "./use-dictation";

const EXAMPLES = ["2 roti, 1 katori dal and curd", "3 idli with sambar", "half plate poha and a glass of milk", "chicken curry 200g with rice"];

interface Line extends ParsedMealLine {
  key: number;
  include: boolean;
  grams: string;
}

export function DescribeMeal({ initialMeal, date }: { initialMeal: MealType; date?: string }) {
  const router = useRouter();
  const [meal, setMeal] = useState(initialMeal);
  const [text, setText] = useState("");
  const [lines, setLines] = useState<Line[] | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const dictation = useDictation((spoken) => setText((t) => (t ? `${t}, ${spoken}` : spoken)));

  async function parse() {
    if (text.trim().length < 2) return;
    setParsing(true);
    try {
      const result = await api.ai.parseMeal(text);
      setLines(
        result.items.map((item, key) => ({ ...item, key, include: item.food !== null, grams: String(item.quantityG) })),
      );
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setParsing(false);
    }
  }

  const update = (key: number, patch: Partial<Line>) =>
    setLines((ls) => ls?.map((l) => (l.key === key ? { ...l, ...patch } : l)) ?? null);

  function swap(line: Line, food: Food) {
    const alternatives = [line.food, ...line.alternatives.filter((a) => a.id !== food.id)].filter(Boolean) as Food[];
    update(line.key, { food, alternatives, include: true, grams: String(food.servingGrams) });
  }

  const chosen = (lines ?? []).filter((l) => l.include && l.food && Number(l.grams) >= 1);
  const totals = chosen.reduce(
    (acc, l) => {
      const m = macrosForQuantity(l.food!, Number(l.grams));
      return { calories: acc.calories + m.calories, protein: acc.protein + m.proteinG };
    },
    { calories: 0, protein: 0 },
  );

  async function save() {
    setSaving(true);
    try {
      await api.meals.addMany({
        type: meal,
        date,
        items: chosen.map((l) => ({ foodId: l.food!.id, quantityG: Number(l.grams) })),
      });
      toast.success(`Added ${chosen.length} ${chosen.length === 1 ? "item" : "items"} to ${MEAL_TYPES[meal].toLowerCase()}`);
      router.push(date ? `/diary?date=${date}` : "/diary");
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 px-4 pt-2 pb-28">
      <Segmented label="Meal" value={meal} onChange={setMeal} options={MEAL_TYPE_VALUES.map((m) => ({ value: m, label: MEAL_TYPES[m] }))} />

      <Panel className="p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void parse();
          }}
          className="space-y-3"
        >
          <label className="sr-only" htmlFor="meal-text">
            What did you eat?
          </label>
          <Textarea
            id="meal-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. 2 roti, 1 katori dal, a bowl of curd"
            rows={3}
            maxLength={500}
            className="min-h-24 resize-none rounded-xl border-0 bg-muted/60 text-base shadow-none focus-visible:ring-2"
          />
          <div className="flex items-center gap-2">
            {dictation.supported && (
              <Button
                type="button"
                variant={dictation.listening ? "destructive" : "outline"}
                size="icon-lg"
                className="size-11 rounded-full"
                aria-label={dictation.listening ? "Stop dictation" : "Speak your meal"}
                onClick={dictation.listening ? dictation.stop : dictation.start}
              >
                {dictation.listening ? <MicOff /> : <Mic />}
              </Button>
            )}
            <Button type="submit" className="h-11 flex-1 rounded-xl" disabled={parsing || text.trim().length < 2}>
              {parsing ? <Loader2 className="animate-spin" /> : <Sparkles />}
              {parsing ? "Reading..." : "Find foods"}
            </Button>
          </div>
          {dictation.listening && <p className="text-center text-xs text-muted-foreground">Listening… say what you ate.</p>}
          {dictation.error && <p className="text-center text-xs text-destructive">{dictation.error}</p>}
        </form>
      </Panel>

      {!lines && (
        <div className="space-y-2">
          <p className="px-1 text-xs font-medium text-muted-foreground">Try one of these</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" onClick={() => setText(ex)} className="rounded-full border bg-card px-3 py-1.5 text-sm active:bg-muted">
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}

      {lines && (
        <section className="space-y-2" aria-label="Review foods">
          <p className="px-1 text-xs font-medium text-muted-foreground">Check the matches, then add them</p>
          {lines.length === 0 && (
            <Panel className="p-4 text-sm text-muted-foreground">We couldn&apos;t find any foods in that. Try naming them one by one.</Panel>
          )}
          {lines.map((line) => (
            <Panel key={line.key} className={cn("p-3 transition-opacity", !line.include && "opacity-55")}>
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={line.include}
                  disabled={!line.food}
                  onChange={(e) => update(line.key, { include: e.target.checked })}
                  aria-label={`Include ${line.food?.name ?? line.text}`}
                  className="mt-1 size-5 accent-[var(--primary)]"
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-xs text-muted-foreground">&ldquo;{line.text}&rdquo;</p>
                  {line.food ? (
                    <>
                      <div className="flex items-center gap-2">
                        <p className="min-w-0 flex-1 truncate text-[15px] font-medium">{line.food.name}</p>
                        {line.confidence < 0.6 && (
                          <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                            <CircleAlert className="size-3.5 text-warning" /> check
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative w-28">
                          <Input
                            inputMode="decimal"
                            aria-label={`Grams of ${line.food.name}`}
                            value={line.grams}
                            onChange={(e) => update(line.key, { grams: e.target.value.replace(/[^\d.]/g, "") })}
                            className="h-10 rounded-lg pr-7"
                          />
                          <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-muted-foreground">g</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatNumber(macrosForQuantity(line.food, Number(line.grams) || 0).calories)} kcal
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm">
                      Not in the food list.{" "}
                      <Link href="/me/foods/new" className="font-medium text-primary">
                        Add it as your own food
                      </Link>
                    </p>
                  )}
                  {line.alternatives.length > 0 && (
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                      {line.alternatives.map((alt) => (
                        <button
                          key={alt.id}
                          type="button"
                          onClick={() => swap(line, alt)}
                          className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs active:bg-accent"
                        >
                          {line.food ? "Or: " : ""}
                          {alt.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {line.food && line.include && (
                  <button type="button" aria-label="Skip this item" onClick={() => update(line.key, { include: false })} className="grid size-8 place-items-center rounded-full text-muted-foreground active:bg-muted">
                    <X className="size-4" />
                  </button>
                )}
              </div>
            </Panel>
          ))}
        </section>
      )}

      {lines && chosen.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-md px-4">
          <Button size="lg" className="h-13 w-full rounded-2xl text-base shadow-lg shadow-primary/25" disabled={saving} onClick={() => void save()}>
            {saving ? "Adding..." : `Add ${chosen.length} to ${MEAL_TYPES[meal]} · ${formatNumber(totals.calories)} kcal`}
          </Button>
        </div>
      )}
    </div>
  );
}
