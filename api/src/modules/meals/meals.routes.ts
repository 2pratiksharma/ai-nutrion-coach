import { Router } from "express";
import {
  addMealItemSchema,
  addMealItemsSchema,
  copyMealsSchema,
  dateQuerySchema,
  updateMealItemSchema,
} from "@nutrition/shared";
import { authedRoute } from "../../http/router.js";
import * as meals from "./meals.service.js";

export const mealsRouter = Router();

mealsRouter.get(
  "/",
  authedRoute({ query: dateQuerySchema }, ({ userId, query }) => meals.getDay(userId, query.date)),
);

mealsRouter.post(
  "/items",
  authedRoute(
    { body: addMealItemSchema },
    async ({ userId, body }) => {
      const [item] = await meals.addItems(userId, {
        type: body.type,
        date: body.date,
        items: [{ foodId: body.foodId, quantityG: body.quantityG }],
      });
      return item;
    },
    201,
  ),
);

mealsRouter.post(
  "/items/bulk",
  authedRoute({ body: addMealItemsSchema }, ({ userId, body }) => meals.addItems(userId, body), 201),
);

mealsRouter.patch(
  "/items/:id",
  authedRoute({ body: updateMealItemSchema }, ({ userId, params, body }) =>
    meals.updateItem(userId, params.id, body.quantityG),
  ),
);

mealsRouter.delete(
  "/items/:id",
  authedRoute({}, ({ userId, params }) => meals.deleteItem(userId, params.id)),
);

mealsRouter.post(
  "/copy",
  authedRoute({ body: copyMealsSchema }, ({ userId, body }) => meals.copyMeals(userId, body), 201),
);
