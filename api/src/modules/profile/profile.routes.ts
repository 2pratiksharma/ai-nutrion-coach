import { Router } from "express";
import { activityGoalsSchema, profileSchema } from "@nutrition/shared";
import { authedRoute } from "../../http/router.js";
import * as profiles from "./profile.service.js";

export const profileRouter = Router();

profileRouter.get(
  "/",
  authedRoute({}, ({ userId }) => profiles.getProfile(userId)),
);

profileRouter.patch(
  "/goals",
  authedRoute({ body: activityGoalsSchema }, ({ userId, body }) => profiles.saveActivityGoals(userId, body)),
);

profileRouter.put(
  "/",
  authedRoute({ body: profileSchema }, async ({ userId, body, res }) => {
    const { created, body: result } = await profiles.saveProfile(userId, body);
    res.status(created ? 201 : 200).json(result);
  }),
);
