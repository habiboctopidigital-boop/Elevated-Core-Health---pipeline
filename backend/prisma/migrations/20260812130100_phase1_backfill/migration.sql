-- Phase 1: data backfill, split into its own transaction because Postgres
-- will not let a brand-new enum value (super_admin, added in the previous
-- migration) be referenced in the same transaction it was created in.

-- Promote Donna's existing account to the new super_admin tier (confirmed
-- with the client — Donna becomes super_admin, "admin" stays as a
-- delegatable tier below her for future staff).
UPDATE "users" SET "role" = 'super_admin' WHERE "email" = 'donna@elevatedcore.com';

-- Backfill actor_role / actor_name on existing activity_log rows so the new
-- denormalised-actor columns are populated for history, not just new writes.
-- (category is already backfilled to 'patient' via the column DEFAULT added
-- in the previous migration — every existing row predates the new
-- non-patient categories.)
UPDATE "activity_log" AS al
SET "actor_role" = u."role"::text,
    "actor_name" = u."name"
FROM "users" AS u
WHERE al."actor_id" = u."id" AND al."actor_role" IS NULL;
