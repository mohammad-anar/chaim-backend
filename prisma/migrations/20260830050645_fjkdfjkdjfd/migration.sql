-- CreateEnum
CREATE TYPE "MarketingPlatformStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "marketing_platform_id" TEXT;

-- CreateTable
CREATE TABLE "advertisements_and_marketing_platforms" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "status" "MarketingPlatformStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advertisements_and_marketing_platforms_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_marketing_platform_id_fkey" FOREIGN KEY ("marketing_platform_id") REFERENCES "advertisements_and_marketing_platforms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
