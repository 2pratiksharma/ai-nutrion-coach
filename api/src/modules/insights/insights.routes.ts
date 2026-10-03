import { Router } from "express";
import { dateQuerySchema, trendsQuerySchema } from "@nutrition/shared";
import { authedRoute } from "../../http/router.js";
import * as insights from "./insights.service.js";

export const summaryRouter = Router();

summaryRouter.get(
  "/",
  authedRoute({ query: dateQuerySchema }, ({ userId, query }) => insights.dailySummary(userId, query.date)),
);

export const trendsRouter = Router();

trendsRouter.get(
  "/",
  authedRoute({ query: trendsQuerySchema }, ({ userId, query }) => insights.trends(userId, query.days)),
);
