import type { Metadata } from "next";
import { TopBar } from "@/components/app/top-bar";
import { serverApi } from "@/lib/api/server";
import { ReminderSettings } from "@/features/reminders/reminder-settings";

export const metadata: Metadata = { title: "Reminders" };

export default async function RemindersPage() {
  return (
    <>
      <TopBar title="Reminders" backHref="/me" />
      <ReminderSettings initial={await serverApi.reminders.get()} />
    </>
  );
}
