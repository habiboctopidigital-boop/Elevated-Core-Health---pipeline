-- Phase 3 foundation: patient status, CRM fields, privacy lock, structured audit log, import batches

-- New enum for patient lifecycle status
CREATE TYPE "PatientStatus" AS ENUM ('active', 'completed', 'cancelled');

-- Import batches (created before patients reference it)
CREATE TABLE "import_batches" (
    "id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "total_rows" INTEGER NOT NULL,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "fail_count" INTEGER NOT NULL DEFAULT 0,
    "duplicate_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "error_details" JSONB,
    "imported_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "import_batches_imported_by_idx" ON "import_batches"("imported_by");
CREATE INDEX "import_batches_created_at_idx" ON "import_batches"("created_at");

ALTER TABLE "import_batches"
    ADD CONSTRAINT "import_batches_imported_by_fkey" FOREIGN KEY ("imported_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Patients: CRM + lifecycle + lock + payment columns
ALTER TABLE "patients" ADD COLUMN "first_name" TEXT;
ALTER TABLE "patients" ADD COLUMN "last_name" TEXT;
ALTER TABLE "patients" ADD COLUMN "location" TEXT;
ALTER TABLE "patients" ADD COLUMN "status" "PatientStatus" NOT NULL DEFAULT 'active';
ALTER TABLE "patients" ADD COLUMN "completed_at" TIMESTAMP(3);
ALTER TABLE "patients" ADD COLUMN "cancelled_at" TIMESTAMP(3);
ALTER TABLE "patients" ADD COLUMN "cancelled_by" TEXT;
ALTER TABLE "patients" ADD COLUMN "cancelled_reason" TEXT;
ALTER TABLE "patients" ADD COLUMN "copay_amount" DECIMAL(10,2);
ALTER TABLE "patients" ADD COLUMN "amount_paid" DECIMAL(10,2);
ALTER TABLE "patients" ADD COLUMN "is_private" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "patients" ADD COLUMN "private_locked_by" TEXT;
ALTER TABLE "patients" ADD COLUMN "private_locked_at" TIMESTAMP(3);
ALTER TABLE "patients" ADD COLUMN "import_batch_id" TEXT;

CREATE INDEX "patients_status_idx" ON "patients"("status");
CREATE INDEX "patients_appointment_datetime_idx" ON "patients"("appointment_datetime");
CREATE INDEX "patients_is_private_idx" ON "patients"("is_private");

ALTER TABLE "patients"
    ADD CONSTRAINT "patients_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "patients"
    ADD CONSTRAINT "patients_private_locked_by_fkey" FOREIGN KEY ("private_locked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "patients"
    ADD CONSTRAINT "patients_import_batch_id_fkey" FOREIGN KEY ("import_batch_id") REFERENCES "import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Activity log: structured audit fields
ALTER TABLE "activity_log" ADD COLUMN "actor_id" TEXT;
ALTER TABLE "activity_log" ADD COLUMN "action" TEXT;
ALTER TABLE "activity_log" ADD COLUMN "entity_type" TEXT;
ALTER TABLE "activity_log" ADD COLUMN "entity_id" TEXT;
ALTER TABLE "activity_log" ADD COLUMN "prev_value" JSONB;
ALTER TABLE "activity_log" ADD COLUMN "new_value" JSONB;
ALTER TABLE "activity_log" ADD COLUMN "metadata" JSONB NOT NULL DEFAULT '{}';

CREATE INDEX "activity_log_actor_id_idx" ON "activity_log"("actor_id");
CREATE INDEX "activity_log_action_idx" ON "activity_log"("action");
CREATE INDEX "activity_log_entity_id_idx" ON "activity_log"("entity_id");

ALTER TABLE "activity_log"
    ADD CONSTRAINT "activity_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
