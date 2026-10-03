"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { calculateTargets, profileSchema, type ProfileInput } from "@nutrition/shared";
import { Button } from "@/components/ui/button";
import { ChoiceList, Segmented } from "@/components/common/choice-list";
import { Field, FormError } from "@/components/common/field";
import { api } from "@/lib/api/client";
import { useSubmit } from "@/lib/forms";
import { formatNumber } from "@/lib/format";
import { activityChoices, dietChoices, goalChoices, sexOptions } from "@/features/profile/choices";

type Draft = Partial<Record<keyof ProfileInput, string>> & Pick<ProfileInput, "sex">;

const STEPS = ["about", "weight", "goal", "activity", "diet", "review"] as const;
type Step = (typeof STEPS)[number];

const STEP_FIELDS: Record<Step, (keyof ProfileInput)[]> = {
  about: ["sex", "age", "heightCm"],
  weight: ["startWeightKg", "targetWeightKg"],
  goal: ["goalType"],
  activity: ["activityLevel"],
  diet: ["dietPreference"],
  review: [],
};

const TITLES: Record<Step, { title: string; subtitle: string }> = {
  about: { title: "Tell us about you", subtitle: "Used to estimate how much energy your body uses." },
  weight: { title: "Your weight", subtitle: "A target helps us show when you'll get there." },
  goal: { title: "What's your goal?", subtitle: "You can change this any time." },
  activity: { title: "How active are you?", subtitle: "Think about a typical week, not your best one." },
  diet: { title: "How do you eat?", subtitle: "Meal ideas will match this." },
  review: { title: "Your daily plan", subtitle: "Targets update automatically as your weight changes." },
};

function toInput(draft: Draft) {
  return {
    ...draft,
    targetWeightKg: draft.targetWeightKg ? draft.targetWeightKg : null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

export function OnboardingWizard({ firstName }: { firstName: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("about");
  const [draft, setDraft] = useState<Draft>({ sex: "MALE" });
  const { errors, formError, pending, submit } = useSubmit(profileSchema);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});

  const index = STEPS.indexOf(step);
  const set = (key: keyof ProfileInput) => (value: string) => setDraft((d) => ({ ...d, [key]: value }));
  const allErrors = { ...errors, ...stepErrors };

  function next() {
    const parsed = profileSchema.safeParse(toInput(draft));
    const issues = parsed.success ? [] : parsed.error.issues.filter((i) => STEP_FIELDS[step].includes(i.path[0] as keyof ProfileInput));
    if (issues.length) {
      setStepErrors(Object.fromEntries(issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setStepErrors({});
    setStep(STEPS[index + 1]);
  }

  const parsed = profileSchema.safeParse(toInput(draft));
  const targets = parsed.success ? calculateTargets({ ...parsed.data, weightKg: parsed.data.startWeightKg }) : null;
  const choiceError = (key: keyof ProfileInput) =>
    allErrors[key] ? <p className="text-sm text-destructive">Please choose an option.</p> : null;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col pt-safe pb-safe">
      <div className="flex items-center gap-2 px-2 pt-2">
        <button
          type="button"
          aria-label="Back"
          onClick={() => setStep(STEPS[Math.max(0, index - 1)])}
          className="grid size-11 place-items-center rounded-full active:bg-muted disabled:opacity-0"
          disabled={index === 0}
        >
          <ChevronLeft className="size-6" />
        </button>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${((index + 1) / STEPS.length) * 100}%` }} />
        </div>
        <span className="w-11 text-center text-xs text-muted-foreground">
          {index + 1}/{STEPS.length}
        </span>
      </div>

      <main className="flex-1 space-y-5 px-5 pt-4 pb-6">
        <div>
          {index === 0 && <p className="text-sm font-medium text-primary">Hi {firstName} 👋</p>}
          <h1 className="text-2xl font-semibold tracking-tight">{TITLES[step].title}</h1>
          <p className="text-sm text-muted-foreground">{TITLES[step].subtitle}</p>
        </div>

        {step === "about" && (
          <div className="space-y-4">
            <Segmented label="Sex" value={draft.sex} onChange={(v) => setDraft((d) => ({ ...d, sex: v }))} options={sexOptions} />
            <Field label="Age" name="age" inputMode="numeric" suffix="years" value={draft.age ?? ""} onChange={(e) => set("age")(e.target.value)} error={allErrors.age} />
            <Field label="Height" name="heightCm" inputMode="decimal" suffix="cm" value={draft.heightCm ?? ""} onChange={(e) => set("heightCm")(e.target.value)} error={allErrors.heightCm} />
          </div>
        )}

        {step === "weight" && (
          <div className="space-y-4">
            <Field label="Current weight" name="startWeightKg" inputMode="decimal" suffix="kg" value={draft.startWeightKg ?? ""} onChange={(e) => set("startWeightKg")(e.target.value)} error={allErrors.startWeightKg} />
            <Field label="Target weight (optional)" name="targetWeightKg" inputMode="decimal" suffix="kg" value={draft.targetWeightKg ?? ""} onChange={(e) => set("targetWeightKg")(e.target.value)} error={allErrors.targetWeightKg} />
          </div>
        )}

        {step === "goal" && (
          <>
            <ChoiceList label="Goal" value={draft.goalType as ProfileInput["goalType"]} onChange={set("goalType")} choices={goalChoices} />
            {choiceError("goalType")}
          </>
        )}

        {step === "activity" && (
          <>
            <ChoiceList label="Activity level" value={draft.activityLevel as ProfileInput["activityLevel"]} onChange={set("activityLevel")} choices={activityChoices} />
            {choiceError("activityLevel")}
          </>
        )}

        {step === "diet" && (
          <>
            <ChoiceList label="Diet" value={draft.dietPreference as ProfileInput["dietPreference"]} onChange={set("dietPreference")} choices={dietChoices} columns={1} />
            {choiceError("dietPreference")}
          </>
        )}

        {step === "review" && targets && (
          <div className="space-y-3">
            <div className="rounded-2xl bg-primary p-5 text-primary-foreground">
              <p className="text-sm opacity-80">Daily calories</p>
              <p className="text-5xl font-semibold tracking-tight">{formatNumber(targets.calories)}</p>
              <p className="mt-1 text-sm opacity-80">kcal to {goalChoices.find((g) => g.value === draft.goalType)?.label.toLowerCase()}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border bg-card p-4">
                <p className="text-xs text-muted-foreground">Protein</p>
                <p className="text-2xl font-semibold">{targets.proteinG} g</p>
              </div>
              <div className="rounded-2xl border bg-card p-4">
                <p className="text-xs text-muted-foreground">Body at rest</p>
                <p className="text-2xl font-semibold">{formatNumber(targets.bmr)}</p>
                <p className="text-xs text-muted-foreground">kcal/day</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Estimated with the Mifflin-St Jeor equation. These are starting points, not medical advice.
            </p>
            <FormError message={formError ?? Object.values(errors)[0]} />
          </div>
        )}
      </main>

      <div className="sticky bottom-0 bg-background/90 px-5 pt-3 pb-4 backdrop-blur">
        {step === "review" ? (
          <Button
            size="lg"
            className="h-12 w-full rounded-xl text-base"
            disabled={pending}
            onClick={() =>
              void submit(toInput(draft), async (data) => {
                await api.profile.save(data);
                router.replace("/");
                router.refresh();
              })
            }
          >
            {pending ? "Setting up..." : "Start tracking"}
          </Button>
        ) : (
          <Button size="lg" className="h-12 w-full rounded-xl text-base" onClick={next}>
            Continue
          </Button>
        )}
      </div>
    </div>
  );
}
