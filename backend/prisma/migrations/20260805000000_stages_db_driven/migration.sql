-- Create Stage table
CREATE TABLE "stages" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hint" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_final" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stages_pkey" PRIMARY KEY ("id")
);

-- Unique key + order index (mirror Prisma schema)
CREATE UNIQUE INDEX "stages_key_key" ON "stages"("key");
CREATE INDEX "stages_sort_order_idx" ON "stages"("sort_order");

-- Seed the 7 default pipeline stages (keys are stable/immutable identifiers)
INSERT INTO "stages" ("id", "key", "name", "hint", "sort_order", "is_final", "is_active") VALUES
  ('stage_onboarding',      'onboarding',      'Onboarding',      'Scheduled on calendar',   1, false, true),
  ('stage_visit_complete',  'visit_complete',  'Visit Complete',  'Encounter finished',      2, false, true),
  ('stage_post_visit_docs', 'post_visit_docs', 'Post-Visit Docs', 'Letter + labs sent',      3, false, true),
  ('stage_chart_signed',    'chart_signed',    'Chart Signed',    'Optimantra finalized',    4, false, true),
  ('stage_sent_to_billing', 'sent_to_billing', 'Sent to Billing', 'Claim submitted',         5, false, true),
  ('stage_payment_posted',  'payment_posted',  'Payment Posted',  'Payment received',        6, false, true),
  ('stage_reconciled',      'reconciled',      'Reconciled',      'Closed out',              7, true,  true);

-- Convert patients.stage from the PatientStage enum to plain TEXT
ALTER TABLE "patients" ALTER COLUMN "stage" DROP DEFAULT;
ALTER TABLE "patients" ALTER COLUMN "stage" TYPE TEXT USING "stage"::text;
ALTER TABLE "patients" ALTER COLUMN "stage" SET DEFAULT 'onboarding';

-- Convert checklist_items.stage from the PatientStage enum to plain TEXT
ALTER TABLE "checklist_items" ALTER COLUMN "stage" TYPE TEXT USING "stage"::text;

-- Foreign keys: stages are protected while referenced
ALTER TABLE "patients"
    ADD CONSTRAINT "patients_stage_fkey" FOREIGN KEY ("stage") REFERENCES "stages"("key") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "checklist_items"
    ADD CONSTRAINT "checklist_items_stage_fkey" FOREIGN KEY ("stage") REFERENCES "stages"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- The enum is now unused — drop it
DROP TYPE "PatientStage";
