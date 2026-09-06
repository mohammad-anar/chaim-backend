-- AlterEnum
ALTER TYPE "ApartmentStatus" ADD VALUE IF NOT EXISTS 'BLOCKED';

-- AlterEnum
ALTER TYPE "AmbassadorStatus" ADD VALUE IF NOT EXISTS 'BLOCKED';

-- CreateTable
CREATE TABLE IF NOT EXISTS "city_search_logs" (
    "id" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "search_count" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "city_search_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "city_search_logs_city_key" ON "city_search_logs"("city");
