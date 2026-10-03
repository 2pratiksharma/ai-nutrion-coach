import { CircleAlert, CircleCheck, Lightbulb, Sparkles } from "lucide-react";
import type { CoachResponse, CoachTip } from "@nutrition/shared";
import { Panel } from "@/components/common/layout";

const TONE: Record<CoachTip["tone"], { icon: typeof CircleCheck; label: string; className: string }> = {
  warning: { icon: CircleAlert, label: "Heads up", className: "text-warning" },
  tip: { icon: Lightbulb, label: "Tip", className: "text-muted-foreground" },
  positive: { icon: CircleCheck, label: "Nice", className: "text-success" },
};

export function CoachCard({ coach }: { coach: CoachResponse }) {
  return (
    <Panel className="overflow-hidden">
      <div className="flex items-center gap-2 border-b bg-accent/60 px-4 py-3">
        <Sparkles className="size-4 text-primary" />
        <p className="text-sm font-semibold">{coach.headline}</p>
      </div>
      {coach.tips.length === 0 ? (
        <p className="px-4 py-3 text-sm text-muted-foreground">Keep logging and your coach will have more to say.</p>
      ) : (
        <ul className="divide-y">
          {coach.tips.map((tip) => {
            const tone = TONE[tip.tone];
            const Icon = tone.icon;
            return (
              <li key={tip.title} className="flex gap-3 px-4 py-3">
                <Icon className={`mt-0.5 size-5 shrink-0 ${tone.className}`} aria-label={tone.label} />
                <div>
                  <p className="text-sm font-medium">{tip.title}</p>
                  <p className="text-sm text-muted-foreground">{tip.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
