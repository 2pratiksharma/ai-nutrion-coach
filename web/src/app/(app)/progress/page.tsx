import type { Metadata } from "next";
import { TopBar } from "@/components/app/top-bar";
import { getProfile, serverApi } from "@/lib/api/server";
import { ProgressView } from "@/features/progress/progress-view";

export const metadata: Metadata = { title: "Progress" };

const ALLOWED = [7, 30, 90];

export default async function ProgressPage(props: PageProps<"/progress">) {
  const requested = Number((await props.searchParams).days);
  const days = ALLOWED.includes(requested) ? requested : 30;
  const [trends, { targets }] = await Promise.all([serverApi.insights.trends(days), getProfile()]);

  return (
    <>
      <TopBar title="Progress" large />
      <ProgressView
        trends={trends}
        days={days}
        calorieTarget={targets.calories}
        proteinTarget={targets.proteinG}
        stepTarget={targets.steps}
        heartPointsWeekly={targets.heartPointsWeekly}
      />
    </>
  );
}
