-- Step 1: Change alerts.target_role from UserRole enum to TEXT
-- This allows it to store 'AMBASSADOR', 'USER', 'SUPER_ADMIN' without being
-- tied to the UserRole Prisma enum (since AMBASSADOR is removed from UserRole).
ALTER TABLE "alerts" ALTER COLUMN "target_role" TYPE TEXT;

-- Step 2: Add the new AmbassadorRole enum
CREATE TYPE "AmbassadorRole" AS ENUM ('AMBASSADOR');

-- Step 3: Remove AMBASSADOR from UserRole enum.
-- PostgreSQL doesn't support DROP VALUE on enums directly, so we:
--   a. Rename the old enum
--   b. Drop the default on users.role (it references the old type)
--   c. Alter users.role to TEXT temporarily
--   d. Create new UserRole enum without AMBASSADOR
--   e. Alter users.role back to new enum
--   f. Re-add the default
--   g. Drop old enum

ALTER TYPE "UserRole" RENAME TO "UserRole_old";

-- Drop the default so we can change the column type
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;

-- Change column to TEXT temporarily
ALTER TABLE "users" ALTER COLUMN "role" TYPE TEXT;

-- Create new UserRole enum without AMBASSADOR
CREATE TYPE "UserRole" AS ENUM ('USER', 'SUPER_ADMIN');

-- Migrate data: AMBASSADOR rows become USER (safety fallback)
UPDATE "users" SET "role" = 'USER' WHERE "role" = 'AMBASSADOR';

-- Cast column back to the new enum
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole" USING "role"::"UserRole";

-- Re-add the default
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'USER'::"UserRole";

-- Drop the old enum
DROP TYPE "UserRole_old";
