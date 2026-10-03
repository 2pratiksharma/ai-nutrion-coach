import { Router } from "express";
import { dateQuerySchema, healthSamplesSchema } from "@nutrition/shared";
import { authedRoute } from "../../http/router.js";
import * as health from "./health.service.js";

export const healthRouter = Router();

healthRouter.get(
  "/day",
  authedRoute({ query: dateQuerySchema }, ({ userId, query }) => health.getDayActivity(userId, query.date)),
);

healthRouter.get(
  "/week",
  authedRoute({ query: dateQuerySchema }, ({ userId, query }) => health.getWeekActivity(userId, query.date)),
);

/** Batch endpoint for connected devices and, later, Health Connect / Apple Health syncs. */
healthRouter.post(
  "/samples",
  authedRoute({ body: healthSamplesSchema }, ({ userId, body }) => health.ingestSamples(userId, body.samples), 201),
);
