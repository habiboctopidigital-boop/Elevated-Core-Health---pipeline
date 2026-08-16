-- ---------------------------------------------------------------------------
-- Patient name split: firstName/lastName become the source of truth.
-- Existing rows were stored as a single `name` — backfill first/last by
-- splitting on the first space, then drop the legacy column.
-- ---------------------------------------------------------------------------

-- Backfill first_name (first token) and last_name (everything after the first
-- space, or NULL for single-token names) from the legacy `name` column.
UPDATE patients
SET first_name = split_part(trim(name), ' ', 1),
    last_name = CASE
      WHEN strpos(trim(name), ' ') > 0 THEN substr(trim(name), strpos(trim(name), ' ') + 1)
      ELSE NULL
    END
WHERE name IS NOT NULL AND trim(name) <> '';

-- Safety net: any row with an empty/missing name gets a placeholder so the
-- NOT NULL constraint below can never fail.
UPDATE patients
SET first_name = 'Unknown'
WHERE first_name IS NULL OR first_name = '';

-- Make first_name required going forward.
ALTER TABLE patients ALTER COLUMN first_name SET NOT NULL;

-- Drop the legacy merged-name column.
ALTER TABLE patients DROP COLUMN name;
