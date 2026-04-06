import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/invitations - get current user's pending invitations
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invitations = await prisma.runInvitation.findMany({
    where: {
      userId: session.user.id,
      status: "pending",
      run: { scheduledAt: { gte: new Date() } },
    },
    include: {
      run: {
        include: {
          creator: { select: { id: true, name: true, image: true } },
          _count: { select: { participants: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(invitations);
}

// PUT /api/invitations - respond to invitation
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { invitationId, status } = body;

  if (!invitationId || !["accepted", "declined"].includes(status)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const invitation = await prisma.runInvitation.findFirst({
    where: { id: invitationId, userId: session.user.id },
  });

  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  await prisma.runInvitation.update({
    where: { id: invitationId },
    data: { status },
  });

  // If accepted, also join as participant
  if (status === "accepted") {
    try {
      await prisma.plannedRunParticipant.create({
        data: { runId: invitation.runId, userId: session.user.id },
      });
    } catch (err: any) {
      // Already joined, that's fine
      if (err.code !== "P2002") throw err;
    }
  }

  return NextResponse.json({ updated: true });
}
