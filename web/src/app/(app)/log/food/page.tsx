import type { Metadata } from "next";
import { TopBar } from "@/components/app/top-bar";
import { getProfile, serverApi } from "@/lib/api/server";
import { relativeDay } from "@/lib/format";
import { dateParam, mealParam } from "@/lib/search-params";
import { FoodLogger } from "@/features/food/food-logger";

export const metadata: Metadata = { title: "Log food" };

export default async function LogFoodPage(props: PageProps<"/log/food">) {
  const [params, { profile, today }] = await Promise.all([props.searchParams, getProfile()]);
  const date = dateParam(params, today);
  const recent = await serverApi.foods.search({ scope: "recent", limit: 30 });

  return (
    <>
      <TopBar title="Log food" subtitle={date ? relativeDay(date, today) : undefined} back />
      <FoodLogger initialMeal={mealParam(params, profile.timezone)} date={date} initialFoods={recent} />
    </>
  );
}
