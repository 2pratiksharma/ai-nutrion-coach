-- DailyActivity only ever holds derived values, so the cheapest migration is to drop the cache
-- and let it rebuild on the next read.
DELETE FROM "DailyActivity";

ALTER TABLE "DailyActivity" ADD COLUMN "countedSteps" INTEGER NOT NULL;
