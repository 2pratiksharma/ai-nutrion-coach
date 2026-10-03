import type { ReminderType } from "@prisma/client";
import { minutesInTimeZone, timeToMinutes, todayInTimeZone } from "@nutrition/shared";
import { prisma } from "../../infra/prisma.js";
import type { Logger } from "../../infra/logger.js";
import { DEFAULT_TIMEZONE, toDbDate } from "../../lib/day.js";
import { profileContext } from "../profile/profile.service.js";
import { reminderCopy, sendToUser } from "./reminders.service.js";

const BATCH_SIZE = 500;
// If the worker was down, don't send reminders that are more than this late.
const SEND_WINDOW_MINUTES = 60;

type Due = { userId: string; type: ReminderType; localDate: string };

export function isDue(time: string, nowMinutes: number): boolean {
  const scheduled = timeToMinutes(time);
  return nowMinutes >= scheduled && nowMinutes - scheduled < SEND_WINDOW_MINUTES;
}

/** Returns the notification body, or null when the reminder no longer applies today. */
async function messageFor({ userId, type, localDate }: Due): Promise<string | null> {
  const day = toDbDate(localDate);
  const copy = reminderCopy(type);
  switch (type) {
    case "BREAKFAST":
    case "LUNCH":
    case "DINNER": {
      const logged = await prisma.mealItem.count({ where: { meal: { userId, date: day, type } } });
      return logged > 0 ? null : copy.body;
    }
    case "WEIGH_IN": {
      const logged = await prisma.weightLog.count({ where: { userId, date: day } });
      return logged > 0 ? null : copy.body;
    }
    case "WATER": {
      const ctx = await profileContext(userId, localDate);
      const water = await prisma.waterLog.findUnique({ where: { userId_date: { userId, date: day } } });
      const remaining = ctx.targets.waterMl - (water?.amountMl ?? 0);
      return remaining <= 0 ? null : `${copy.body} ${remaining} ml to go today.`;
    }
    case "PROTEIN": {
      const ctx = await profileContext(userId, localDate);
      const totals = await prisma.mealItem.aggregate({
        where: { meal: { userId, date: day } },
        _sum: { proteinG: true },
      });
      const remaining = Math.round(ctx.targets.proteinG - (totals._sum.proteinG ?? 0));
      return remaining <= 0 ? null : `You're ${remaining} g short of your protein goal today.`;
    }
  }
}

/** Atomically marks the reminder as sent for the local day; false if another worker got it first. */
async function claim({ userId, type, localDate }: Due): Promise<boolean> {
  const day = toDbDate(localDate);
  const { count } = await prisma.reminderSetting.updateMany({
    where: { userId, type, enabled: true, OR: [{ lastSentOn: null }, { lastSentOn: { not: day } }] },
    data: { lastSentOn: day },
  });
  return count === 1;
}

export async function dispatchDueReminders(log: Logger, now = new Date()) {
  let cursor: { userId: string; type: ReminderType } | undefined;
  let sent = 0;

  for (;;) {
    const batch = await prisma.reminderSetting.findMany({
      where: { enabled: true, user: { pushSubscriptions: { some: {} } } },
      include: { user: { select: { profile: { select: { timezone: true } } } } },
      orderBy: [{ userId: "asc" }, { type: "asc" }],
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { userId_type: cursor } } : {}),
    });
    if (batch.length === 0) break;
    cursor = { userId: batch.at(-1)!.userId, type: batch.at(-1)!.type };

    for (const reminder of batch) {
      const timeZone = reminder.user.profile?.timezone ?? DEFAULT_TIMEZONE;
      const localDate = todayInTimeZone(timeZone, now);
      if (reminder.lastSentOn && reminder.lastSentOn.getTime() === toDbDate(localDate).getTime()) continue;
      if (!isDue(reminder.time, minutesInTimeZone(timeZone, now))) continue;

      const due = { userId: reminder.userId, type: reminder.type, localDate };
      try {
        if (!(await claim(due))) continue;
        const body = await messageFor(due);
        if (!body) continue;
        const delivered = await sendToUser(due.userId, {
          title: reminderCopy(due.type).label,
          body,
          url: due.type === "WEIGH_IN" ? "/diary?sheet=weight" : "/diary",
          tag: `reminder-${due.type}`,
        });
        sent += delivered;
      } catch (err) {
        log.error({ err, userId: due.userId, type: due.type }, "reminder dispatch failed");
      }
    }

    if (batch.length < BATCH_SIZE) break;
  }

  return { sent };
}
