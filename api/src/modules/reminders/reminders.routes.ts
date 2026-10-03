import { Router } from "express";
import { pushSubscriptionSchema, pushUnsubscribeSchema, reminderSettingsSchema } from "@nutrition/shared";
import { authedRoute } from "../../http/router.js";
import * as reminders from "./reminders.service.js";

export const remindersRouter = Router();

remindersRouter.get(
  "/",
  authedRoute({}, ({ userId }) => reminders.getReminders(userId)),
);

remindersRouter.put(
  "/",
  authedRoute({ body: reminderSettingsSchema }, ({ userId, body }) => reminders.saveReminders(userId, body.reminders)),
);

remindersRouter.post(
  "/subscriptions",
  authedRoute({ body: pushSubscriptionSchema }, ({ userId, body }) => reminders.subscribe(userId, body)),
);

remindersRouter.delete(
  "/subscriptions",
  authedRoute({ body: pushUnsubscribeSchema }, ({ userId, body }) => reminders.unsubscribe(userId, body.endpoint)),
);

remindersRouter.post(
  "/test",
  authedRoute({}, ({ userId }) => reminders.sendTest(userId)),
);
