-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "NotificationPreference" AS ENUM ('EMAIL', 'PHONE', 'BOTH');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "notification_preference" "NotificationPreference" NOT NULL DEFAULT 'EMAIL';
