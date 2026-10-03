"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Dumbbell, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { addDays, type ExerciseLog } from "@nutrition/shared";
import { Panel } from "@/components/common/layout";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { formatNumber } from "@/lib/format";

export function CopyYesterdayButton({ date }: { date: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function copy() {
    setPending(true);
    try {
      const { copied } = await api.meals.copy({ fromDate: addDays(date, -1), toDate: date });
      toast.success(`Copied ${copied} ${copied === 1 ? "item" : "items"} from the day before`);
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant="outline" className="h-11 w-full rounded-xl" disabled={pending} onClick={() => void copy()}>
      <Copy />
      {pending ? "Copying..." : "Copy meals from the day before"}
    </Button>
  );
}

export function WorkoutList({ exercises, date, isToday }: { exercises: ExerciseLog[]; date: string; isToday: boolean }) {
  const router = useRouter();
  const [removing, setRemoving] = useState<string | null>(null);
  const total = exercises.reduce((s, e) => s + e.caloriesBurned, 0);

  async function remove(ex: ExerciseLog) {
    setRemoving(ex.id);
    try {
      await api.activity.remove(ex.id);
      toast.success(`Removed ${ex.activity.name}`);
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setRemoving(null);
    }
  }

  return (
    <Panel className="overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        <span className="text-xl" aria-hidden>
          🏃
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold">Workouts</h2>
          <p className="text-xs text-muted-foreground">
            {exercises.length ? `${formatNumber(total)} kcal burned` : "No workouts logged"}
          </p>
        </div>
        <Link
          href={isToday ? "/log/workout" : `/log/workout?date=${date}`}
          aria-label="Log a workout"
          className="grid size-10 place-items-center rounded-full bg-secondary text-secondary-foreground active:opacity-80"
        >
          <Dumbbell className="size-5" />
        </Link>
      </div>
      {exercises.length > 0 && (
        <ul className="divide-y border-t">
          {exercises.map((ex) => (
            <li key={ex.id} className="flex min-h-14 items-center gap-3 px-4 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{ex.activity.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {ex.durationMin} min{ex.notes ? ` · ${ex.notes}` : ""}
                </p>
              </div>
              <span className="text-sm tabular-nums">{formatNumber(ex.caloriesBurned)}</span>
              <button
                type="button"
                aria-label={`Remove ${ex.activity.name}`}
                disabled={removing === ex.id}
                onClick={() => void remove(ex)}
                className="grid size-10 place-items-center rounded-full text-muted-foreground active:bg-muted disabled:opacity-40"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
