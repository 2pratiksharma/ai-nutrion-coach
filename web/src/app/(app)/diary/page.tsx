import type { Metadata } from "next";
import { Suspense } from "react";
import { isIsoDate } from "@nutrition/shared";
import { TopBar } from "@/components/app/top-bar";
import { DateSwitcher } from "@/components/common/date-switcher";
import { Screen } from "@/components/common/layout";
import { getProfile, serverApi } from "@/lib/api/server";
import { CalorieCard } from "@/features/today/calorie-card";
import { EnergyCard } from "@/features/today/energy-card";
import { RingsCard } from "@/features/today/rings-card";
import { StatTiles } from "@/features/today/stat-tiles";
import { WaterCard } from "@/features/today/water-card";
import { CopyYesterdayButton, WorkoutList } from "@/features/diary/day-actions";
import { MealSections } from "@/features/diary/meal-sections";
import { OpenSheetFromUrl } from "@/features/diary/open-sheet-from-url";

export const metadata: Metadata = { title: "Diary" };

export default async function DiaryPage(props: PageProps<"/diary">) {
  const { today } = await getProfile();
  const requested = (await props.searchParams).date;
  const date = typeof requested === "string" && isIsoDate(requested) && requested <= today ? requested : today;
  const isToday = date === today;

  const [summary, { meals }, { exercises }] = await Promise.all([
    serverApi.insights.summary(date),
    serverApi.meals.day(date),
    serverApi.activity.day(date),
  ]);
  const dateParam = isToday ? undefined : date;

  return (
    <>
      <TopBar title="Diary" large />
      <Suspense>
        <OpenSheetFromUrl />
      </Suspense>
      <Screen className="pt-1">
        <DateSwitcher date={date} today={today} basePath="/diary" />
        <CalorieCard summary={summary} />
        <MealSections meals={meals} date={date} isToday={isToday} />
        {meals.length === 0 && <CopyYesterdayButton date={date} />}
        <WorkoutList exercises={exercises} date={date} isToday={isToday} />
        <RingsCard summary={summary} date={dateParam} />
        <StatTiles summary={summary} date={dateParam} />
        <WaterCard amountMl={summary.waterMl} targetMl={summary.targets.waterMl} date={dateParam} />
        <EnergyCard summary={summary} isToday={isToday} />
      </Screen>
    </>
  );
}
