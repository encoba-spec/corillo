import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

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
        include: {
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

  return NextResponse.json(runs);
}

// POST /api/planned-runs - create a new planned run
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    title,
    description,
    scheduledAt,
    estimatedPace,
    estimatedDistance,
    latitude,
    longitude,
    locationName,
    maxParticipants,
    genderRestriction,
    clubId,
    clubOnly,
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

  const run = await prisma.plannedRun.create({
    data: {
      creatorId: session.user.id,
      title,
      description: description || null,
      scheduledAt: scheduledDate,
      estimatedPace: estimatedPace ? parseFloat(estimatedPace) : null,
      estimatedDistance: estimatedDistance ? parseFloat(estimatedDistance) : null,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      locationName: locationName || null,
      maxParticipants: maxParticipants ? parseInt(maxParticipants) : 10,
      genderRestriction: genderRestriction || null,
      clubId: clubId || null,
      clubOnly: clubOnly === true,
    },
    include: {
      creator: { select: { id: true, name: true, image: true } },
      club: { select: { id: true, name: true, profileImage: true } },
      _count: { select: { participants: true } },
    },
  });

  // Auto-join creator as participant
  await prisma.plannedRunParticipant.create({
    data: { runId: run.id, userId: session.user.id },
  });

  // Send invitations asynchronously
  sendInvitations(
    run.id,
    run.latitude,
    run.longitude,
    session.user.id,
    genderRestriction || null,
    clubId || null,
    clubOnly === true
  ).catch((err) => console.error("[planned-runs] invite error:", err));

  return NextResponse.json(run, { status: 201 });
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
