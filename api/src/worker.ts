import { env } from "./config/env.js";
import { logger } from "./infra/logger.js";
import { prisma } from "./infra/prisma.js";
import { dispatchDueReminders } from "./modules/reminders/reminder-dispatcher.js";

/**
 * Background worker for scheduled jobs. Runs as its own process so it scales independently of
 * the API; several replicas are safe because each reminder is claimed atomically.
 */
const log = logger.child({ component: "worker" });

let running = true;
let current: Promise<unknown> = Promise.resolve();

async function tick() {
  if (!env.pushConfigured) return;
  const started = Date.now();
  const { sent } = await dispatchDueReminders(log);
  if (sent > 0) log.info({ sent, ms: Date.now() - started }, "reminders sent");
}

async function loop() {
  if (!env.pushConfigured) {
    log.warn("VAPID keys not set; reminders are disabled. Run `npm run push:keys -w api` to generate them.");
  }
  log.info({ pollSeconds: env.REMINDER_POLL_SECONDS }, "worker started");
  while (running) {
    current = tick().catch((err) => log.error({ err }, "worker tick failed"));
    await current;
    await new Promise((resolve) => setTimeout(resolve, env.REMINDER_POLL_SECONDS * 1000));
  }
}

async function shutdown(signal: string) {
  log.info({ signal }, "worker stopping");
  running = false;
  await current;
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

void loop();
