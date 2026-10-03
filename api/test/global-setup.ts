import { execFileSync } from "node:child_process";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { applyTestEnv } from "./test-env.js";

const apiRoot = path.join(import.meta.dirname, "..");

/** Creates, migrates and seeds the test database once per run. */
export default async function setup() {
  const testUrl = new URL(applyTestEnv());
  const dbName = testUrl.pathname.slice(1);
  if (!/^[a-z0-9_]+_test$/i.test(dbName)) throw new Error(`Refusing to use "${dbName}" as a test database`);

  const adminUrl = new URL(testUrl);
  adminUrl.pathname = "/postgres";
  const admin = new PrismaClient({ datasourceUrl: adminUrl.toString() });
  try {
    const existing = await admin.$queryRaw<unknown[]>`SELECT 1 FROM pg_database WHERE datname = ${dbName}`;
    if (existing.length === 0) await admin.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
  } finally {
    await admin.$disconnect();
  }

  const env = { ...process.env, DATABASE_URL: testUrl.toString() };
  const run = (args: string[]) => execFileSync("npx", args, { cwd: apiRoot, env, stdio: "pipe" });
  run(["prisma", "migrate", "deploy"]);
  run(["tsx", "prisma/seed.ts"]);

  const db = new PrismaClient({ datasourceUrl: testUrl.toString() });
  try {
    // Start from a clean slate of user data (custom foods cascade); the catalogs stay seeded.
    await db.user.deleteMany();
  } finally {
    await db.$disconnect();
  }
}
