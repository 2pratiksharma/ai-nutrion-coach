import type { Metadata } from "next";
import { TopBar } from "@/components/app/top-bar";
import { getProfile, serverApi } from "@/lib/api/server";
import { GoalsForm } from "@/features/profile/goals-form";

export const metadata: Metadata = { title: "Movement goals" };

export default async function GoalsPage() {
  const [profile, trends] = await Promise.all([getProfile(), serverApi.insights.trends(30)]);

  return (
    <>
      <TopBar title="Movement goals" backHref="/me" />
      <GoalsForm data={profile} recentSteps={trends.days.map((d) => d.steps)} />
    </>
  );
}
