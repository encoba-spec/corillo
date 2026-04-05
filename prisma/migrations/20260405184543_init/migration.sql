-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "image" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "stravaAthleteId" INTEGER,
    "stravaAccessToken" TEXT,
    "stravaRefreshToken" TEXT,
    "stravaTokenExpires" TIMESTAMP(3),
    "averagePace" DOUBLE PRECISION,
    "averageDistance" DOUBLE PRECISION,
    "weeklyFrequency" DOUBLE PRECISION,
    "preferredDays" INTEGER[],
    "preferredTimeSlot" TEXT,
    "isDiscoverable" BOOLEAN NOT NULL DEFAULT false,
    "locationPrecision" TEXT NOT NULL DEFAULT 'neighborhood',
    "shareSchedule" BOOLEAN NOT NULL DEFAULT true,
    "sharePace" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stravaActivityId" BIGINT NOT NULL,
    "sportType" TEXT NOT NULL,
    "name" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "elapsedTime" INTEGER NOT NULL,
    "movingTime" INTEGER,
    "distance" DOUBLE PRECISION NOT NULL,
    "averageSpeed" DOUBLE PRECISION,
    "startLatitude" DOUBLE PRECISION,
    "startLongitude" DOUBLE PRECISION,
    "endLatitude" DOUBLE PRECISION,
    "endLongitude" DOUBLE PRECISION,
    "dayOfWeek" INTEGER NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "startPoint" geometry(Point,4326),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RunningZone" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "activityCount" INTEGER NOT NULL,
    "radius" DOUBLE PRECISION NOT NULL,
    "label" TEXT,
    "center" geometry(Point,4326),

    CONSTRAINT "RunningZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchedulePattern" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "frequency" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SchedulePattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "maxDistanceKm" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "preferredDays" INTEGER[],
    "preferredTimeSlots" TEXT[],
    "minPace" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "maxPace" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "minDistance" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "maxDistance" DOUBLE PRECISION NOT NULL DEFAULT 50.0,

    CONSTRAINT "SearchPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlannedRun" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "estimatedPace" DOUBLE PRECISION,
    "estimatedDistance" DOUBLE PRECISION,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "locationName" TEXT,
    "maxParticipants" INTEGER NOT NULL DEFAULT 10,
    "meetingPoint" geometry(Point,4326),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlannedRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlannedRunParticipant" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlannedRunParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Thread" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Thread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreadMember" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3),

    CONSTRAINT "ThreadMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_stravaAthleteId_key" ON "User"("stravaAthleteId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_stravaActivityId_key" ON "Activity"("stravaActivityId");

-- CreateIndex
CREATE INDEX "Activity_userId_idx" ON "Activity"("userId");

-- CreateIndex
CREATE INDEX "Activity_startDate_idx" ON "Activity"("startDate");

-- CreateIndex
CREATE INDEX "RunningZone_userId_idx" ON "RunningZone"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SchedulePattern_userId_dayOfWeek_timeSlot_key" ON "SchedulePattern"("userId", "dayOfWeek", "timeSlot");

-- CreateIndex
CREATE UNIQUE INDEX "SearchPreferences_userId_key" ON "SearchPreferences"("userId");

-- CreateIndex
CREATE INDEX "PlannedRun_scheduledAt_idx" ON "PlannedRun"("scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlannedRunParticipant_runId_userId_key" ON "PlannedRunParticipant"("runId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ThreadMember_threadId_userId_key" ON "ThreadMember"("threadId", "userId");

-- CreateIndex
CREATE INDEX "Message_threadId_createdAt_idx" ON "Message"("threadId", "createdAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunningZone" ADD CONSTRAINT "RunningZone_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchedulePattern" ADD CONSTRAINT "SchedulePattern_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchPreferences" ADD CONSTRAINT "SearchPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedRun" ADD CONSTRAINT "PlannedRun_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedRunParticipant" ADD CONSTRAINT "PlannedRunParticipant_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PlannedRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedRunParticipant" ADD CONSTRAINT "PlannedRunParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadMember" ADD CONSTRAINT "ThreadMember_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadMember" ADD CONSTRAINT "ThreadMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
