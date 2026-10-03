import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/api/server";
import { OnboardingWizard } from "@/features/onboarding/onboarding-wizard";

export const metadata: Metadata = { title: "Set up your plan" };

export default async function OnboardingPage() {
  const session = await getSession();
  if (session.hasProfile) redirect("/");
  return <OnboardingWizard firstName={session.user.name.split(" ")[0]} />;
}
