"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Activity, Bell, Download, LogOut, Salad, Shield, Target } from "lucide-react";
import { toast } from "sonner";
import { GOALS, type ProfileResponse } from "@nutrition/shared";
import { Segmented } from "@/components/common/choice-list";
import { BottomSheet } from "@/components/common/bottom-sheet";
import { ListGroup, Panel, Row, Section } from "@/components/common/layout";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { formatNumber } from "@/lib/format";
import { useInstall } from "@/lib/pwa";
import { useClientValue } from "@/hooks/use-is-client";

function ThemePicker() {
  const { theme, setTheme } = useTheme();
  // The stored theme is only known in the browser.
  const mounted = useClientValue(() => true, false);
  return (
    <Segmented
      label="Appearance"
      value={mounted ? (theme ?? "system") : "system"}
      onChange={setTheme}
      options={[
        { value: "system", label: "Auto" },
        { value: "light", label: "Light" },
        { value: "dark", label: "Dark" },
      ]}
    />
  );
}

function InstallRow() {
  const { state, install } = useInstall();
  const [iosHelp, setIosHelp] = useState(false);
  if (state === "installed" || state === "unsupported") return null;

  return (
    <>
      <Row
        icon={<Download className="size-5" />}
        title="Install the app"
        subtitle="Open from your home screen, full screen, with reminders"
        onClick={async () => {
          if (state === "ios") setIosHelp(true);
          else if (await install()) toast.success("Installed. Find NutriCoach on your home screen.");
        }}
        chevron
      />
      <BottomSheet open={iosHelp} onOpenChange={setIosHelp} title="Add to Home Screen">
        <ol className="list-decimal space-y-2 pl-5 text-[15px]">
          <li>Tap the Share button in Safari&apos;s toolbar.</li>
          <li>Scroll and tap &ldquo;Add to Home Screen&rdquo;.</li>
          <li>Tap &ldquo;Add&rdquo;. Open NutriCoach from your home screen to enable reminders.</li>
        </ol>
        <Button className="mt-5 h-12 w-full rounded-xl" onClick={() => setIosHelp(false)}>
          Got it
        </Button>
      </BottomSheet>
    </>
  );
}

export function SettingsList({ profile }: { profile: ProfileResponse }) {
  const router = useRouter();
  const { targets, profile: p } = profile;

  async function logout() {
    await api.auth.logout().catch(() => undefined);
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      <Section title="Your plan">
        <ListGroup>
          <Row
            href="/me/profile"
            icon={<Target className="size-5" />}
            title="Body & goals"
            subtitle={`${GOALS[p.goalType]} · ${formatNumber(targets.calories)} kcal · ${targets.proteinG} g protein`}
          />
          <Row
            href="/me/goals"
            icon={<Activity className="size-5" />}
            title="Movement goals"
            subtitle={`${formatNumber(targets.steps)} steps · ${targets.heartPointsWeekly} heart pts a week`}
          />
          <Row href="/me/foods" icon={<Salad className="size-5" />} title="My foods" subtitle="Your own dishes and recipes" />
          <Row href="/me/reminders" icon={<Bell className="size-5" />} title="Reminders" subtitle="Meal, water and weigh-in nudges" />
        </ListGroup>
      </Section>

      <Section title="Account">
        <ListGroup>
          <Row href="/me/account" icon={<Shield className="size-5" />} title="Account & security" subtitle="Name, email, password" />
          <InstallRow />
          <Row onClick={() => void logout()} icon={<LogOut className="size-5" />} title="Log out" chevron={false} />
        </ListGroup>
      </Section>

      <Section title="Appearance">
        <Panel className="p-2">
          <ThemePicker />
        </Panel>
      </Section>
    </>
  );
}
