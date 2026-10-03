"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Search } from "lucide-react";
import { toast } from "sonner";
import { caloriesForActivity, type Activity } from "@nutrition/shared";
import { BottomSheet } from "@/components/common/bottom-sheet";
import { Panel } from "@/components/common/layout";
import { Field } from "@/components/common/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const POPULAR = ["walking-brisk", "running-10", "weights-moderate", "yoga-hatha", "cycling-moderate", "badminton", "cricket", "hiit"];
const DURATIONS = [15, 30, 45, 60, 90];

function intensity(met: number) {
  if (met < 3) return "Light";
  if (met < 6) return "Moderate";
  return "Vigorous";
}

function ActivityPicker({
  open,
  onOpenChange,
  activities,
  onPick,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  activities: Activity[];
  onPick: (a: Activity) => void;
}) {
  const [query, setQuery] = useState("");
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map = new Map<string, Activity[]>();
    for (const a of activities) {
      if (q && !a.name.toLowerCase().includes(q) && !a.category.toLowerCase().includes(q)) continue;
      map.set(a.category, [...(map.get(a.category) ?? []), a]);
    }
    return [...map];
  }, [activities, query]);

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="Choose an activity" className="px-0">
      <div className="px-4 pb-2">
        <label className="relative block">
          <span className="sr-only">Search activities</span>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search running, yoga, cricket..." className="h-11 rounded-xl pl-11" />
        </label>
      </div>
      <div className="max-h-[55dvh] overflow-y-auto">
        {groups.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted-foreground">No matching activity.</p>}
        {groups.map(([category, items]) => (
          <div key={category}>
            <p className="sticky top-0 bg-popover px-4 py-1.5 text-xs font-semibold text-muted-foreground">{category}</p>
            <ul>
              {items.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(a);
                      onOpenChange(false);
                      setQuery("");
                    }}
                    className="flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left text-[15px] active:bg-muted"
                  >
                    {a.name}
                    <span className="text-xs text-muted-foreground">{intensity(a.met)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </BottomSheet>
  );
}

export function WorkoutLogger({ activities, weightKg, date }: { activities: Activity[]; weightKg: number; date?: string }) {
  const router = useRouter();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [duration, setDuration] = useState("30");
  const [notes, setNotes] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const byId = new Map(activities.map((a) => [a.id, a]));
  const popular = POPULAR.map((id) => byId.get(id)).filter(Boolean) as Activity[];
  const minutes = Number(duration);
  const validDuration = Number.isInteger(minutes) && minutes >= 1 && minutes <= 600;
  const estimate = activity && validDuration ? caloriesForActivity(activity.met, weightKg, minutes) : null;

  async function save() {
    if (!activity || !validDuration) return;
    setPending(true);
    try {
      await api.activity.log({ activityId: activity.id, durationMin: minutes, date, notes: notes.trim() || undefined });
      toast.success(`${activity.name} logged · ${estimate} kcal`);
      router.push(date ? `/diary?date=${date}` : "/diary");
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
      setPending(false);
    }
  }

  return (
    <form
      className="space-y-5 px-4 pt-2 pb-8"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <section className="space-y-2">
        <h2 className="px-1 text-sm font-semibold text-muted-foreground">What did you do?</h2>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="flex h-13 w-full items-center justify-between rounded-xl border bg-card px-4 text-left text-base active:bg-muted"
        >
          <span className={cn(!activity && "text-muted-foreground")}>{activity?.name ?? "Choose an activity"}</span>
          <ChevronDown className="size-5 text-muted-foreground" />
        </button>
        <div className="flex flex-wrap gap-2">
          {popular.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setActivity(a)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-colors",
                activity?.id === a.id ? "border-primary bg-primary text-primary-foreground" : "bg-card active:bg-muted",
              )}
            >
              {a.name.replace(/ \(.*\)/, "")}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="px-1 text-sm font-semibold text-muted-foreground">For how long?</h2>
        <div className="grid grid-cols-5 gap-2">
          {DURATIONS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setDuration(String(m))}
              className={cn(
                "h-11 rounded-xl border text-sm font-medium transition-colors",
                minutes === m ? "border-primary bg-primary text-primary-foreground" : "bg-card active:bg-muted",
              )}
            >
              {m}m
            </button>
          ))}
        </div>
        <Field
          label="Minutes"
          name="duration"
          inputMode="numeric"
          suffix="min"
          value={duration}
          onChange={(e) => setDuration(e.target.value.replace(/\D/g, ""))}
          error={duration !== "" && !validDuration ? "Enter 1 to 600 minutes" : undefined}
        />
      </section>

      <Field
        label="Notes (optional)"
        name="notes"
        maxLength={280}
        placeholder="e.g. 5 km run, chest and triceps"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <Panel className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs text-muted-foreground">Estimated burn</p>
          <p className="text-3xl font-semibold tracking-tight">{estimate !== null ? formatNumber(estimate) : "—"}</p>
          <p className="text-xs text-muted-foreground">kcal at {weightKg} kg</p>
        </div>
        {activity && (
          <div className="text-right text-xs text-muted-foreground">
            <p className="font-medium text-foreground">{intensity(activity.met)}</p>
            <p>MET {activity.met}</p>
          </div>
        )}
      </Panel>

      <Button type="submit" size="lg" className="h-12 w-full rounded-xl text-base" disabled={!activity || !validDuration || pending}>
        {pending ? "Saving..." : "Log workout"}
      </Button>

      <ActivityPicker open={pickerOpen} onOpenChange={setPickerOpen} activities={activities} onPick={setActivity} />
    </form>
  );
}
