import { Router } from "express";
import { customFoodSchema, foodSearchSchema } from "@nutrition/shared";
import { authedRoute } from "../../http/router.js";
import * as foods from "./foods.service.js";

export const foodsRouter = Router();

foodsRouter.get(
  "/",
  authedRoute({ query: foodSearchSchema }, ({ userId, query }) => foods.searchFoods(userId, query)),
);

foodsRouter.post(
  "/",
  authedRoute({ body: customFoodSchema }, ({ userId, body }) => foods.createCustomFood(userId, body), 201),
);

foodsRouter.get(
  "/:id",
  authedRoute({}, ({ userId, params }) => foods.getFood(userId, params.id)),
);

foodsRouter.put(
  "/:id",
  authedRoute({ body: customFoodSchema }, ({ userId, params, body }) => foods.updateCustomFood(userId, params.id, body)),
);

foodsRouter.delete(
  "/:id",
  authedRoute({}, ({ userId, params }) => foods.deleteCustomFood(userId, params.id)),
);

foodsRouter.put(
  "/:id/favorite",
  authedRoute({}, ({ userId, params }) => foods.setFavorite(userId, params.id, true)),
);

foodsRouter.delete(
  "/:id/favorite",
  authedRoute({}, ({ userId, params }) => foods.setFavorite(userId, params.id, false)),
);
