import Link from "next/link";
import { Flame, UtensilsCrossed } from "lucide-react";
import { MEAL_TYPES } from "@nutrition/shared";
import { EmptyState, ListGroup, Row, Screen, Section } from "@/components/common/layout";
import { Button } from "@/components/ui/button";
import { getProfile, getSession, serverApi } from "@/lib/api/server";
import { formatDay, formatNumber, greeting } from "@/lib/format";
import { hourIn } from "@/lib/time";
import { CalorieCard } from "@/features/today/calorie-card";
import { CoachCard } from "@/features/today/coach-card";
import { EnergyCard } from "@/features/today/energy-card";
import { RingsCard } from "@/features/today/rings-card";
import { StatTiles } from "@/features/today/stat-tiles";
import { WaterCard } from "@/features/today/water-card";
import { SuggestionsCard } from "@/features/ai/suggestions-card";

export default async function TodayPage() {
  const [session, { profile }] = await Promise.all([getSession(), getProfile()]);
  const [summary, meals, coach, suggestions, trends] = await Promise.all([
    serverApi.insights.summary(),
    serverApi.meals.day(),
    serverApi.ai.coach(),
    serverApi.ai.suggestions({}),
    serverApi.insights.trends(7),
  ]);
  const firstName = session.user.name.split(" ")[0];
  const streak = trends.streak.current;

  return (
    <>
      <header className="sticky top-0 z-30 bg-background/85 px-4 pt-safe backdrop-blur-xl">
        <div className="flex min-h-16 items-center justify-between gap-3 pt-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">{formatDay(summary.date, { weekday: "long", day: "numeric", month: "long" })}</p>
            <h1 className="truncate text-2xl font-semibold tracking-tight">
              {greeting(hourIn(profile.timezone))}, {firstName}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {streak > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-sm font-semibold text-secondary-foreground" aria-label={`${streak} day logging streak`}>
                <Flame className="size-4 text-warning" />
                {streak}
              </span>
            )}
            <Link href="/me" aria-label="Your profile" className="grid size-10 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {firstName.slice(0, 1).toUpperCase()}
            </Link>
          </div>
        </div>
      </header>

      <Screen>
        <CalorieCard summary={summary} />
        <RingsCard summary={summary} />
        <StatTiles summary={summary} />
        <WaterCard amountMl={summary.waterMl} targetMl={summary.targets.waterMl} />
        <CoachCard coach={coach} />
        <SuggestionsCard data={suggestions} />
        <EnergyCard summary={summary} isToday />

        <Section
          title="Today's meals"
          action={
            <Link href="/diary" className="text-sm font-medium text-primary">
              Open diary
            </Link>
          }
        >
          {meals.meals.length === 0 ? (
            <div className="rounded-2xl border bg-card">
              <EmptyState
                icon={<UtensilsCrossed className="size-6" />}
                title="Nothing logged yet"
                body="Log your first meal to see your calories and protein add up."
                action={<Button nativeButton={false} className="rounded-full" render={<Link href="/log/food">Log food</Link>} />}
              />
            </div>
          ) : (
            <ListGroup>
              {meals.meals.map((meal) => (
                <Row
                  key={meal.id}
                  href={`/diary#${meal.type.toLowerCase()}`}
                  title={MEAL_TYPES[meal.type]}
                  subtitle={meal.items.map((i) => i.food.name).join(", ")}
                  trailing={`${formatNumber(meal.items.reduce((s, i) => s + i.calories, 0))} kcal`}
                />
              ))}
            </ListGroup>
          )}
        </Section>
      </Screen>
    </>
  );
}
