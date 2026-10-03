"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Loader2, Plus, Search, SearchX, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { MEAL_TYPES, MEAL_TYPE_VALUES, type Food, type MealType, type Suggestions } from "@nutrition/shared";
import { Segmented } from "@/components/common/choice-list";
import { EmptyState } from "@/components/common/layout";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/client";
import type { FoodScope } from "@/lib/api/endpoints";
import { errorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import { SuggestionsCard } from "@/features/ai/suggestions-card";
import { AddFoodSheet } from "./add-food-sheet";
import { FoodRow } from "./food-row";

type Tab = FoodScope | "ideas";

const TABS: { value: Tab; label: string }[] = [
  { value: "recent", label: "Recent" },
  { value: "favorites", label: "Favourites" },
  { value: "mine", label: "My foods" },
  { value: "all", label: "All foods" },
  { value: "ideas", label: "Ideas" },
];

const EMPTY: Record<FoodScope, { title: string; body: string }> = {
  recent: { title: "No recent foods yet", body: "Foods you log show up here for quick re-adding." },
  favorites: { title: "No favourites yet", body: "Tap the heart on any food to keep it here." },
  mine: { title: "No custom foods", body: "Add your own dishes with their nutrition values." },
  all: { title: "No foods found", body: "Try a different spelling, or add it as your own food." },
};

interface Props {
  initialMeal: MealType;
  date?: string;
  initialFoods: Food[];
}

export function FoodLogger({ initialMeal, date, initialFoods }: Props) {
  const router = useRouter();
  const [meal, setMeal] = useState<MealType>(initialMeal);
  const [tab, setTab] = useState<Tab>(initialFoods.length ? "recent" : "all");
  const [query, setQuery] = useState("");
  const [foods, setFoods] = useState<Food[]>(initialFoods);
  const [ideas, setIdeas] = useState<{ key: string; data: Suggestions } | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Food | null>(null);

  const searching = query.trim().length > 0;
  const scope: FoodScope = searching ? "all" : tab === "ideas" ? "recent" : tab;

  useEffect(() => {
    if (tab === "ideas" && !searching) return;
    let cancelled = false;
    const timer = setTimeout(
      async () => {
        setLoading(true);
        try {
          const result = await api.foods.search({ q: query.trim() || undefined, scope, limit: 30 });
          if (!cancelled) setFoods(result);
        } catch (err) {
          if (!cancelled) toast.error(errorMessage(err));
        } finally {
          if (!cancelled) setLoading(false);
        }
      },
      searching ? 250 : 0,
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, scope, tab, searching]);

  useEffect(() => {
    if (tab !== "ideas") return;
    let cancelled = false;
    api.ai
      .suggestions({ date, meal })
      .then((data) => !cancelled && setIdeas({ key: meal, data }))
      .catch((err) => !cancelled && toast.error(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [tab, meal, date]);

  async function add(food: Food, quantityG: number) {
    try {
      await api.meals.add({ foodId: food.id, quantityG, type: meal, date });
      toast.success(`${food.name} added to ${MEAL_TYPES[meal].toLowerCase()}`, {
        action: { label: "View", onClick: () => router.push(date ? `/diary?date=${date}` : "/diary") },
      });
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
      throw err;
    }
  }

  async function toggleFavorite(food: Food) {
    const next = !food.isFavorite;
    setFoods((list) =>
      list
        .map((f) => (f.id === food.id ? { ...f, isFavorite: next } : f))
        .filter((f) => next || scope !== "favorites" || f.id !== food.id),
    );
    try {
      await api.foods.favorite(food.id, next);
    } catch (err) {
      toast.error(errorMessage(err));
      setFoods((list) => list.map((f) => (f.id === food.id ? { ...f, isFavorite: food.isFavorite } : f)));
    }
  }

  const describeHref = `/log/describe?meal=${meal}${date ? `&date=${date}` : ""}`;
  const empty = EMPTY[scope];

  return (
    <div className="space-y-3 px-4 pt-2 pb-6">
      <Segmented
        label="Meal"
        value={meal}
        onChange={setMeal}
        options={MEAL_TYPE_VALUES.map((m) => ({ value: m, label: MEAL_TYPES[m] }))}
      />

      <div className="sticky top-[calc(env(safe-area-inset-top)+3.5rem)] z-20 -mx-4 space-y-2 bg-background/90 px-4 py-2 backdrop-blur-xl">
        <label className="relative block">
          <span className="sr-only">Search foods</span>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search dal, paneer, roti..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            enterKeyHint="search"
            className="h-12 rounded-xl pr-20 pl-11 text-base [&::-webkit-search-cancel-button]:appearance-none"
          />
          <span className="absolute inset-y-0 right-1 flex items-center gap-1">
            {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
                className="grid size-10 place-items-center rounded-full text-muted-foreground active:bg-muted"
              >
                <X className="size-5" />
              </button>
            )}
          </span>
        </label>
        {!searching && (
          <div role="tablist" aria-label="Food lists" className="-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar">
            {TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={tab === t.value}
                onClick={() => setTab(t.value)}
                className={cn(
                  "h-9 shrink-0 rounded-full border px-3.5 text-sm font-medium transition-colors",
                  tab === t.value ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground",
                )}
              >
                {t.value === "ideas" && <Sparkles className="mr-1 inline size-3.5 -translate-y-px" />}
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {!searching && tab !== "ideas" && (
        <Link href={describeHref} className="flex items-center gap-3 rounded-2xl border border-dashed border-primary/40 bg-accent/50 p-3.5 active:bg-accent">
          <span className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground">
            <Sparkles className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Describe your meal</span>
            <span className="block text-xs text-muted-foreground">Type &quot;2 roti, dal and a bowl of curd&quot;</span>
          </span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
      )}

      {tab === "ideas" && !searching ? (
        ideas?.key === meal ? (
          ideas.data.suggestions.length ? (
            <SuggestionsCard data={ideas.data} date={date} />
          ) : (
            <EmptyState icon={<Sparkles className="size-6" />} title="No ideas right now" body="You may have already reached today's calorie goal." />
          )
        ) : (
          <div className="grid place-items-center py-10">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )
      ) : foods.length ? (
        <ul className={cn("divide-y overflow-hidden rounded-2xl border bg-card transition-opacity", loading && "opacity-60")}>
          {foods.map((food) => (
            <FoodRow key={food.id} food={food} onSelect={setSelected} onToggleFavorite={(f) => void toggleFavorite(f)} />
          ))}
        </ul>
      ) : (
        !loading && (
          <div className="rounded-2xl border bg-card">
            <EmptyState icon={<SearchX className="size-6" />} title={empty.title} body={empty.body} />
          </div>
        )
      )}

      <Link href="/me/foods/new" className="flex min-h-12 items-center justify-center gap-2 rounded-xl text-sm font-medium text-primary active:bg-muted">
        <Plus className="size-4" /> Can&apos;t find it? Add your own food
      </Link>

      <AddFoodSheet food={selected} meal={meal} onClose={() => setSelected(null)} onAdd={add} />
    </div>
  );
}
