import { z } from "zod";

const boolean = z.enum(["true", "false"]).transform((v) => v === "true");

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().min(1),
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
    WEB_ORIGIN: z.url().default("http://localhost:3000"),
    // Public URL of the web app, used in emailed links. Defaults to WEB_ORIGIN.
    APP_URL: z.url().optional(),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
    TRUST_PROXY: z.coerce.number().int().min(0).default(1),
    MAIL_DRIVER: z.enum(["console"]).default("console"),
    AI_PROVIDER: z.enum(["builtin"]).default("builtin"),
    VAPID_PUBLIC_KEY: z.string().optional(),
    VAPID_PRIVATE_KEY: z.string().optional(),
    VAPID_SUBJECT: z.string().default("mailto:admin@example.com"),
    REMINDER_POLL_SECONDS: z.coerce.number().int().min(10).max(600).default(60),
    RATE_LIMIT_ENABLED: boolean.optional(),
    CRON_SECRET: z.string().min(16).optional(),
  })
  .transform((env) => ({
    ...env,
    APP_URL: env.APP_URL ?? env.WEB_ORIGIN,
    RATE_LIMIT_ENABLED: env.RATE_LIMIT_ENABLED ?? env.NODE_ENV !== "test",
    isProduction: env.NODE_ENV === "production",
    pushConfigured: Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY),
  }));

function load() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  return parsed.data;
}

export const env = load();
export type Env = typeof env;
