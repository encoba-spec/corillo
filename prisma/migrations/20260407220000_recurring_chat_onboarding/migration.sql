-- AlterTable: PlannedRun gains recurring + thread fields
ALTER TABLE "PlannedRun"
  ADD COLUMN "parentRunId" TEXT,
  ADD COLUMN "recurrence" TEXT,
  ADD COLUMN "recurrenceEndAt" TIMESTAMP(3),
  ADD COLUMN "threadId" TEXT;

CREATE UNIQUE INDEX "PlannedRun_threadId_key" ON "PlannedRun"("threadId");
CREATE INDEX "PlannedRun_parentRunId_idx" ON "PlannedRun"("parentRunId");

ALTER TABLE "PlannedRun"
  ADD CONSTRAINT "PlannedRun_parentRunId_fkey"
  FOREIGN KEY ("parentRunId") REFERENCES "PlannedRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlannedRun"
  ADD CONSTRAINT "PlannedRun_threadId_fkey"
  FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: PlannedRunParticipant gains response
ALTER TABLE "PlannedRunParticipant"
  ADD COLUMN "response" TEXT NOT NULL DEFAULT 'going';

-- AlterTable: Thread gains activityRunId
ALTER TABLE "Thread"
  ADD COLUMN "activityRunId" TEXT;

CREATE INDEX "Thread_activityRunId_idx" ON "Thread"("activityRunId");

-- AlterTable: User gains onboardedAt
ALTER TABLE "User"
  ADD COLUMN "onboardedAt" TIMESTAMP(3);
