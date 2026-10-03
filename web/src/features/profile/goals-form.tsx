"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  activityGoalsSchema,
  defaultActivityGoals,
  suggestGoalBump,
  WEEKLY_HEART_POINTS_TARGET,
  type ActivityGoalsInput,
  type ProfileResponse,
} from "@nutrition/shared";
import { Field, FormError } from "@/components/common/field";
import { Panel, Section } from "@/components/common/layout";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { useSubmit } from "@/lib/forms";
import { formatNumber } from "@/lib/format";

type Draft = Record<keyof ActivityGoalsInput, string>;

const toDraft = (p: ProfileResponse["profile"]): Draft => ({
  stepTarget: String(p.stepTarget),
  activeKcalTarget: String(p.activeKcalTarget),
  heartPointsTarget: String(p.heartPointsTarget),
  workoutDaysTarget: String(p.workoutDaysTarget),
  waterTargetMl: String(p.waterTargetMl),
});

export function GoalsForm({ data, recentSteps }: { data: ProfileResponse; recentSteps: number[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(toDraft(data.profile));
  const { errors, formError, pending, submit } = useSubmit(activityGoalsSchema);

  const suggestion = suggestGoalBump(recentSteps, Number(draft.stepTarget) || data.profile.stepTarget);
  const recommended = defaultActivityGoals(data.profile.activityLevel);

  const text = (key: keyof Draft) => ({
    name: key,
    value: draft[key],
    error: errors[key],
    inputMode: "numeric" as const,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDraft((d) => ({ ...d, [key]: e.target.value })),
  });

  return (
    <form
      noValidate
      className="space-y-5 px-4 pt-2 pb-28"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(draft, async (body) => {
          await api.profile.saveGoals(body);
          toast.success("Goals updated");
          router.push("/me");
          router.refresh();
        });
      }}
    >
      {suggestion && (
        <Panel className="flex items-start gap-3 p-4">
          <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">You&apos;ve outgrown this goal</p>
            <p className="text-xs text-muted-foreground">
              Your typical day is well past {formatNumber(Number(draft.stepTarget))} steps. Move the goal to{" "}
              {formatNumber(suggestion)}?
            </p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="mt-2 rounded-full"
              onClick={() => setDraft((d) => ({ ...d, stepTarget: String(suggestion) }))}
            >
              Use {formatNumber(suggestion)}
            </Button>
          </div>
        </Panel>
      )}

      <Section title="Every day">
        <Panel className="grid grid-cols-2 gap-3 p-4">
          <Field label="Steps" {...text("stepTarget")} />
          <Field label="Move calories" suffix="kcal" {...text("activeKcalTarget")} />
          <Field label="Water" suffix="ml" {...text("waterTargetMl")} />
        </Panel>
        <p className="px-1 pt-2 text-xs text-muted-foreground">
          Move calories count what you burn through walking and workouts, on top of the {formatNumber(data.targets.bmr)}{" "}
          kcal your body uses at rest.
        </p>
      </Section>

      <Section title="Every week">
        <Panel className="grid grid-cols-2 gap-3 p-4">
          <Field label="Heart points" {...text("heartPointsTarget")} />
          <Field label="Active days" {...text("workoutDaysTarget")} />
        </Panel>
        <p className="px-1 pt-2 text-xs text-muted-foreground">
          You earn a heart point for every minute of moderate activity and two for every vigorous minute. The World
          Health Organization&apos;s guideline works out to {WEEKLY_HEART_POINTS_TARGET} points a week — 150 minutes of
          brisk walking, or 75 minutes of running.
        </p>
      </Section>

      <Button
        type="button"
        variant="ghost"
        className="w-full text-muted-foreground"
        onClick={() =>
          setDraft((d) => ({
            ...d,
            stepTarget: String(recommended.steps),
            activeKcalTarget: String(recommended.activeKcal),
            heartPointsTarget: String(recommended.heartPointsWeekly),
            workoutDaysTarget: String(recommended.workoutDaysWeekly),
          }))
        }
      >
        Reset to what we suggest for you
      </Button>

      <FormError message={formError} />

      <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-md px-4">
        <Button type="submit" size="lg" className="h-12 w-full rounded-2xl text-base shadow-lg shadow-primary/25" disabled={pending}>
          {pending ? "Saving..." : "Save goals"}
        </Button>
      </div>
    </form>
  );
}
