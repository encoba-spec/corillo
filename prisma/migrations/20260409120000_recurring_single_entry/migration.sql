-- Collapse recurring series into single entries.
--
-- Each recurring activity used to be stored as one root row + up to 8 child
-- rows (one per upcoming occurrence). Going forward we store only the root
-- and compute future occurrences on the fly from `scheduledAt` + `recurrence`.
-- This preserves the series chat thread (attached to the root) and simplifies
-- listings + joins.

-- 1. Delete any child rows. Their PlannedRunParticipant, RunInvitation, and
--    ThreadMember rows cascade automatically (all use ON DELETE CASCADE).
DELETE FROM "PlannedRun" WHERE "parentRunId" IS NOT NULL;

-- 2. Drop the self-referencing foreign key and index.
ALTER TABLE "PlannedRun" DROP CONSTRAINT IF EXISTS "PlannedRun_parentRunId_fkey";
DROP INDEX IF EXISTS "PlannedRun_parentRunId_idx";

-- 3. Drop the now-unused column.
ALTER TABLE "PlannedRun" DROP COLUMN IF EXISTS "parentRunId";
