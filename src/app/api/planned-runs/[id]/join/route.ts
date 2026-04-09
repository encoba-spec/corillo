import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * Lazily create a chat thread for a planned run that doesn't have one yet.
 * Only needed for legacy rows created before per-activity chat existed.
 */
async function ensureThread(runId: string, creatorUserId: string) {
  const existing = await prisma.plannedRun.findUnique({
    where: { id: runId },
    select: { threadId: true },
  });
  if (existing?.threadId) return existing.threadId;
  const thread = await prisma.thread.create({
    data: {
      activityRunId: runId,
      members: { create: [{ userId: creatorUserId }] },
    },
  });
  await prisma.plannedRun.update({
    where: { id: runId },
    data: { threadId: thread.id },
  });
  return thread.id;
}

// POST /api/planned-runs/[id]/join - join (or update RSVP for) a planned run
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: runId } = await params;
  const userId = session.user.id;

  const body = await request.json().catch(() => ({}));
  const responseRaw = body?.response;
  const response: "going" | "maybe" =
    responseRaw === "maybe" ? "maybe" : "going";

  const run = await prisma.plannedRun.findUnique({
    where: { id: runId },
    select: {
      id: true,
      creatorId: true,
      genderRestriction: true,
      clubOnly: true,
      clubId: true,
    },
  });

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  if (run.genderRestriction) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { gender: true },
    });
    if (user?.gender !== run.genderRestriction) {
      return NextResponse.json(
        { error: "This run is restricted by gender" },
        { status: 403 }
      );
    }
  }

  if (run.clubOnly && run.clubId) {
    const membership = await prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId: run.clubId, userId } },
    });
    if (!membership) {
      return NextResponse.json(
        { error: "This run is for club members only" },
        { status: 403 }
      );
    }
  }

  // Upsert participation so going <-> maybe is a no-friction toggle
  await prisma.plannedRunParticipant.upsert({
    where: { runId_userId: { runId, userId } },
    create: { runId, userId, response },
    update: { response },
  });

  // Mirror RSVP onto any matching invitation
  await prisma.runInvitation.updateMany({
    where: { runId, userId },
    data: { status: response === "going" ? "accepted" : "maybe" },
  });

  // Add user to the activity chat thread (creates it if missing for legacy rows)
  const threadId = await ensureThread(runId, run.creatorId);
  await prisma.threadMember.upsert({
    where: { threadId_userId: { threadId, userId } },
    create: { threadId, userId },
    update: {},
  });

  return NextResponse.json({ joined: true, response, threadId });
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
  const userId = session.user.id;

  const run = await prisma.plannedRun.findUnique({
    where: { id: runId },
    select: { id: true, creatorId: true, threadId: true },
  });

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  if (run.creatorId === userId) {
    return NextResponse.json(
      { error: "Creator cannot leave their own run" },
      { status: 400 }
    );
  }

  await prisma.plannedRunParticipant.deleteMany({
    where: { runId, userId },
  });

  // Leaving an activity also removes you from its persistent chat
  if (run.threadId) {
    await prisma.threadMember.deleteMany({
      where: { threadId: run.threadId, userId },
    });
  }

  return NextResponse.json({ left: true });
}
