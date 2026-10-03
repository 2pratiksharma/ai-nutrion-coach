import type { Food as FoodRow, Prisma } from "@prisma/client";
import type { Food } from "@nutrition/shared";
import { prisma } from "../../infra/prisma.js";
import { notFound } from "../../http/errors.js";

type FoodScope = "all" | "mine" | "favorites" | "recent";
type CustomFoodInput = Omit<FoodRow, "id" | "createdById" | "archivedAt" | "createdAt">;

/** Catalog foods plus the user's own, excluding archived ones. */
export function visibleFoods(userId: string): Prisma.FoodWhereInput {
  return { archivedAt: null, OR: [{ createdById: null }, { createdById: userId }] };
}

export function toFood(row: FoodRow, userId: string, favoriteIds: ReadonlySet<string>): Food {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    dietType: row.dietType,
    servingLabel: row.servingLabel,
    servingGrams: row.servingGrams,
    caloriesPer100g: row.caloriesPer100g,
    proteinPer100g: row.proteinPer100g,
    carbsPer100g: row.carbsPer100g,
    fatPer100g: row.fatPer100g,
    fiberPer100g: row.fiberPer100g,
    isCustom: row.createdById === userId,
    isFavorite: favoriteIds.has(row.id),
  };
}

export async function favoriteIdsFor(userId: string, foodIds?: string[]): Promise<Set<string>> {
  const rows = await prisma.favoriteFood.findMany({
    where: { userId, ...(foodIds ? { foodId: { in: foodIds } } : {}) },
    select: { foodId: true },
  });
  return new Set(rows.map((r) => r.foodId));
}

export async function mapFoods(userId: string, rows: FoodRow[]): Promise<Food[]> {
  const favorites = await favoriteIdsFor(userId, rows.map((r) => r.id));
  return rows.map((r) => toFood(r, userId, favorites));
}

/** Loads a food the user may log, or throws 404. */
export async function usableFood(userId: string, foodId: string): Promise<FoodRow> {
  const food = await prisma.food.findFirst({ where: { id: foodId, ...visibleFoods(userId) } });
  if (!food) throw notFound("Food");
  return food;
}

function rank(name: string, query: string): number {
  const n = name.toLowerCase();
  if (n === query) return 0;
  if (n.startsWith(query)) return 1;
  if (n.split(/[\s(/,-]+/).some((word) => word.startsWith(query))) return 2;
  return 3;
}

async function recentFoodIds(userId: string, limit: number): Promise<string[]> {
  const items = await prisma.mealItem.findMany({
    where: { meal: { userId } },
    orderBy: { createdAt: "desc" },
    select: { foodId: true },
    take: 200,
  });
  return [...new Set(items.map((i) => i.foodId))].slice(0, limit);
}

export async function searchFoods(userId: string, opts: { q?: string; scope: FoodScope; limit: number }): Promise<Food[]> {
  const q = opts.q?.toLowerCase();
  const where: Prisma.FoodWhereInput = { AND: [visibleFoods(userId)] };
  const and = where.AND as Prisma.FoodWhereInput[];
  if (q) and.push({ name: { contains: q, mode: "insensitive" } });
  if (opts.scope === "mine") and.push({ createdById: userId });
  if (opts.scope === "favorites") and.push({ favorites: { some: { userId } } });

  if (opts.scope === "recent") {
    const ids = await recentFoodIds(userId, opts.limit);
    const rows = await prisma.food.findMany({ where: { ...where, id: { in: ids } } });
    const order = new Map(ids.map((id, i) => [id, i]));
    rows.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
    return mapFoods(userId, rows);
  }

  // Over-fetch so relevance ranking can promote prefix matches beyond alphabetical order.
  const rows = await prisma.food.findMany({
    where,
    orderBy: { name: "asc" },
    take: q ? opts.limit * 3 : opts.limit,
  });
  if (q) rows.sort((a, b) => rank(a.name, q) - rank(b.name, q) || a.name.localeCompare(b.name));
  return mapFoods(userId, rows.slice(0, opts.limit));
}

export async function getFood(userId: string, foodId: string): Promise<Food> {
  const [food] = await mapFoods(userId, [await usableFood(userId, foodId)]);
  return food;
}

export async function createCustomFood(userId: string, input: CustomFoodInput): Promise<Food> {
  const row = await prisma.food.create({ data: { ...input, createdById: userId } });
  return toFood(row, userId, new Set());
}

async function ownFood(userId: string, foodId: string) {
  const food = await prisma.food.findFirst({ where: { id: foodId, createdById: userId, archivedAt: null } });
  if (!food) throw notFound("Food");
  return food;
}

export async function updateCustomFood(userId: string, foodId: string, input: CustomFoodInput): Promise<Food> {
  await ownFood(userId, foodId);
  const row = await prisma.food.update({ where: { id: foodId }, data: input });
  return getFood(userId, row.id);
}

/** Foods already in the user's log are archived so their history keeps a valid reference. */
export async function deleteCustomFood(userId: string, foodId: string) {
  await ownFood(userId, foodId);
  const used = await prisma.mealItem.count({ where: { foodId } });
  if (used > 0) {
    await prisma.$transaction([
      prisma.favoriteFood.deleteMany({ where: { foodId } }),
      prisma.food.update({ where: { id: foodId }, data: { archivedAt: new Date() } }),
    ]);
  } else {
    await prisma.food.delete({ where: { id: foodId } });
  }
}

export async function setFavorite(userId: string, foodId: string, favorite: boolean) {
  if (favorite) {
    await usableFood(userId, foodId);
    await prisma.favoriteFood.upsert({
      where: { userId_foodId: { userId, foodId } },
      create: { userId, foodId },
      update: {},
    });
  } else {
    await prisma.favoriteFood.deleteMany({ where: { userId, foodId } });
  }
}
