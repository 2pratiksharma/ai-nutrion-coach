import { Router } from "express";
import { dateQuerySchema, parseMealSchema, suggestionsQuerySchema } from "@nutrition/shared";
import { aiLimiter } from "../../http/rate-limit.js";
import { authedRoute } from "../../http/router.js";
import * as ai from "./ai.service.js";

export const aiRouter = Router();

aiRouter.use(aiLimiter);

aiRouter.post(
  "/parse-meal",
  authedRoute({ body: parseMealSchema }, ({ userId, body }) => ai.parseMeal(userId, body.text)),
);

aiRouter.get(
  "/suggestions",
  authedRoute({ query: suggestionsQuerySchema }, ({ userId, query }) => ai.suggestions(userId, query)),
);

aiRouter.get(
  "/coach",
  authedRoute({ query: dateQuerySchema }, ({ userId, query }) => ai.coachReport(userId, query.date)),
);
