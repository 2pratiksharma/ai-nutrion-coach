import type { Metadata } from "next";
import { TopBar } from "@/components/app/top-bar";
import { getProfile, serverApi } from "@/lib/api/server";
import { relativeDay } from "@/lib/format";
import { dateParam } from "@/lib/search-params";
import { WorkoutLogger } from "@/features/workout/workout-logger";

export const metadata: Metadata = { title: "Log workout" };

export default async function LogWorkoutPage(props: PageProps<"/log/workout">) {
  const [params, { today }] = await Promise.all([props.searchParams, getProfile()]);
  const date = dateParam(params, today);
  const [activities, summary] = await Promise.all([serverApi.activity.catalog(), serverApi.insights.summary(date)]);

  return (
    <>
      <TopBar title="Log workout" subtitle={date ? relativeDay(date, today) : undefined} back />
      <WorkoutLogger activities={activities} weightKg={summary.weightKg} date={date} />
    </>
  );
}
