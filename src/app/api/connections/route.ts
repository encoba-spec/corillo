import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * GET /api/connections
 * Returns the authenticated user's connections, grouped:
 *   - accepted: mutual corillo list
 *   - incoming: pending requests received (addresseeId = me)
 *   - outgoing: pending requests sent (requesterId = me)
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const me = session.user.id;

  const userSelect = {
    id: true,
    name: true,
    image: true,
    city: true,
    state: true,
    country: true,
    stravaAthleteId: true,
    averagePace: true,
    averageDistance: true,
    weeklyFrequency: true,
    preferredTimeSlot: true,
  } as const;

  const connections = await prisma.connection.findMany({
    where: {
      OR: [{ requesterId: me }, { addresseeId: me }],
    },
    include: {
      requester: { select: userSelect },
      addressee: { select: userSelect },
    },
    orderBy: { updatedAt: "desc" },
  });

  const accepted = connections
    .filter((c) => c.status === "accepted")
    .map((c) => ({
      id: c.id,
      createdAt: c.createdAt,
      user: c.requesterId === me ? c.addressee : c.requester,
    }));

  const incoming = connections
    .filter((c) => c.status === "pending" && c.addresseeId === me)
    .map((c) => ({
      id: c.id,
      createdAt: c.createdAt,
      user: c.requester,
    }));

  const outgoing = connections
    .filter((c) => c.status === "pending" && c.requesterId === me)
    .map((c) => ({
      id: c.id,
      createdAt: c.createdAt,
      user: c.addressee,
    }));

  return NextResponse.json({ accepted, incoming, outgoing });
}

/**
 * POST /api/connections
 * Body: { userId: string }
 * Sends a connection request from the current user to the target user.
 * If a declined request exists, it is reset to pending.
 * If an accepted or pending connection already exists, returns it unchanged.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const me = session.user.id;

  const body = await request.json();
  const { userId } = body;

  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  if (userId === me) {
    return NextResponse.json(
      { error: "Cannot connect with yourself" },
      { status: 400 }
    );
  }

  // Target must exist and be on the app (have a stravaAthleteId)
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, stravaAthleteId: true },
  });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (target.stravaAthleteId == null) {
    return NextResponse.json(
      { error: "User is not on corillo yet" },
      { status: 400 }
    );
  }

  // Check for existing connection in either direction
  const existing = await prisma.connection.findFirst({
    where: {
      OR: [
        { requesterId: me, addresseeId: userId },
        { requesterId: userId, addresseeId: me },
      ],
    },
  });

  // If they already sent me a request, auto-accept it
  if (
    existing &&
    existing.status === "pending" &&
    existing.addresseeId === me
  ) {
    const updated = await prisma.connection.update({
      where: { id: existing.id },
      data: { status: "accepted" },
    });
    return NextResponse.json(updated);
  }

  // If already accepted or pending from me, return as-is
  if (
    existing &&
    (existing.status === "accepted" ||
      (existing.status === "pending" && existing.requesterId === me))
  ) {
    return NextResponse.json(existing);
  }

  // If declined previously, revive the request
  if (existing && existing.status === "declined") {
    const updated = await prisma.connection.update({
      where: { id: existing.id },
      data: {
        status: "pending",
        requesterId: me,
        addresseeId: userId,
      },
    });
    return NextResponse.json(updated);
  }

  // Create fresh request
  const conn = await prisma.connection.create({
    data: {
      requesterId: me,
      addresseeId: userId,
      status: "pending",
    },
  });
  return NextResponse.json(conn, { status: 201 });
}
