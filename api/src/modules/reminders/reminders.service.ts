import {
  REMINDER_TYPES,
  REMINDER_TYPE_VALUES,
  type ReminderSetting,
  type RemindersResponse,
  type ReminderType,
} from "@nutrition/shared";
import { prisma } from "../../infra/prisma.js";
import { push } from "../../infra/push.js";
import { HttpError } from "../../http/errors.js";
import { userTimeZone } from "../../lib/day.js";

export async function getReminders(userId: string): Promise<RemindersResponse> {
  const [rows, subscriptions, timezone] = await Promise.all([
    prisma.reminderSetting.findMany({ where: { userId } }),
    prisma.pushSubscription.count({ where: { userId } }),
    userTimeZone(userId),
  ]);
  const byType = new Map(rows.map((r) => [r.type, r]));
  const reminders: ReminderSetting[] = REMINDER_TYPE_VALUES.map((type) => {
    const row = byType.get(type);
    return { type, enabled: row?.enabled ?? false, time: row?.time ?? REMINDER_TYPES[type].defaultTime };
  });
  return {
    reminders,
    push: { configured: push.configured, publicKey: push.publicKey, subscriptions },
    timezone,
  };
}

export async function saveReminders(userId: string, reminders: ReminderSetting[]): Promise<RemindersResponse> {
  await prisma.$transaction(
    reminders.map((r) =>
      prisma.reminderSetting.upsert({
        where: { userId_type: { userId, type: r.type } },
        create: { userId, type: r.type, enabled: r.enabled, time: r.time },
        update: { enabled: r.enabled, time: r.time },
      }),
    ),
  );
  return getReminders(userId);
}

export async function subscribe(userId: string, sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  // An endpoint belongs to one browser; if another account used it before, it moves to this one.
  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: { userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    update: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
  });
}

export async function unsubscribe(userId: string, endpoint: string) {
  await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
}

export async function sendToUser(userId: string, payload: { title: string; body: string; url: string; tag?: string }) {
  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  let sent = 0;
  for (const sub of subscriptions) {
    const result = await push.send(sub, payload);
    if (result === "sent") sent++;
    if (result === "gone") await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
  }
  return sent;
}

export async function sendTest(userId: string) {
  if (!push.configured) throw new HttpError(503, "Push notifications aren't configured on the server");
  const sent = await sendToUser(userId, {
    title: "Notifications are on",
    body: "You'll get your reminders here.",
    url: "/me/reminders",
    tag: "test",
  });
  if (sent === 0) throw new HttpError(409, "No devices are subscribed. Enable notifications on this device first.");
  return { sent };
}

export const reminderCopy = (type: ReminderType) => REMINDER_TYPES[type];
