import { Router } from "express";
import { dateQuerySchema, exerciseSchema } from "@nutrition/shared";
import { authedRoute } from "../../http/router.js";
import * as activity from "./activity.service.js";

export const activitiesRouter = Router();

activitiesRouter.get(
  "/",
  authedRoute({}, async ({ res }) => {
    // The catalog only changes with a deploy/seed, so let clients cache it briefly.
    res.set("Cache-Control", "private, max-age=3600");
    return activity.listActivities();
  }),
);

export const exercisesRouter = Router();

exercisesRouter.get(
  "/",
  authedRoute({ query: dateQuerySchema }, ({ userId, query }) => activity.getDay(userId, query.date)),
);

exercisesRouter.post(
  "/",
  authedRoute({ body: exerciseSchema }, ({ userId, body }) => activity.logExercise(userId, body), 201),
);

exercisesRouter.delete(
  "/:id",
  authedRoute({}, ({ userId, params }) => activity.deleteExercise(userId, params.id)),
);
