/*
  Warnings:

  - The values [STRIPE,CASH] on the enum `PaymentMethod` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `how_to_contact` on the `apartments` table. All the data in the column will be lost.
  - You are about to drop the column `notification_preference` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `wallets` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[ambassador_id]` on the table `wallets` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `ambassador_id` to the `wallets` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY');

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentMethod_new" AS ENUM ('NEDARIM_PLUS');
ALTER TABLE "public"."apartment_listing_payments" ALTER COLUMN "payment_method" DROP DEFAULT;
ALTER TABLE "public"."report_rented_payments" ALTER COLUMN "payment_method" DROP DEFAULT;
ALTER TABLE "public"."swap_payments" ALTER COLUMN "payment_method" DROP DEFAULT;
ALTER TABLE "apartment_listing_payments" ALTER COLUMN "payment_method" TYPE "PaymentMethod_new" USING ("payment_method"::text::"PaymentMethod_new");
ALTER TABLE "report_rented_payments" ALTER COLUMN "payment_method" TYPE "PaymentMethod_new" USING ("payment_method"::text::"PaymentMethod_new");
ALTER TABLE "swap_payments" ALTER COLUMN "payment_method" TYPE "PaymentMethod_new" USING ("payment_method"::text::"PaymentMethod_new");
ALTER TYPE "PaymentMethod" RENAME TO "PaymentMethod_old";
ALTER TYPE "PaymentMethod_new" RENAME TO "PaymentMethod";
DROP TYPE "public"."PaymentMethod_old";
ALTER TABLE "apartment_listing_payments" ALTER COLUMN "payment_method" SET DEFAULT 'NEDARIM_PLUS';
ALTER TABLE "report_rented_payments" ALTER COLUMN "payment_method" SET DEFAULT 'NEDARIM_PLUS';
ALTER TABLE "swap_payments" ALTER COLUMN "payment_method" SET DEFAULT 'NEDARIM_PLUS';
COMMIT;

-- DropForeignKey
ALTER TABLE "wallets" DROP CONSTRAINT "wallets_user_id_fkey";

-- DropIndex
DROP INDEX "apartments_user_id_key";

-- DropIndex
DROP INDEX "wallets_user_id_key";

-- AlterTable
ALTER TABLE "apartments" DROP COLUMN "how_to_contact",
ADD COLUMN     "email" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "neighborhood_lat" DOUBLE PRECISION,
ADD COLUMN     "neighborhood_lng" DOUBLE PRECISION,
ADD COLUMN     "neighborhood_walking_minutes" INTEGER,
ADD COLUMN     "phone" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "receive_request_when_unavailable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "unavailable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsapp" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "swaps" ADD COLUMN     "weekend" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" DROP COLUMN "notification_preference";

-- AlterTable
ALTER TABLE "wallets" DROP COLUMN "user_id",
ADD COLUMN     "ambassador_id" TEXT NOT NULL;

-- DropEnum
DROP TYPE "HowToContact";

-- CreateTable
CREATE TABLE "owner_notification_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "channel" "NotificationPreference" NOT NULL DEFAULT 'EMAIL',
    "notification_email" TEXT,
    "notification_phone" TEXT,
    "preferred_day" "DayOfWeek",
    "preferred_time" TEXT,
    "is_paused" BOOLEAN NOT NULL DEFAULT false,
    "allow_reminder" BOOLEAN NOT NULL DEFAULT true,
    "specific_reminder_date" TIMESTAMP(3),
    "last_reminder_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owner_notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "owner_notification_preferences_user_id_key" ON "owner_notification_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_ambassador_id_key" ON "wallets"("ambassador_id");

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_ambassador_id_fkey" FOREIGN KEY ("ambassador_id") REFERENCES "ambassadors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_notification_preferences" ADD CONSTRAINT "owner_notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
