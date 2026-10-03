import { Router } from "express";
import { changePasswordSchema, deleteAccountSchema, updateAccountSchema } from "@nutrition/shared";
import { clearAuthCookie, setAuthCookie, signToken } from "../../http/auth.js";
import { authLimiter } from "../../http/rate-limit.js";
import { authedRoute } from "../../http/router.js";
import * as account from "./account.service.js";

export const accountRouter = Router();

accountRouter.patch(
  "/",
  authLimiter,
  authedRoute({ body: updateAccountSchema }, ({ userId, body }) => account.updateAccount(userId, body)),
);

accountRouter.post(
  "/password",
  authLimiter,
  authedRoute({ body: changePasswordSchema }, async ({ userId, body, res }) => {
    const user = await account.changePassword(userId, body);
    // Other devices are signed out by the version bump; keep this one signed in.
    setAuthCookie(res, signToken(user));
  }),
);

accountRouter.delete(
  "/",
  authLimiter,
  authedRoute({ body: deleteAccountSchema }, async ({ userId, body, res }) => {
    await account.deleteAccount(userId, body.password);
    clearAuthCookie(res);
  }),
);
