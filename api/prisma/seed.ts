import { PrismaClient } from "@prisma/client";
import { foods } from "./seed-data.js";
import { activities } from "./activity-data.js";

const prisma = new PrismaClient();

async function main() {
  for (const food of foods) {
    await prisma.food.upsert({
      where: { id: food.name },
      create: { id: food.name, ...food },
      update: { ...food },
    });
  }
  for (const activity of activities) {
    await prisma.activity.upsert({
      where: { id: activity.id },
      create: activity,
      update: activity,
    });
  }
  // Cached daily activity is derived from the catalog (MET, step cadence), so a reseed retires it.
  const { count } = await prisma.dailyActivity.deleteMany();
  console.log(`Seeded ${foods.length} foods and ${activities.length} activities; cleared ${count} cached days.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
