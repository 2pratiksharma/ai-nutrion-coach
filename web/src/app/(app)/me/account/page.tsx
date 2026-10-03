import type { Metadata } from "next";
import { TopBar } from "@/components/app/top-bar";
import { getSession } from "@/lib/api/server";
import { AccountSettings } from "@/features/profile/account-settings";

export const metadata: Metadata = { title: "Account & security" };

export default async function AccountPage() {
  const { user } = await getSession();
  return (
    <>
      <TopBar title="Account & security" backHref="/me" />
      <AccountSettings user={user} />
    </>
  );
}
