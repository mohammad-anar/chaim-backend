-- AlterTable: add is_special and special_price to apartment_availabilities
ALTER TABLE "apartment_availabilities"
  ADD COLUMN "is_special"    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "special_price" DOUBLE PRECISION;
