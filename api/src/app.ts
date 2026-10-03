import { randomUUID } from "node:crypto";
import express, { Router } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./infra/logger.js";
import { prisma } from "./infra/prisma.js";
import { requireAuth } from "./http/auth.js";
import { apiLimiter } from "./http/rate-limit.js";
import { errorHandler, notFoundHandler } from "./http/error-handler.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { accountRouter } from "./modules/account/account.routes.js";
import { profileRouter } from "./modules/profile/profile.routes.js";
import { foodsRouter } from "./modules/foods/foods.routes.js";
import { mealsRouter } from "./modules/meals/meals.routes.js";
import { activitiesRouter, exercisesRouter } from "./modules/activity/activity.routes.js";
import { stepsRouter, waterRouter, weightsRouter } from "./modules/body/body.routes.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { summaryRouter, trendsRouter } from "./modules/insights/insights.routes.js";
import { remindersRouter } from "./modules/reminders/reminders.routes.js";
import { dispatchDueReminders } from "./modules/reminders/reminder-dispatcher.js";
import { aiRouter } from "./modules/ai/ai.routes.js";

function v1Router() {
  const v1 = Router();
  v1.use("/auth", authRouter);

  const authed = Router();
  authed.use(requireAuth, apiLimiter);
  authed.use("/account", accountRouter);
  authed.use("/profile", profileRouter);
  authed.use("/foods", foodsRouter);
  authed.use("/meals", mealsRouter);
  authed.use("/activities", activitiesRouter);
  authed.use("/exercises", exercisesRouter);
  authed.use("/weights", weightsRouter);
  authed.use("/steps", stepsRouter);
  authed.use("/water", waterRouter);
  authed.use("/health", healthRouter);
  authed.use("/summary", summaryRouter);
  authed.use("/trends", trendsRouter);
  authed.use("/reminders", remindersRouter);
  authed.use("/ai", aiRouter);
  v1.use(authed);

  return v1;
}

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", env.TRUST_PROXY);

  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const id = (req.headers["x-request-id"] as string | undefined)?.slice(0, 100) || randomUUID();
        res.setHeader("x-request-id", id);
        return id;
      },
      autoLogging: { ignore: (req) => req.url === "/health" || req.url === "/ready" },
      serializers: {
        req: (req) => ({ id: req.id, method: req.method, url: req.url }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    }),
  );
  app.use(helmet());
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  app.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });
  app.get("/ready", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ ok: true });
    } catch {
      res.status(503).json({ ok: false });
    }
  });

  // External cron trigger: lets a free scheduler (cron-job.org) run reminder dispatch
  // without a long-lived worker. Also keeps the service warm on free hosts that sleep.
  app.post("/cron/dispatch-reminders", async (req, res) => {
    if (!env.CRON_SECRET || req.header("x-cron-secret") !== env.CRON_SECRET) {
      res.status(404).end();
      return;
    }
    const { sent } = await dispatchDueReminders(logger.child({ component: "cron" }));
    res.json({ ok: true, sent });
  });

  app.use("/api/v1", v1Router());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
