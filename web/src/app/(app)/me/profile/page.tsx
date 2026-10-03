import type { Metadata } from "next";
import { TopBar } from "@/components/app/top-bar";
import { getProfile } from "@/lib/api/server";
import { ProfileForm } from "@/features/profile/profile-form";

export const metadata: Metadata = { title: "Body & goals" };

export default async function ProfilePage() {
  return (
    <>
      <TopBar title="Body & goals" backHref="/me" />
      <ProfileForm data={await getProfile()} />
    </>
  );
}
