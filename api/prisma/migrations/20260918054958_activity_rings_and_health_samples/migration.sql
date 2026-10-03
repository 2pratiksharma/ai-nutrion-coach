-- CreateEnum
CREATE TYPE "SampleType" AS ENUM ('STEPS', 'ACTIVE_ENERGY', 'HEART_RATE', 'DISTANCE');

-- CreateEnum
CREATE TYPE "HealthSource" AS ENUM ('MANUAL', 'APP_TIMER', 'BLE_DEVICE', 'HEALTH_CONNECT', 'APPLE_HEALTH', 'GOOGLE_HEALTH', 'STRAVA');

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "stepsPerMinute" INTEGER;

-- AlterTable
ALTER TABLE "ExerciseLog" ADD COLUMN     "heartPoints" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "activeKcalTarget" INTEGER NOT NULL DEFAULT 400,
ADD COLUMN     "heartPointsTarget" INTEGER NOT NULL DEFAULT 150,
ADD COLUMN     "workoutDaysTarget" INTEGER NOT NULL DEFAULT 4;

-- CreateTable
CREATE TABLE "HealthSample" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "SampleType" NOT NULL,
    "source" "HealthSource" NOT NULL,
    "startAt" TIMESTAMPTZ(3) NOT NULL,
    "endAt" TIMESTAMPTZ(3) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "externalId" TEXT,
    "deviceName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthSample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyActivity" (
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "steps" INTEGER NOT NULL,
    "stepSource" "HealthSource" NOT NULL,
    "exerciseMin" INTEGER NOT NULL,
    "exerciseCount" INTEGER NOT NULL,
    "exerciseKcal" INTEGER NOT NULL,
    "stepKcal" INTEGER NOT NULL,
    "deviceKcal" INTEGER NOT NULL,
    "activeKcal" INTEGER NOT NULL,
    "heartPoints" INTEGER NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyActivity_pkey" PRIMARY KEY ("userId","date")
);

-- CreateIndex
CREATE INDEX "HealthSample_userId_type_startAt_idx" ON "HealthSample"("userId", "type", "startAt");

-- CreateIndex
CREATE UNIQUE INDEX "HealthSample_userId_source_externalId_key" ON "HealthSample"("userId", "source", "externalId");

-- AddForeignKey
ALTER TABLE "HealthSample" ADD CONSTRAINT "HealthSample_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyActivity" ADD CONSTRAINT "DailyActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill heart points for workouts logged before intensity scoring existed:
-- 1 point per minute of moderate activity (3-6 MET), 2 per minute of vigorous (6+).
UPDATE "ExerciseLog" el
SET "heartPoints" = CASE
      WHEN a."met" >= 6 THEN el."durationMin" * 2
      WHEN a."met" >= 3 THEN el."durationMin"
      ELSE 0
    END
FROM "Activity" a
WHERE a."id" = el."activityId";
