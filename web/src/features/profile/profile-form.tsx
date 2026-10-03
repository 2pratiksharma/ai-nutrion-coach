"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Scale } from "lucide-react";
import { toast } from "sonner";
import { calculateTargets, profileSchema, type ProfileInput, type ProfileResponse } from "@nutrition/shared";
import { useQuickAdd } from "@/components/app/quick-add";
import { ChoiceList, Segmented } from "@/components/common/choice-list";
import { Field, FormError } from "@/components/common/field";
import { ListGroup, Panel, Row, Section } from "@/components/common/layout";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { useSubmit } from "@/lib/forms";
import { formatNumber } from "@/lib/format";
import { activityChoices, dietChoices, goalChoices, sexOptions } from "./choices";

/** Movement goals live on their own screen, so this form leaves them untouched. */
type Editable = Exclude<keyof ProfileInput, "stepTarget" | "waterTargetMl" | "activeKcalTarget" | "heartPointsTarget" | "workoutDaysTarget">;
type Draft = Record<Exclude<Editable, "sex" | "activityLevel" | "dietPreference" | "goalType">, string> &
  Pick<ProfileInput, "sex" | "activityLevel" | "dietPreference" | "goalType">;

export function ProfileForm({ data }: { data: ProfileResponse }) {
  const router = useRouter();
  const { openWeight } = useQuickAdd();
  const p = data.profile;
  const [draft, setDraft] = useState<Draft>({
    sex: p.sex,
    age: String(p.age),
    heightCm: String(p.heightCm),
    startWeightKg: String(p.startWeightKg),
    targetWeightKg: p.targetWeightKg === null ? "" : String(p.targetWeightKg),
    activityLevel: p.activityLevel,
    dietPreference: p.dietPreference,
    goalType: p.goalType,
    timezone: p.timezone,
  });
  const { errors, formError, pending, submit } = useSubmit(profileSchema);

  const input = { ...draft, targetWeightKg: draft.targetWeightKg || null };
  const parsed = profileSchema.safeParse(input);
  const preview = parsed.success ? calculateTargets({ ...parsed.data, weightKg: data.currentWeightKg }) : null;
  const text = (key: keyof Draft) => ({
    name: key,
    value: draft[key] as string,
    error: errors[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDraft((d) => ({ ...d, [key]: e.target.value })),
  });
  const pick =
    <K extends keyof Draft>(key: K) =>
    (value: Draft[K]) =>
      setDraft((d) => ({ ...d, [key]: value }));

  return (
    <form
      noValidate
      className="space-y-5 px-4 pt-2 pb-28"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(input, async (body) => {
          await api.profile.save(body);
          toast.success("Profile saved");
          router.push("/me");
          router.refresh();
        });
      }}
    >
      <Panel className="bg-primary p-4 text-primary-foreground">
        <p className="text-xs opacity-80">Your daily targets</p>
        {preview ? (
          <p className="text-2xl font-semibold">
            {formatNumber(preview.calories)} kcal · {preview.proteinG} g protein
          </p>
        ) : (
          <p className="text-sm">Fix the highlighted fields to see your targets.</p>
        )}
        <p className="mt-1 text-xs opacity-80">Based on your current weight of {data.currentWeightKg} kg</p>
      </Panel>

      <Section title="Current weight">
        <ListGroup>
          <Row
            icon={<Scale className="size-5" />}
            title={`${data.currentWeightKg} kg`}
            subtitle="Log a new weigh-in to update your targets"
            onClick={() => openWeight({ current: data.currentWeightKg })}
            trailing="Update"
            chevron
          />
        </ListGroup>
      </Section>

      <Section title="About you">
        <Panel className="space-y-4 p-4">
          <Segmented label="Sex" value={draft.sex} onChange={pick("sex")} options={sexOptions} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Age" inputMode="numeric" suffix="yrs" {...text("age")} />
            <Field label="Height" inputMode="decimal" suffix="cm" {...text("heightCm")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starting weight" inputMode="decimal" suffix="kg" {...text("startWeightKg")} />
            <Field label="Target weight" inputMode="decimal" suffix="kg" placeholder="None" {...text("targetWeightKg")} />
          </div>
        </Panel>
      </Section>

      <Section title="Goal">
        <ChoiceList label="Goal" value={draft.goalType} onChange={pick("goalType")} choices={goalChoices} />
      </Section>

      <Section title="Activity level">
        <ChoiceList label="Activity level" value={draft.activityLevel} onChange={pick("activityLevel")} choices={activityChoices} />
      </Section>

      <Section title="Diet">
        <ChoiceList label="Diet" value={draft.dietPreference} onChange={pick("dietPreference")} choices={dietChoices} />
      </Section>

      <FormError message={formError} />

      <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-md px-4">
        <Button type="submit" size="lg" className="h-12 w-full rounded-2xl text-base shadow-lg shadow-primary/25" disabled={pending}>
          {pending ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
