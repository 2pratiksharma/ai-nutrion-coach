import type { Metadata } from "next";
import { TopBar } from "@/components/app/top-bar";
import { getProfile } from "@/lib/api/server";
import { relativeDay } from "@/lib/format";
import { dateParam, mealParam } from "@/lib/search-params";
import { DescribeMeal } from "@/features/ai/describe-meal";

export const metadata: Metadata = { title: "Describe a meal" };

export default async function DescribeMealPage(props: PageProps<"/log/describe">) {
  const [params, { profile, today }] = await Promise.all([props.searchParams, getProfile()]);
  const date = dateParam(params, today);
  return (
    <>
      <TopBar title="Describe your meal" subtitle={date ? relativeDay(date, today) : "Type or speak, we'll find the foods"} back />
      <DescribeMeal initialMeal={mealParam(params, profile.timezone)} date={date} />
    </>
  );
}
