-- User compliance + self-report fields
ALTER TABLE "User"
  ADD COLUMN "selfReportedPace" DOUBLE PRECISION,
  ADD COLUMN "selfReportedDistance" DOUBLE PRECISION,
  ADD COLUMN "selfReportedFrequency" DOUBLE PRECISION,
  ADD COLUMN "hasStrava" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "ageConfirmedAt" TIMESTAMP(3),
  ADD COLUMN "safetyAckAt" TIMESTAMP(3);

-- Backfill hasStrava for existing users who already connected
UPDATE "User" SET "hasStrava" = true WHERE "stravaAthleteId" IS NOT NULL;

-- Block
CREATE TABLE "Block" (
  "id"        TEXT NOT NULL,
  "blockerId" TEXT NOT NULL,
  "blockedId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Block_blockerId_blockedId_key" ON "Block"("blockerId", "blockedId");
CREATE INDEX "Block_blockedId_idx" ON "Block"("blockedId");

ALTER TABLE "Block"
  ADD CONSTRAINT "Block_blockerId_fkey"
  FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Block"
  ADD CONSTRAINT "Block_blockedId_fkey"
  FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Report
CREATE TABLE "Report" (
  "id"              TEXT NOT NULL,
  "reporterId"      TEXT NOT NULL,
  "targetUserId"    TEXT,
  "targetMessageId" TEXT,
  "targetRunId"     TEXT,
  "reason"          TEXT NOT NULL,
  "details"         TEXT,
  "status"          TEXT NOT NULL DEFAULT 'open',
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt"      TIMESTAMP(3),
  CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Report_status_idx" ON "Report"("status");
CREATE INDEX "Report_targetUserId_idx" ON "Report"("targetUserId");
CREATE INDEX "Report_createdAt_idx" ON "Report"("createdAt");

ALTER TABLE "Report"
  ADD CONSTRAINT "Report_reporterId_fkey"
  FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Report"
  ADD CONSTRAINT "Report_targetUserId_fkey"
  FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
