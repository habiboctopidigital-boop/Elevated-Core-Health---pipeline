-- Phase 1: schema foundation for RBAC (super_admin) + system-wide audit.
-- Purely additive — no existing column, table, or enum value is removed or
-- renamed, so every existing query, row, and API call keeps working.
--
-- NOTE: the new "super_admin" UserRole value is added here but not referenced
-- by any DML in this file (Postgres does not allow a brand-new enum value to
-- be used in the same transaction it was added in). The promotion of Donna's
-- account happens in the next migration.

-- AlterEnum: add super_admin as a new role tier above admin.
ALTER TYPE "UserRole" ADD VALUE 'super_admin';

-- CreateEnum: user activation status (task.md §8 user list column).
CREATE TYPE "UserStatus" AS ENUM ('active', 'inactive');

-- CreateEnum: additive activity_log grouping, independent of the existing
-- `type` (auto|manual) column, which is left untouched.
CREATE TYPE "ActivityCategory" AS ENUM ('auth', 'profile', 'patient', 'appointment', 'user_management', 'report', 'system');

-- AlterTable: users — status, last login, and creator attribution.
ALTER TABLE "users"
  ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'active',
  ADD COLUMN "last_login_at" TIMESTAMP(3),
  ADD COLUMN "created_by" TEXT;

ALTER TABLE "users"
  ADD CONSTRAINT "users_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: activity_log — decouple from patients (nullable + SetNull so
-- audit history survives a deleted patient) and add columns for system-wide
-- events and actor attribution. Existing rows are unaffected by these ALTERs.
ALTER TABLE "activity_log" DROP CONSTRAINT "activity_log_patient_id_fkey";

ALTER TABLE "activity_log"
  ALTER COLUMN "patient_id" DROP NOT NULL,
  ADD COLUMN "category" "ActivityCategory" NOT NULL DEFAULT 'patient',
  ADD COLUMN "actor_role" TEXT,
  ADD COLUMN "actor_name" TEXT,
  ADD COLUMN "ip_address" TEXT,
  ADD COLUMN "user_agent" TEXT;

ALTER TABLE "activity_log"
  ADD CONSTRAINT "activity_log_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "activity_log_category_idx" ON "activity_log"("category");
