import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST /api/planned-runs/[id]/join - join a planned run
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: runId } = await params;

  const run = await prisma.plannedRun.findUnique({
    where: { id: runId },
    include: { _count: { select: { participants: true } } },
  });

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  if (run._count.participants >= run.maxParticipants) {
    return NextResponse.json({ error: "Run is full" }, { status: 400 });
  }

  // Check gender restriction
  if (run.genderRestriction) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { gender: true },
    });
    if (user?.gender !== run.genderRestriction) {
      return NextResponse.json(
        { error: "This run is restricted by gender" },
        { status: 403 }
      );
    }
  }

  // Check club-only restriction
  if (run.clubOnly && run.clubId) {
    const membership = await prisma.clubMember.findUnique({
      where: {
        clubId_userId: { clubId: run.clubId, userId: session.user.id },
      },
    });
    if (!membership) {
      return NextResponse.json(
        { error: "This run is for club members only" },
        { status: 403 }
      );
    }
  }

  try {
    await prisma.plannedRunParticipant.create({
      data: { runId, userId: session.user.id },
    });

    // Update invitation status if exists
    await prisma.runInvitation.updateMany({
      where: { runId, userId: session.user.id },
      data: { status: "accepted" },
    });

    return NextResponse.json({ joined: true });
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: "Already joined" }, { status: 400 });
    }
    throw err;
  }
}

// DELETE /api/planned-runs/[id]/join - leave a planned run
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: runId } = await params;

  const run = await prisma.plannedRun.findUnique({
    where: { id: runId },
  });

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  if (run.creatorId === session.user.id) {
    return NextResponse.json(
      { error: "Creator cannot leave their own run" },
      { status: 400 }
    );
  }

  await prisma.plannedRunParticipant.deleteMany({
    where: { runId, userId: session.user.id },
  });

  return NextResponse.json({ left: true });
}
