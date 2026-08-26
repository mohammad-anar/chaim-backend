-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AdvertisementPosition" AS ENUM ('HOME_TOP', 'HOME_MIDDLE', 'SIDEBAR', 'FOOTER');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('INFO', 'WARNING', 'SUCCESS', 'URGENT');

-- CreateEnum
CREATE TYPE "ContactChannel" AS ENUM ('VOICE', 'WHATSAPP', 'EMAIL');

-- AlterTable
ALTER TABLE "call_logs" ADD COLUMN     "channel" "ContactChannel" NOT NULL DEFAULT 'VOICE';

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "status" "ReviewStatus" NOT NULL DEFAULT 'APPROVED';

-- CreateTable
CREATE TABLE "news" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "image" TEXT,
    "author" TEXT DEFAULT 'Admin',
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "views" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "news_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advertisements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "target_url" TEXT,
    "position" "AdvertisementPosition" NOT NULL DEFAULT 'HOME_TOP',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advertisements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "AlertType" NOT NULL DEFAULT 'INFO',
    "target_role" "UserRole",
    "target_user_id" TEXT,
    "link" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);
