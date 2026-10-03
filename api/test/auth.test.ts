import { afterEach, describe, expect, it, vi } from "vitest";
import { mailer } from "../src/infra/mailer.js";
import { PASSWORD, app, onboardedUser, request, signup, uniqueEmail } from "./helpers.js";

afterEach(() => vi.restoreAllMocks());

function captureResetToken() {
  const send = vi.spyOn(mailer, "send").mockResolvedValue();
  return () => {
    const text = send.mock.calls.at(-1)?.[0].text ?? "";
    return new URL(text.match(/https?:\/\/\S+/)![0]).searchParams.get("token")!;
  };
}

describe("signup and login", () => {
  it("rejects unauthenticated requests with a readable error", async () => {
    const res = await request(app).get("/api/v1/summary");
    expect(res.status).toBe(401);
    expect(res.body.error).toBeTruthy();
  });

  it("creates an account and reports a missing profile", async () => {
    const { agent, email } = await signup("auth");
    const session = await agent.get("/api/v1/auth/session");
    expect(session.body).toMatchObject({ user: { email, name: "Test User" }, hasProfile: false });

    const dup = await request(app).post("/api/v1/auth/signup").send({ name: "Dup", email, password: PASSWORD });
    expect(dup.status).toBe(409);
    expect(dup.body.field).toBe("email");
  });

  it("logs in case-insensitively and supports bearer tokens", async () => {
    const { email } = await signup("login");
    const bad = await request(app).post("/api/v1/auth/login").send({ email, password: "wrong-password" });
    expect(bad.status).toBe(401);

    const good = await request(app).post("/api/v1/auth/login").send({ email: email.toUpperCase(), password: PASSWORD });
    expect(good.status).toBe(200);
    expect(good.headers["set-cookie"][0]).toMatch(/HttpOnly/);

    const me = await request(app).get("/api/v1/auth/session").set("Authorization", `Bearer ${good.body.token}`);
    expect(me.status).toBe(200);
  });

  it("returns field-level validation errors", async () => {
    const res = await request(app).post("/api/v1/auth/signup").send({ name: "X", email: "nope", password: "short" });
    expect(res.status).toBe(400);
    expect(res.body.field).toBe("email");
  });

  it("logs out by clearing the cookie", async () => {
    const { agent } = await signup("logout");
    await agent.post("/api/v1/auth/logout").expect(204);
    await agent.get("/api/v1/auth/session").expect(401);
  });
});

describe("password reset", () => {
  it("does not reveal whether an email exists", async () => {
    const send = vi.spyOn(mailer, "send").mockResolvedValue();
    const res = await request(app).post("/api/v1/auth/forgot-password").send({ email: uniqueEmail("ghost") });
    expect(res.status).toBe(202);
    expect(send).not.toHaveBeenCalled();
  });

  it("resets the password once and signs out old sessions", async () => {
    const tokenFromEmail = captureResetToken();
    const { agent, email } = await signup("reset");

    await request(app).post("/api/v1/auth/forgot-password").send({ email }).expect(202);
    const token = tokenFromEmail();

    const reset = await request(app).post("/api/v1/auth/reset-password").send({ token, password: "brand-new-pass" });
    expect(reset.status).toBe(200);
    expect(reset.body.token).toBeTruthy();

    await agent.get("/api/v1/auth/session").expect(401);
    await request(app).post("/api/v1/auth/login").send({ email, password: PASSWORD }).expect(401);
    await request(app).post("/api/v1/auth/login").send({ email, password: "brand-new-pass" }).expect(200);

    const reused = await request(app).post("/api/v1/auth/reset-password").send({ token, password: "another-pass-1" });
    expect(reused.status).toBe(400);
  });

  it("only honours the latest reset link", async () => {
    const tokenFromEmail = captureResetToken();
    const { email } = await signup("reset-twice");
    await request(app).post("/api/v1/auth/forgot-password").send({ email });
    const first = tokenFromEmail();
    await request(app).post("/api/v1/auth/forgot-password").send({ email });

    const res = await request(app).post("/api/v1/auth/reset-password").send({ token: first, password: "brand-new-pass" });
    expect(res.status).toBe(400);
  });
});

describe("account settings", () => {
  it("updates the name without a password but requires one to change email", async () => {
    const { agent } = await signup("account");
    const renamed = await agent.patch("/api/v1/account").send({ name: "Priya Sharma" });
    expect(renamed.body.name).toBe("Priya Sharma");

    const newEmail = uniqueEmail("renamed");
    const noPassword = await agent.patch("/api/v1/account").send({ email: newEmail });
    expect(noPassword.status).toBe(400);
    expect(noPassword.body.field).toBe("currentPassword");

    const changed = await agent.patch("/api/v1/account").send({ email: newEmail, currentPassword: PASSWORD });
    expect(changed.body.email).toBe(newEmail);
  });

  it("rejects an email that belongs to someone else", async () => {
    const other = await signup("taken");
    const { agent } = await signup("taker");
    const res = await agent.patch("/api/v1/account").send({ email: other.email, currentPassword: PASSWORD });
    expect(res.status).toBe(409);
  });

  it("changes the password, keeping this device signed in and signing out others", async () => {
    const { agent, email } = await signup("pw");
    const otherDevice = request.agent(app);
    await otherDevice.post("/api/v1/auth/login").send({ email, password: PASSWORD }).expect(200);

    await agent.post("/api/v1/account/password").send({ currentPassword: "wrong", newPassword: "new-password-1" }).expect(403);
    await agent.post("/api/v1/account/password").send({ currentPassword: PASSWORD, newPassword: "new-password-1" }).expect(204);

    await agent.get("/api/v1/auth/session").expect(200);
    await otherDevice.get("/api/v1/auth/session").expect(401);
  });

  it("deletes the account and all its data", async () => {
    const { agent, email } = await onboardedUser("delete");
    await agent.post("/api/v1/foods").send({
      name: "My dosa",
      servingLabel: "1 dosa",
      servingGrams: 90,
      caloriesPer100g: 170,
      proteinPer100g: 4,
      carbsPer100g: 28,
      fatPer100g: 5,
    });
    const food = (await agent.get("/api/v1/foods?scope=mine")).body[0];
    await agent.post("/api/v1/meals/items").send({ foodId: food.id, quantityG: 90, type: "BREAKFAST" }).expect(201);

    await agent.delete("/api/v1/account").send({ password: "wrong" }).expect(403);
    await agent.delete("/api/v1/account").send({ password: PASSWORD }).expect(204);
    await request(app).post("/api/v1/auth/login").send({ email, password: PASSWORD }).expect(401);
  });
});
