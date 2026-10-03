import type { Metadata } from "next";
import { DIET_PREFERENCES } from "@nutrition/shared";
import { TopBar } from "@/components/app/top-bar";
import { Panel, Screen } from "@/components/common/layout";
import { getProfile, getSession } from "@/lib/api/server";
import { SettingsList } from "@/features/profile/settings-list";

export const metadata: Metadata = { title: "Me" };

export default async function MePage() {
  const [session, profile] = await Promise.all([getSession(), getProfile()]);
  const { user } = session;
  const p = profile.profile;
  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      <TopBar title="Me" large />
      <Screen className="pt-1">
        <Panel className="p-4">
          <div className="flex items-center gap-3">
            <span className="grid size-14 place-items-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">{initials}</span>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">{user.name}</p>
              <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-4 gap-2 text-center">
            {[
              ["Weight", `${profile.currentWeightKg} kg`],
              ["Goal", p.targetWeightKg ? `${p.targetWeightKg} kg` : "—"],
              ["Height", `${p.heightCm} cm`],
              ["Diet", DIET_PREFERENCES[p.dietPreference].replace("Non-vegetarian", "Non-veg").replace("Vegetarian", "Veg")],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-muted/60 px-1 py-2">
                <dd className="truncate text-sm font-semibold">{value}</dd>
                <dt className="text-[11px] text-muted-foreground">{label}</dt>
              </div>
            ))}
          </dl>
        </Panel>
        <SettingsList profile={profile} />
        <p className="text-center text-xs text-muted-foreground">NutriCoach · estimates are guidance, not medical advice</p>
      </Screen>
    </>
  );
}
