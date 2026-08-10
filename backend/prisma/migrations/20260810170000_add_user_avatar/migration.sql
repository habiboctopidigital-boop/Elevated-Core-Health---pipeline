-- AlterTable: add nullable avatar URL column to users (additive, no data loss)
ALTER TABLE "users" ADD COLUMN "avatar_url" TEXT;
