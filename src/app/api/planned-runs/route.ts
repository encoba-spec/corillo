import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { addWeeks, addMonths } from "date-fns";

const MAX_INSTANCES = 8;

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

  let where: any = { scheduledAt: { gte: now } };

  if (filter === "mine") {
    where.creatorId = session.user.id;
  } else if (filter === "invited") {
    where.invitations = {
      some: { userId: session.user.id },
    };
  } else if (filter === "club") {
    // Get user's club IDs
    const memberships = await prisma.clubMember.findMany({
      where: { userId: session.user.id },
      select: { clubId: true },
    });
    const clubIds = memberships.map((m) => m.clubId);
    where.clubId = { in: clubIds };
  }

  // Filter out gender-restricted runs that don't match user's gender
  // (unless it's the user's own run)
  if (filter !== "mine") {
    where.OR = [
      { genderRestriction: null },
      { genderRestriction: user?.gender || "any" },
      { creatorId: session.user.id },
    ];
  }

  const runs = await prisma.plannedRun.findMany({
    where,
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
    orderBy: { scheduledAt: "asc" },
    take: 50,
  });

  // For each run, resolve the effective thread id (root thread for series instances).
  // Walk parentRunId once for any rows missing threadId.
  const needRootThread = runs.filter((r) => !r.threadId && r.parentRunId);
  const rootIds = Array.from(new Set(needRootThread.map((r) => r.parentRunId!)));
  const roots = rootIds.length
    ? await prisma.plannedRun.findMany({
        where: { id: { in: rootIds } },
        select: { id: true, threadId: true },
      })
    : [];
  const rootThreadById = new Map(roots.map((r) => [r.id, r.threadId]));

  const enriched = runs.map((r) => ({
    ...r,
    effectiveThreadId:
      r.threadId ?? (r.parentRunId ? rootThreadById.get(r.parentRunId) ?? null : null),
  }));

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

  const validRecurrence =
    recurrence === "weekly" || recurrence === "biweekly" || recurrence === "monthly"
      ? recurrence
      : null;
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

  // Create the root run + its activity-chat thread atomically
  const root = await prisma.$transaction(async (tx) => {
    const created = await tx.plannedRun.create({
      data: {
        ...baseData,
        scheduledAt: scheduledDate,
        recurrence: validRecurrence,
        recurrenceEndAt: seriesEndAt,
      },
      include: {
        creator: { select: { id: true, name: true, image: true } },
        club: { select: { id: true, name: true, profileImage: true } },
        _count: { select: { participants: true } },
      },
    });

    // Activity chat thread, creator is the first member
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

    // Auto-join creator as participant on the root
    await tx.plannedRunParticipant.create({
      data: { runId: created.id, userId: session.user!.id!, response: "going" },
    });

    // Generate recurring instances (instances do NOT get their own thread; they share the root's)
    if (validRecurrence) {
      const instances: { date: Date }[] = [];
      let next = scheduledDate;
      for (let i = 0; i < MAX_INSTANCES; i++) {
        if (validRecurrence === "weekly") next = addWeeks(next, 1);
        else if (validRecurrence === "biweekly") next = addWeeks(next, 2);
        else if (validRecurrence === "monthly") next = addMonths(next, 1);
        if (seriesEndAt && next > seriesEndAt) break;
        instances.push({ date: new Date(next) });
      }

      for (const inst of instances) {
        const child = await tx.plannedRun.create({
          data: {
            ...baseData,
            scheduledAt: inst.date,
            parentRunId: created.id,
          },
        });
        await tx.plannedRunParticipant.create({
          data: { runId: child.id, userId: session.user!.id!, response: "going" },
        });
      }
    }

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
