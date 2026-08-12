-- CreateTable: full flag history for patients (multiple flags per patient).
-- The patients table keeps its single "currently flagged" snapshot columns;
-- this table stores every raise/clear event for the modal's flag history.
CREATE TABLE "patient_flags" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'negative',
    "reason" TEXT NOT NULL,
    "flagged_by" TEXT NOT NULL,
    "cleared_by" TEXT,
    "cleared_reason" TEXT,
    "cleared_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "patient_flags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "patient_flags_patient_id_idx" ON "patient_flags"("patient_id");

-- CreateIndex
CREATE INDEX "patient_flags_stage_idx" ON "patient_flags"("stage");

-- Backfill: patients already flagged before this migration get a history row
-- so the modal's flag history stays consistent with the snapshot columns.
INSERT INTO "patient_flags" ("id", "patient_id", "stage", "type", "reason", "flagged_by", "created_at")
SELECT gen_random_uuid(), "id", "stage", 'negative', "flag_reason", "flagged_by", COALESCE("flagged_at", "updated_at")
FROM "patients"
WHERE "is_flagged" = true AND "flag_reason" IS NOT NULL AND "flagged_by" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "patient_flags" ADD CONSTRAINT "patient_flags_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_flags" ADD CONSTRAINT "patient_flags_flagged_by_fkey" FOREIGN KEY ("flagged_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_flags" ADD CONSTRAINT "patient_flags_cleared_by_fkey" FOREIGN KEY ("cleared_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
