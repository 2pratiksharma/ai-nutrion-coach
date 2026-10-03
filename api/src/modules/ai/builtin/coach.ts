import type { CoachTip } from "@nutrition/shared";
import type { CoachInput } from "../provider.js";

const EVENING = 18 * 60;
const AFTERNOON = 14 * 60;

export function coach({ name, goalType, summary, trends, localMinutes }: CoachInput): { headline: string; tips: CoachTip[] } {
  const tips: CoachTip[] = [];
  const firstName = name.split(" ")[0] || "there";
  const { consumed, targets, activity, waterMl } = summary;
  const proteinPct = targets.proteinG > 0 ? consumed.proteinG / targets.proteinG : 1;
  const caloriePct = targets.calories > 0 ? consumed.calories / targets.calories : 0;
  const nothingLogged = consumed.calories === 0;

  if (trends.streak.current >= 3) {
    tips.push({
      tone: "positive",
      title: `${trends.streak.current}-day streak`,
      body: "You've logged food every day. Consistency is what makes the numbers useful.",
    });
  }

  if (nothingLogged && localMinutes >= AFTERNOON) {
    tips.push({ tone: "tip", title: "Nothing logged yet today", body: "Add what you've eaten so far. Even a rough entry helps." });
  }

  if (!nothingLogged && localMinutes >= EVENING && proteinPct < 0.6) {
    const gap = Math.round(targets.proteinG - consumed.proteinG);
    tips.push({
      tone: "warning",
      title: `${gap} g protein to go`,
      body: "Paneer, dal, curd, eggs or soya chunks at dinner can close most of that gap.",
    });
  } else if (proteinPct >= 1) {
    tips.push({ tone: "positive", title: "Protein goal reached", body: "Nice work. That helps you keep muscle while you hit your goal." });
  }

  if (caloriePct > 1.1) {
    tips.push({
      tone: goalType === "GAIN_MUSCLE" ? "tip" : "warning",
      title: "Over your calorie goal",
      body:
        goalType === "GAIN_MUSCLE"
          ? "A small surplus is fine when building muscle. Keep protein high."
          : `You're ${consumed.calories - targets.calories} kcal over. A walk or a lighter dinner will balance it out.`,
    });
  }

  if (goalType === "LOSE_FAT" && trends.averages.loggedDays >= 5 && trends.averages.balance < -1200) {
    tips.push({
      tone: "warning",
      title: "Your deficit is very large",
      body: "Averaging more than 1,200 kcal below what you burn is hard to sustain and can cost muscle. Try eating a bit more.",
    });
  }

  if (activity.steps > 0 && activity.steps < targets.steps && localMinutes >= EVENING) {
    tips.push({
      tone: "tip",
      title: `${(targets.steps - activity.steps).toLocaleString("en-IN")} steps left`,
      body: "A 15-minute walk after dinner covers about 1,800 steps.",
    });
  } else if (activity.steps >= targets.steps) {
    tips.push({ tone: "positive", title: "Step goal done", body: `${activity.steps.toLocaleString("en-IN")} steps today.` });
  }

  if (waterMl < targets.waterMl * 0.5 && localMinutes >= AFTERNOON) {
    tips.push({ tone: "tip", title: "Drink some water", body: `You're at ${waterMl} ml of ${targets.waterMl} ml.` });
  }

  const projection = trends.weight.projection;
  if (projection.status === "on-track") {
    tips.push({
      tone: "positive",
      title: "On track for your goal weight",
      body: `At ${Math.abs(projection.weeklyRateKg)} kg a week, you'll reach ${trends.weight.target} kg around ${new Date(`${projection.projectedDate}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })}.`,
    });
  } else if (projection.status === "off-track" && trends.weight.target !== null) {
    tips.push({
      tone: "tip",
      title: "Weight isn't moving toward your goal yet",
      body: "Check your average calories on the Progress tab and adjust by 100-200 kcal a day.",
    });
  } else if (projection.status === "not-enough-data" && trends.weight.target !== null) {
    tips.push({ tone: "tip", title: "Weigh in regularly", body: "A few weigh-ins a week lets us estimate when you'll reach your goal." });
  }

  const headline = nothingLogged
    ? `Hi ${firstName}, let's get today logged.`
    : caloriePct <= 1 && proteinPct >= 0.8
      ? `Great day so far, ${firstName}.`
      : `Here's how today looks, ${firstName}.`;

  const order = { warning: 0, tip: 1, positive: 2 } as const;
  tips.sort((a, b) => order[a.tone] - order[b.tone]);
  return { headline, tips: tips.slice(0, 4) };
}
