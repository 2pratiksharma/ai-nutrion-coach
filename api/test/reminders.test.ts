import { afterEach, describe, expect, it, vi } from "vitest";
import { todayInTimeZone } from "@nutrition/shared";
import { logger } from "../src/infra/logger.js";
import { prisma } from "../src/infra/prisma.js";
import { push } from "../src/infra/push.js";
import { dispatchDueReminders, isDue } from "../src/modules/reminders/reminder-dispatcher.js";
import { onboardedUser } from "./helpers.js";

const subscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/test-device",
  keys: { p256dh: "BPub", auth: "secret" },
};

afterEach(() => vi.restoreAllMocks());

describe("reminder settings", () => {
  it("returns defaults and saves changes", async () => {
    const { agent } = await onboardedUser("reminders");
    const initial = (await agent.get("/api/v1/reminders")).body;
    expect(initial.reminders).toHaveLength(6);
    expect(initial.reminders.every((r: { enabled: boolean }) => !r.enabled)).toBe(true);
    expect(initial.timezone).toBe("Asia/Kolkata");

    const saved = await agent.put("/api/v1/reminders").send({
      reminders: [
        { type: "LUNCH", enabled: true, time: "13:00" },
        { type: "WEIGH_IN", enabled: true, time: "07:15" },
      ],
    });
    expect(saved.status).toBe(200);
    const lunch = saved.body.reminders.find((r: { type: string }) => r.type === "LUNCH");
    expect(lunch).toEqual({ type: "LUNCH", enabled: true, time: "13:00" });

    await agent.put("/api/v1/reminders").send({ reminders: [{ type: "LUNCH", enabled: true, time: "25:00" }] }).expect(400);
  });

  it("only accepts subscriptions from real push services", async () => {
    const { agent } = await onboardedUser("subs");
    await agent.post("/api/v1/reminders/subscriptions").send(subscription).expect(204);
    await agent.post("/api/v1/reminders/subscriptions").send(subscription).expect(204);
    await agent
      .post("/api/v1/reminders/subscriptions")
      .send({ ...subscription, endpoint: "http://169.254.169.254/latest/meta-data" })
      .expect(400);
    expect((await agent.get("/api/v1/reminders")).body.push.subscriptions).toBe(1);

    await agent.delete("/api/v1/reminders/subscriptions").send({ endpoint: subscription.endpoint }).expect(204);
    expect((await agent.get("/api/v1/reminders")).body.push.subscriptions).toBe(0);
  });
});

describe("isDue", () => {
  it("fires within an hour after the scheduled time", () => {
    expect(isDue("13:00", 13 * 60 - 1)).toBe(false);
    expect(isDue("13:00", 13 * 60)).toBe(true);
    expect(isDue("13:00", 13 * 60 + 59)).toBe(true);
    expect(isDue("13:00", 14 * 60)).toBe(false);
  });
});

describe("dispatcher", () => {
  async function userWithReminders(label: string, endpointSuffix: string) {
    const user = await onboardedUser(label);
    await user.agent
      .post("/api/v1/reminders/subscriptions")
      .send({ ...subscription, endpoint: `${subscription.endpoint}-${endpointSuffix}` })
      .expect(204);
    // Due right now in the user's timezone, whatever time the test runs.
    const minutes = new Date().getUTCHours() * 60 + new Date().getUTCMinutes() + 330;
    const local = ((minutes % 1440) + 1440) % 1440;
    const time = `${String(Math.floor(local / 60)).padStart(2, "0")}:${String(local % 60).padStart(2, "0")}`;
    await user.agent
      .put("/api/v1/reminders")
      .send({
        reminders: [
          { type: "LUNCH", enabled: true, time },
          { type: "DINNER", enabled: true, time },
          { type: "WATER", enabled: true, time },
        ],
      })
      .expect(200);
    return user;
  }

  it("sends each due reminder once, skipping ones that no longer apply", async () => {
    const send = vi.spyOn(push, "send").mockResolvedValue("sent");

    const { agent, userId } = await userWithReminders("dispatch", "a");
    await agent.post("/api/v1/meals/items").send({ foodId: "Dal tadka", quantityG: 150, type: "LUNCH" }).expect(201);

    await dispatchDueReminders(logger);
    const mine = send.mock.calls.filter(([target]) => target.endpoint.endsWith("-a"));
    const titles = mine.map(([, payload]) => payload.title).sort();
    expect(titles).toEqual(["Drink water", "Log dinner"]);
    expect(mine.find(([, p]) => p.title === "Drink water")![1].body).toContain("2500 ml to go");

    await dispatchDueReminders(logger);
    expect(send.mock.calls.filter(([target]) => target.endpoint.endsWith("-a"))).toHaveLength(2);

    const today = todayInTimeZone("Asia/Kolkata");
    const lunch = await prisma.reminderSetting.findUnique({ where: { userId_type: { userId, type: "LUNCH" } } });
    expect(lunch?.lastSentOn?.toISOString().slice(0, 10)).toBe(today);
  });

  it("removes subscriptions the push service reports as gone", async () => {
    vi.spyOn(push, "send").mockResolvedValue("gone");
    const { agent } = await userWithReminders("gone", "b");
    await dispatchDueReminders(logger);
    expect((await agent.get("/api/v1/reminders")).body.push.subscriptions).toBe(0);
  });
});
