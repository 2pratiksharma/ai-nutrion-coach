import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./infra/logger.js";
import { prisma } from "./infra/prisma.js";

const server = createApp().listen(env.PORT, () => {
  logger.info(`API listening on http://localhost:${env.PORT}`);
});

// Keep-alive must outlive the load balancer's idle timeout to avoid 502s on reused sockets.
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "shutting down");
  const forceExit = setTimeout(() => process.exit(1), 10_000).unref();
  server.close(async () => {
    await prisma.$disconnect();
    clearTimeout(forceExit);
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("unhandledRejection", (err) => logger.error({ err }, "unhandled rejection"));
