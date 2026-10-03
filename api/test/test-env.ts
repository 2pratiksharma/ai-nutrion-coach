import path from "node:path";

/** Points DATABASE_URL at an isolated test database so tests never touch development data. */
export function applyTestEnv() {
  try {
    process.loadEnvFile(path.join(import.meta.dirname, "..", ".env"));
  } catch {
    // CI may provide env vars directly.
  }
  process.env.NODE_ENV = "test";
  const base = process.env.DATABASE_URL;
  if (!process.env.TEST_DATABASE_URL && base) {
    const url = new URL(base);
    url.pathname = `${url.pathname.replace(/_test$/, "")}_test`;
    process.env.TEST_DATABASE_URL = url.toString();
  }
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.JWT_SECRET ??= "test-secret-test-secret-test-secret-000";
  return process.env.DATABASE_URL!;
}
