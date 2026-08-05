-- Align error_details default with the Prisma schema (@default("[]"))
ALTER TABLE "import_batches" ALTER COLUMN "error_details" SET DEFAULT '[]'::jsonb;
