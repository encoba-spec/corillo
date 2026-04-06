-- Add per-club planned activity notification opt-in
ALTER TABLE "ClubMember" ADD COLUMN IF NOT EXISTS "notifyPlannedActivities" BOOLEAN NOT NULL DEFAULT false;
