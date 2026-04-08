import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * Resolve the root planned-run id (the series root) and its thread id.
 * For one-offs the run IS its own root.
 */
async function resolveRoot(runId: string) {
  const run = await prisma.plannedRun.findUnique({
    where: { id: runId },
    select: { id: true, parentRunId: true, threadId: true },
  });
  if (!run) return null;
  if (!run.parentRunId) return run; // already the root
  const root = await prisma.plannedRun.findUnique({
    where: { id: run.parentRunId },
    select: { id: true, parentRunId: true, threadId: true },
  });
  return root;
}

/** Lazily create a chat thread for a root that doesn't have one yet (legacy rows). */
async function ensureRootThread(rootId: string, creatorUserId: string) {
  const existing = await prisma.plannedRun.findUnique({
    where: { id: rootId },
    select: { threadId: true },
  });
  if (existing?.threadId) return existing.threadId;
  const thread = await prisma.thread.create({
    data: {
      activityRunId: rootId,
      members: { create: [{ userId: creatorUserId }] },
    },
  });
  await prisma.plannedRun.update({
    where: { id: rootId },
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
      parentRunId: true,
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

  // Update invitation status to mirror RSVP
  await prisma.runInvitation.updateMany({
    where: { runId, userId },
    data: { status: response === "going" ? "accepted" : "maybe" },
  });

  // Add user to the activity chat thread on the effective root
  const effectiveRootId = run.parentRunId ?? run.id;
  const threadId = await ensureRootThread(effectiveRootId, run.creatorId);
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
    select: { id: true, creatorId: true, parentRunId: true },
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

  // Only remove from the chat thread if the user is no longer in any sibling
  // instance of the same series (so they don't lose chat for other dates).
  const rootId = run.parentRunId ?? run.id;
  const stillInSeries = await prisma.plannedRunParticipant.findFirst({
    where: {
      userId,
      run: { OR: [{ id: rootId }, { parentRunId: rootId }] },
    },
    select: { id: true },
  });

  if (!stillInSeries) {
    const root = await prisma.plannedRun.findUnique({
      where: { id: rootId },
      select: { threadId: true },
    });
    if (root?.threadId) {
      await prisma.threadMember.deleteMany({
        where: { threadId: root.threadId, userId },
      });
    }
  }

  return NextResponse.json({ left: true });
}
