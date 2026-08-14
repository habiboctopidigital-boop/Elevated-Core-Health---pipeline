-- CreateTable: full note history for patients (multiple notes per patient).
-- The patients table keeps its single legacy `notes` scalar for backward
-- compatibility; this table stores every note as its own row so the modal can
-- render a list (same pattern as patient_flags).
CREATE TABLE "patient_notes" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "patient_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "patient_notes_patient_id_idx" ON "patient_notes"("patient_id");

-- Backfill: patients with a legacy scalar note get a history row so nothing
-- already stored is lost when the UI switches to the notes table.
INSERT INTO "patient_notes" ("id", "patient_id", "content", "created_by", "created_at", "updated_at")
SELECT gen_random_uuid(), "id", "notes", "created_by", COALESCE("updated_at", "created_at"), COALESCE("updated_at", "created_at")
FROM "patients"
WHERE "notes" IS NOT NULL AND TRIM("notes") <> '';

-- AddForeignKey
ALTER TABLE "patient_notes" ADD CONSTRAINT "patient_notes_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_notes" ADD CONSTRAINT "patient_notes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
