import { randomUUID } from "node:crypto";
import request from "supertest";
import type { ProfileInput, ProfileResponse } from "@nutrition/shared";
import { createApp } from "../src/app.js";

export const app = createApp();
export type Agent = ReturnType<typeof request.agent>;

export const PASSWORD = "password123";

export function uniqueEmail(label: string) {
  return `${label}-${randomUUID().slice(0, 8)}@test.local`;
}

export async function signup(label = "user", name = "Test User") {
  const email = uniqueEmail(label);
  const agent = request.agent(app);
  const res = await agent.post("/api/v1/auth/signup").send({ name, email, password: PASSWORD });
  if (res.status !== 201) throw new Error(`signup failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { agent, email, token: res.body.token as string, userId: res.body.user.id as string };
}

export const baseProfile: ProfileInput = {
  sex: "MALE",
  age: 28,
  heightCm: 175,
  startWeightKg: 78,
  targetWeightKg: 72,
  activityLevel: "MODERATE",
  dietPreference: "VEG",
  goalType: "MAINTAIN",
  timezone: "Asia/Kolkata",
};

export async function onboard(agent: Agent, overrides: Partial<ProfileInput> = {}) {
  const res = await agent.put("/api/v1/profile").send({ ...baseProfile, ...overrides });
  if (res.status !== 201) throw new Error(`onboard failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body as ProfileResponse;
}

export async function onboardedUser(label = "user", overrides: Partial<ProfileInput> = {}) {
  const user = await signup(label);
  const profile = await onboard(user.agent, overrides);
  return { ...user, profile };
}

export { request };
