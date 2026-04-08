import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/blocks — list users the current user has blocked. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const blocks = await prisma.block.findMany({
    where: { blockerId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      blocked: {
        select: {
          id: true,
          name: true,
          image: true,
          city: true,
          state: true,
        },
      },
    },
  });

  return NextResponse.json({ blocks });
}

/**
 * POST /api/blocks
 * body: { userId: string }
 * Creates a block and removes any existing connection + DM thread membership.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const me = session.user.id;
  const body = await request.json().catch(() => ({}));
  const targetId: string | undefined = body.userId;

  if (!targetId || typeof targetId !== "string") {
    return NextResponse.json(
      { error: "userId is required" },
      { status: 400 }
    );
  }
  if (targetId === me) {
    return NextResponse.json(
      { error: "cannot block yourself" },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true },
  });
  if (!target) {
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    // Create (or find existing) block
    await tx.block.upsert({
      where: {
        blockerId_blockedId: { blockerId: me, blockedId: targetId },
      },
      create: { blockerId: me, blockedId: targetId },
      update: {},
    });

    // Remove any connection between them (both directions)
    await tx.connection.deleteMany({
      where: {
        OR: [
          { requesterId: me, addresseeId: targetId },
          { requesterId: targetId, addresseeId: me },
        ],
      },
    });

    // Remove them from any 1:1 DM thread we share (keep activity threads
    // — those are group chats and would disrupt the whole group).
    const sharedDmThreads = await tx.thread.findMany({
      where: {
        activityRunId: null,
        members: { some: { userId: me } },
        AND: { members: { some: { userId: targetId } } },
      },
      select: { id: true },
    });
    if (sharedDmThreads.length > 0) {
      await tx.threadMember.deleteMany({
        where: {
          threadId: { in: sharedDmThreads.map((t) => t.id) },
        },
      });
    }
  });

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/blocks?userId=...
 * Unblock a user. Connections are NOT auto-restored.
 */
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const targetId = searchParams.get("userId");
  if (!targetId) {
    return NextResponse.json(
      { error: "userId is required" },
      { status: 400 }
    );
  }

  await prisma.block
    .delete({
      where: {
        blockerId_blockedId: {
          blockerId: session.user.id,
          blockedId: targetId,
        },
      },
    })
    .catch(() => null);

  return NextResponse.json({ ok: true });
}
