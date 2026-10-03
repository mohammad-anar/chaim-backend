/*
  Warnings:

  - You are about to drop the column `target_url` on the `advertisements` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'OWNER';

-- DropIndex
DROP INDEX "apartment_listing_payments_user_id_key";

-- AlterTable
ALTER TABLE "advertisements" DROP COLUMN "target_url",
ADD COLUMN     "company_name" TEXT,
ADD COLUMN     "subtitle" TEXT,
ADD COLUMN     "url" TEXT;

-- AlterTable
ALTER TABLE "apartments" ADD COLUMN     "inactive_note" TEXT;

-- CreateTable
CREATE TABLE "apartment_view_histories" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "apartment_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "apartment_view_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "apartment_view_histories_apartment_id_idx" ON "apartment_view_histories"("apartment_id");

-- CreateIndex
CREATE INDEX "apartment_view_histories_user_id_idx" ON "apartment_view_histories"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "apartment_view_histories_user_id_apartment_id_key" ON "apartment_view_histories"("user_id", "apartment_id");

-- AddForeignKey
ALTER TABLE "apartment_view_histories" ADD CONSTRAINT "apartment_view_histories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apartment_view_histories" ADD CONSTRAINT "apartment_view_histories_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
