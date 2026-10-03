import { describe, expect, it } from "vitest";
import { onboardedUser } from "./helpers.js";

/** A Saturday, so the Monday-start week is 2026-01-05 to 2026-01-11. */
const DATE = "2026-01-10";
const at = (time: string) => `${DATE}T${time}:00+05:30`;

const sample = (over: Record<string, unknown>) => ({
  type: "STEPS",
  source: "HEALTH_CONNECT",
  startAt: at("07:00"),
  endAt: at("07:30"),
  value: 3000,
  ...over,
});

describe("heart points", () => {
  it("scores a workout by intensity and carries it into the week", async () => {
    const { agent } = await onboardedUser("hp-workout");
    // 40 minutes of moderate yoga (4.0 MET) is 40 points; 20 of running (9.8 MET) is 40 more.
    await agent.post("/api/v1/exercises").send({ activityId: "yoga-power", durationMin: 40, date: DATE }).expect(201);
    await agent.post("/api/v1/exercises").send({ activityId: "running-10", durationMin: 20, date: DATE }).expect(201);

    const day = (await agent.get(`/api/v1/health/day?date=${DATE}`)).body;
    expect(day).toMatchObject({ date: DATE, heartPoints: 80, exerciseMinutes: 60, exerciseCount: 2 });

    const week = (await agent.get(`/api/v1/health/week?date=${DATE}`)).body;
    expect(week).toMatchObject({ from: "2026-01-05", to: "2026-01-11", heartPoints: 80, workoutDays: 1 });
    expect(week.days).toHaveLength(7);
    // Saturday is the sixth day, so a steady week would be ~129 points in by now.
    expect(week.pacing).toMatchObject({ target: 150, remaining: 70, daysLeft: 2, perDay: 35, status: "behind" });
  });

  it("gives light activity no points", async () => {
    const { agent } = await onboardedUser("hp-light");
    await agent.post("/api/v1/exercises").send({ activityId: "stretching", durationMin: 30, date: DATE }).expect(201);
    expect((await agent.get(`/api/v1/health/day?date=${DATE}`)).body.heartPoints).toBe(0);
  });
});

describe("resolving overlapping sources", () => {
  it("doesn't count the steps from a logged walk twice", async () => {
    const { agent } = await onboardedUser("dedup-steps");
    await agent.put("/api/v1/steps").send({ date: DATE, steps: 10_000 }).expect(200);
    const before = (await agent.get(`/api/v1/health/day?date=${DATE}`)).body;

    // A 60-minute walk at ~110 steps/min accounts for 6,600 of those steps.
    await agent.post("/api/v1/exercises").send({ activityId: "walking-moderate", durationMin: 60, date: DATE });
    const after = (await agent.get(`/api/v1/health/day?date=${DATE}`)).body;

    expect(after.steps).toBe(10_000);
    expect(after.countedSteps).toBe(10_000 - 60 * 110);
    expect(after.breakdown.steps).toBeLessThan(before.breakdown.steps);
    // The walk's own calories replace the step estimate rather than stacking on top of it.
    expect(after.activeKcal).toBeLessThan(before.activeKcal + after.breakdown.exercise);
  });

  it("prefers what you entered yourself over what a device reports", async () => {
    const { agent } = await onboardedUser("source-priority");
    await agent
      .post("/api/v1/health/samples")
      .send({ samples: [sample({ value: 8000, externalId: "hc-1" })] })
      .expect(201);
    expect((await agent.get(`/api/v1/health/day?date=${DATE}`)).body).toMatchObject({
      steps: 8000,
      stepSource: "HEALTH_CONNECT",
    });

    await agent.put("/api/v1/steps").send({ date: DATE, steps: 6000 }).expect(200);
    expect((await agent.get(`/api/v1/health/day?date=${DATE}`)).body).toMatchObject({
      steps: 6000,
      stepSource: "MANUAL",
    });
  });

  it("never sums two devices for the same day", async () => {
    const { agent } = await onboardedUser("two-devices");
    await agent
      .post("/api/v1/health/samples")
      .send({
        samples: [
          sample({ source: "HEALTH_CONNECT", value: 9000, externalId: "hc-1" }),
          sample({ source: "STRAVA", value: 4000, externalId: "st-1" }),
        ],
      })
      .expect(201);
    const day = (await agent.get(`/api/v1/health/day?date=${DATE}`)).body;
    expect(day.steps).toBe(9000);
    expect(day.stepSource).toBe("HEALTH_CONNECT");
  });

  it("only counts a device's active energy beyond the workouts you logged", async () => {
    const { agent } = await onboardedUser("device-energy");
    // Running for 30 min burns ~382 kcal at 78 kg.
    await agent.post("/api/v1/exercises").send({ activityId: "running-10", durationMin: 30, date: DATE });
    await agent
      .post("/api/v1/health/samples")
      .send({
        samples: [
          sample({ type: "ACTIVE_ENERGY", source: "BLE_DEVICE", value: 500, endAt: at("23:00"), externalId: "ble-1" }),
        ],
      })
      .expect(201);

    const day = (await agent.get(`/api/v1/health/day?date=${DATE}`)).body;
    expect(day.breakdown.exercise).toBe(382);
    expect(day.breakdown.device).toBe(118); // 500 reported minus the 382 already attributed
    expect(day.activeKcal).toBe(500);
  });

  it("measures heart points from cadence when samples carry timing", async () => {
    const { agent } = await onboardedUser("cadence");
    await agent
      .post("/api/v1/health/samples")
      .send({
        samples: [
          // 20 minutes at 120 steps/min: brisk, so 20 points.
          sample({ value: 2400, startAt: at("07:00"), endAt: at("07:20"), externalId: "brisk" }),
          // 30 minutes at 40 steps/min: pottering about, no points.
          sample({ value: 1200, startAt: at("18:00"), endAt: at("18:30"), externalId: "amble" }),
        ],
      })
      .expect(201);
    expect((await agent.get(`/api/v1/health/day?date=${DATE}`)).body).toMatchObject({ steps: 3600, heartPoints: 20 });
  });
});

describe("sample ingest", () => {
  it("ignores records it has already stored", async () => {
    const { agent } = await onboardedUser("resync");
    const samples = [sample({ externalId: "same-id" })];
    expect((await agent.post("/api/v1/health/samples").send({ samples })).body).toMatchObject({
      accepted: 1,
      duplicates: 0,
      days: [DATE],
    });
    expect((await agent.post("/api/v1/health/samples").send({ samples })).body).toMatchObject({
      accepted: 0,
      duplicates: 1,
    });
    expect((await agent.get(`/api/v1/health/day?date=${DATE}`)).body.steps).toBe(3000);
  });

  it("rejects malformed batches", async () => {
    const { agent } = await onboardedUser("bad-samples");
    await agent.post("/api/v1/health/samples").send({ samples: [] }).expect(400);
    await agent.post("/api/v1/health/samples").send({ samples: [sample({ source: "MANUAL" })] }).expect(400);
    await agent
      .post("/api/v1/health/samples")
      .send({ samples: [sample({ startAt: at("09:00"), endAt: at("08:00") })] })
      .expect(400);
  });

  it("keeps each user's samples to themselves", async () => {
    const [mine, theirs] = await Promise.all([onboardedUser("mine"), onboardedUser("theirs")]);
    await mine.agent.post("/api/v1/health/samples").send({ samples: [sample({ externalId: "x" })] }).expect(201);
    expect((await theirs.agent.get(`/api/v1/health/day?date=${DATE}`)).body.steps).toBe(0);
  });
});

describe("movement goals", () => {
  it("updates one goal at a time", async () => {
    const { agent } = await onboardedUser("goals");
    const res = await agent.patch("/api/v1/profile/goals").send({ stepTarget: 12_000 }).expect(200);
    expect(res.body.targets).toMatchObject({ steps: 12_000, activeKcal: 450, heartPointsWeekly: 150 });

    await agent.patch("/api/v1/profile/goals").send({ heartPointsTarget: 200 }).expect(200);
    const profile = (await agent.get("/api/v1/profile")).body;
    expect(profile.targets).toMatchObject({ steps: 12_000, heartPointsWeekly: 200 });

    await agent.patch("/api/v1/profile/goals").send({}).expect(400);
    await agent.patch("/api/v1/profile/goals").send({ workoutDaysTarget: 9 }).expect(400);
  });

  it("paces the week against the goal", async () => {
    const { agent } = await onboardedUser("pacing");
    await agent.patch("/api/v1/profile/goals").send({ heartPointsTarget: 140 }).expect(200);
    await agent.post("/api/v1/exercises").send({ activityId: "running-10", durationMin: 60, date: "2026-01-05" });

    const week = (await agent.get(`/api/v1/health/week?date=${DATE}`)).body;
    expect(week.heartPoints).toBe(120);
    expect(week.pacing).toMatchObject({ target: 140, remaining: 20, perDay: 10 });
  });
});
