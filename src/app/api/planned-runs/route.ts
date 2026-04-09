import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkContent } from "@/lib/moderation/filter";
import {
  isValidRecurrence,
  nextOccurrence,
} from "@/lib/planned-runs/recurrence";

// GET /api/planned-runs - list upcoming runs
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const filter = url.searchParams.get("filter") || "upcoming"; // upcoming | mine | invited | club

  const now = new Date();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { gender: true },
  });

  // A row is considered "still listable" when:
  //  - it's a one-off with scheduledAt in the future, OR
  //  - it's a recurring series whose recurrenceEndAt is null or in the future.
  // (The recurring `scheduledAt` is the series start, which may be in the past.)
  const listableConditions: Record<string, unknown>[] = [
    { recurrence: null, scheduledAt: { gte: now } },
    {
      recurrence: { not: null },
      OR: [
        { recurrenceEndAt: null },
        { recurrenceEndAt: { gte: now } },
      ],
    },
  ];

  const andClauses: Record<string, unknown>[] = [{ OR: listableConditions }];

  if (filter === "mine") {
    andClauses.push({ creatorId: session.user.id });
  } else if (filter === "invited") {
    andClauses.push({
      invitations: { some: { userId: session.user.id } },
    });
  } else if (filter === "club") {
    // Get user's club IDs
    const memberships = await prisma.clubMember.findMany({
      where: { userId: session.user.id },
      select: { clubId: true },
    });
    const clubIds = memberships.map((m) => m.clubId);
    andClauses.push({ clubId: { in: clubIds } });
  }

  // Gender-restricted runs only visible to matching users (or the creator)
  if (filter !== "mine") {
    andClauses.push({
      OR: [
        { genderRestriction: null },
        { genderRestriction: user?.gender || "any" },
        { creatorId: session.user.id },
      ],
    });
  }

  const runs = await prisma.plannedRun.findMany({
    where: { AND: andClauses },
    include: {
      creator: {
        select: { id: true, name: true, image: true },
      },
      club: {
        select: { id: true, name: true, profileImage: true },
      },
      participants: {
        select: {
          response: true,
          user: { select: { id: true, name: true, image: true } },
        },
      },
      invitations: {
        where: { userId: session.user.id },
        select: { status: true },
      },
      _count: { select: { participants: true } },
    },
    take: 200,
  });

  // Compute nextOccurrenceAt for each row and sort by it
  const enriched = runs
    .map((r) => {
      const recurrence = isValidRecurrence(r.recurrence) ? r.recurrence : null;
      const nextAt = nextOccurrence(
        r.scheduledAt,
        recurrence,
        r.recurrenceEndAt ?? null,
        now
      );
      return {
        ...r,
        nextOccurrenceAt: nextAt,
        // Legacy alias — some older clients may still read this key
        effectiveThreadId: r.threadId,
      };
    })
    .filter((r) => r.nextOccurrenceAt !== null)
    .sort(
      (a, b) =>
        (a.nextOccurrenceAt as Date).getTime() -
        (b.nextOccurrenceAt as Date).getTime()
    )
    .slice(0, 50);

  return NextResponse.json(enriched);
}

// POST /api/planned-runs - create a new planned run
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    activityType,
    title,
    description,
    scheduledAt,
    estimatedPace,
    estimatedSpeed,
    estimatedDistance,
    terrainType,
    latitude,
    longitude,
    locationName,
    maxParticipants,
    genderRestriction,
    clubId,
    clubOnly,
    recurrence,
    recurrenceEndAt,
  } = body;

  if (!title || !scheduledAt || latitude == null || longitude == null) {
    return NextResponse.json(
      { error: "Title, date, and location are required" },
      { status: 400 }
    );
  }

  // Objectionable content filter
  const titleCheck = checkContent(title);
  if (!titleCheck.ok) {
    return NextResponse.json({ error: titleCheck.reason }, { status: 400 });
  }
  if (description) {
    const descCheck = checkContent(description);
    if (!descCheck.ok) {
      return NextResponse.json({ error: descCheck.reason }, { status: 400 });
    }
  }

  const scheduledDate = new Date(scheduledAt);
  if (scheduledDate <= new Date()) {
    return NextResponse.json(
      { error: "Scheduled time must be in the future" },
      { status: 400 }
    );
  }

  // Validate club membership if club-associated
  if (clubId) {
    const membership = await prisma.clubMember.findUnique({
      where: {
        clubId_userId: { clubId, userId: session.user.id },
      },
    });
    if (!membership) {
      return NextResponse.json(
        { error: "You must be a member of this club" },
        { status: 403 }
      );
    }
  }

  const validRecurrence = isValidRecurrence(recurrence) ? recurrence : null;
  const seriesEndAt = recurrenceEndAt ? new Date(recurrenceEndAt) : null;

  const baseData = {
    creatorId: session.user.id,
    activityType: activityType || "run",
    title,
    description: description || null,
    estimatedPace: estimatedPace ? parseFloat(estimatedPace) : null,
    estimatedSpeed: estimatedSpeed ? parseFloat(estimatedSpeed) : null,
    estimatedDistance: estimatedDistance ? parseFloat(estimatedDistance) : null,
    terrainType: terrainType || null,
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    locationName: locationName || null,
    maxParticipants: maxParticipants ? parseInt(maxParticipants) : 10,
    genderRestriction: genderRestriction || null,
    clubId: clubId || null,
    clubOnly: clubOnly === true,
  };

  // Create a single planned-run row (even for recurring series) plus its
  // persistent chat thread, atomically. Recurring occurrences are computed
  // on the fly and never materialized as additional rows.
  const root = await prisma.$transaction(async (tx) => {
    const created = await tx.plannedRun.create({
      data: {
        ...baseData,
        scheduledAt: scheduledDate,
        recurrence: validRecurrence,
        recurrenceEndAt: seriesEndAt,
      },
    });

    const thread = await tx.thread.create({
      data: {
        activityRunId: created.id,
        members: { create: [{ userId: session.user!.id! }] },
      },
    });

    const withThread = await tx.plannedRun.update({
      where: { id: created.id },
      data: { threadId: thread.id },
      include: {
        creator: { select: { id: true, name: true, image: true } },
        club: { select: { id: true, name: true, profileImage: true } },
        _count: { select: { participants: true } },
      },
    });

    await tx.plannedRunParticipant.create({
      data: { runId: created.id, userId: session.user!.id!, response: "going" },
    });

    return withThread;
  });

  // Send invitations asynchronously (root only)
  sendInvitations(
    root.id,
    root.latitude,
    root.longitude,
    session.user.id,
    genderRestriction || null,
    clubId || null,
    clubOnly === true
  ).catch((err) => console.error("[planned-runs] invite error:", err));

  return NextResponse.json(root, { status: 201 });
}

// Send invitations based on location, club, and gender filters
async function sendInvitations(
  runId: string,
  lat: number,
  lng: number,
  creatorId: string,
  genderRestriction: string | null,
  clubId: string | null,
  clubOnly: boolean
) {
  if (clubOnly && clubId) {
    // Club-only run: invite all club members
    const members = await prisma.clubMember.findMany({
      where: { clubId, userId: { not: creatorId } },
      include: {
        user: {
          select: {
            id: true,
            gender: true,
            runNotifications: true,
            isDiscoverable: true,
          },
        },
      },
    });

    const eligible = members.filter((m) => {
      if (m.user.runNotifications === "none") return false;
      if (genderRestriction && m.user.gender !== genderRestriction) return false;
      return true;
    });

    if (eligible.length > 0) {
      await prisma.runInvitation.createMany({
        data: eligible.map((m) => ({ runId, userId: m.user.id })),
        skipDuplicates: true,
      });
    }
    return;
  }

  // Location-based invitations (+ club members if club is set but not club-only)
  const RADIUS_KM = 10;

  const nearbyUsers: { userId: string }[] = await prisma.$queryRaw`
    SELECT DISTINCT rz."userId"
    FROM "RunningZone" rz
    WHERE ST_DWithin(
      rz.center::geography,
      ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
      ${RADIUS_KM * 1000}
    )
    AND rz."userId" != ${creatorId}
  `;

  let userIds = nearbyUsers.map((u) => u.userId);

  // Also include club members if club-associated
  if (clubId) {
    const clubMembers = await prisma.clubMember.findMany({
      where: { clubId, userId: { not: creatorId } },
      select: { userId: true },
    });
    const clubUserIds = clubMembers.map((m) => m.userId);
    userIds = [...new Set([...userIds, ...clubUserIds])];
  }

  if (userIds.length === 0) return;

  const userFilter: any = {
    id: { in: userIds },
    runNotifications: { not: "none" },
  };

  // Apply gender restriction
  if (genderRestriction) {
    userFilter.gender = genderRestriction;
  }

  const users = await prisma.user.findMany({
    where: userFilter,
    select: { id: true },
  });

  if (users.length > 0) {
    await prisma.runInvitation.createMany({
      data: users.map((u) => ({ runId, userId: u.id })),
      skipDuplicates: true,
    });
  }
}
