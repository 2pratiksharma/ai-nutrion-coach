import { Router } from "express";
import {
  dateQuerySchema,
  historyQuerySchema,
  stepsSchema,
  waterAddSchema,
  waterSchema,
  weightSchema,
} from "@nutrition/shared";
import { authedRoute } from "../../http/router.js";
import * as body from "./body.service.js";

export const weightsRouter = Router();

weightsRouter.get(
  "/",
  authedRoute({ query: historyQuerySchema }, ({ userId, query }) => body.listWeights(userId, query.limit)),
);
weightsRouter.put(
  "/",
  authedRoute({ body: weightSchema }, ({ userId, body: input }) => body.saveWeight(userId, input)),
);
weightsRouter.delete(
  "/:id",
  authedRoute({}, ({ userId, params }) => body.deleteWeight(userId, params.id)),
);

export const stepsRouter = Router();

stepsRouter.get(
  "/",
  authedRoute({ query: historyQuerySchema }, ({ userId, query }) => body.listSteps(userId, query.limit)),
);
stepsRouter.put(
  "/",
  authedRoute({ body: stepsSchema }, ({ userId, body: input }) => body.saveSteps(userId, input)),
);

export const waterRouter = Router();

waterRouter.get(
  "/",
  authedRoute({ query: dateQuerySchema }, ({ userId, query }) => body.getWater(userId, query.date)),
);
waterRouter.put(
  "/",
  authedRoute({ body: waterSchema }, ({ userId, body: input }) => body.setWater(userId, input)),
);
waterRouter.post(
  "/add",
  authedRoute({ body: waterAddSchema }, ({ userId, body: input }) => body.addWater(userId, input)),
);
