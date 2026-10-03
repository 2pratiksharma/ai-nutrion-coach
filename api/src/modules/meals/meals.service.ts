import type { Prisma } from "@prisma/client";
import { MEAL_TYPE_VALUES, macrosForQuantity, type DayMeals, type MealItem, type MealType } from "@nutrition/shared";
import { prisma } from "../../infra/prisma.js";
import { HttpError, badRequest, notFound } from "../../http/errors.js";
import { resolveDay, toDbDate } from "../../lib/day.js";
import { usableFood } from "../foods/foods.service.js";

const itemInclude = {
  food: { select: { id: true, name: true, servingLabel: true, servingGrams: true } },
} satisfies Prisma.MealItemInclude;

type ItemRow = Prisma.MealItemGetPayload<{ include: typeof itemInclude }>;

const round1 = (n: number) => Math.round(n * 10) / 10;

function toMealItem(row: ItemRow): MealItem {
  return {
    id: row.id,
    quantityG: row.quantityG,
    calories: row.calories,
    proteinG: row.proteinG,
    carbsG: row.carbsG,
    fatG: row.fatG,
    food: row.food,
  };
}

function mealFor(tx: Prisma.TransactionClient, userId: string, day: Date, type: MealType) {
  return tx.meal.upsert({
    where: { userId_date_type: { userId, date: day, type } },
    create: { userId, date: day, type },
    update: {},
    select: { id: true },
  });
}

export async function getDay(userId: string, date?: string): Promise<DayMeals> {
  const { date: iso, day } = await resolveDay(userId, date);
  const meals = await prisma.meal.findMany({
    where: { userId, date: day, items: { some: {} } },
    include: { items: { include: itemInclude, orderBy: { createdAt: "asc" } } },
  });
  meals.sort((a, b) => MEAL_TYPE_VALUES.indexOf(a.type) - MEAL_TYPE_VALUES.indexOf(b.type));
  return {
    date: iso,
    meals: meals.map((m) => ({ id: m.id, type: m.type, items: m.items.map(toMealItem) })),
  };
}

export async function addItems(
  userId: string,
  input: { type: MealType; date?: string; items: { foodId: string; quantityG: number }[] },
): Promise<MealItem[]> {
  const foods = await Promise.all(input.items.map((i) => usableFood(userId, i.foodId)));
  const { day } = await resolveDay(userId, input.date);

  const created = await prisma.$transaction(async (tx) => {
    const meal = await mealFor(tx, userId, day, input.type);
    const rows: ItemRow[] = [];
    for (const [i, item] of input.items.entries()) {
      rows.push(
        await tx.mealItem.create({
          data: { mealId: meal.id, foodId: item.foodId, quantityG: item.quantityG, ...macrosForQuantity(foods[i], item.quantityG) },
          include: itemInclude,
        }),
      );
    }
    return rows;
  });
  return created.map(toMealItem);
}

async function ownItem(userId: string, itemId: string) {
  const item = await prisma.mealItem.findFirst({ where: { id: itemId, meal: { userId } } });
  if (!item) throw notFound("Meal item");
  return item;
}

/** Scales the logged snapshot rather than re-reading the food, so history stays self-consistent. */
export async function updateItem(userId: string, itemId: string, quantityG: number): Promise<MealItem> {
  const item = await ownItem(userId, itemId);
  const ratio = quantityG / item.quantityG;
  const updated = await prisma.mealItem.update({
    where: { id: item.id },
    data: {
      quantityG,
      calories: Math.round(item.calories * ratio),
      proteinG: round1(item.proteinG * ratio),
      carbsG: round1(item.carbsG * ratio),
      fatG: round1(item.fatG * ratio),
    },
    include: itemInclude,
  });
  return toMealItem(updated);
}

export async function deleteItem(userId: string, itemId: string) {
  const item = await ownItem(userId, itemId);
  await prisma.$transaction([
    prisma.mealItem.delete({ where: { id: item.id } }),
    prisma.meal.deleteMany({ where: { id: item.mealId, items: { none: {} } } }),
  ]);
}

export async function copyMeals(
  userId: string,
  input: { fromDate: string; toDate: string; type?: MealType },
): Promise<{ copied: number; day: DayMeals }> {
  if (input.fromDate === input.toDate) throw badRequest("Pick a different day to copy from", "fromDate");

  const source = await prisma.meal.findMany({
    where: { userId, date: toDbDate(input.fromDate), ...(input.type ? { type: input.type } : {}) },
    include: { items: { include: { food: { select: { archivedAt: true } } } } },
  });
  const toDay = toDbDate(input.toDate);

  const copied = await prisma.$transaction(async (tx) => {
    let count = 0;
    for (const meal of source) {
      const items = meal.items.filter((i) => !i.food.archivedAt);
      if (items.length === 0) continue;
      const target = await mealFor(tx, userId, toDay, meal.type);
      const result = await tx.mealItem.createMany({
        data: items.map((i) => ({
          mealId: target.id,
          foodId: i.foodId,
          quantityG: i.quantityG,
          calories: i.calories,
          proteinG: i.proteinG,
          carbsG: i.carbsG,
          fatG: i.fatG,
        })),
      });
      count += result.count;
    }
    return count;
  });

  if (copied === 0) throw new HttpError(404, "Nothing was logged on that day to copy");
  return { copied, day: await getDay(userId, input.toDate) };
}
