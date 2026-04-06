import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { areConnected } from "@/lib/connections";
import { NextResponse } from "next/server";

// GET /api/messages/[threadId] - get messages in a thread
export async function GET(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { threadId } = await params;

  // Verify user is a member
  const membership = await prisma.threadMember.findUnique({
    where: {
      threadId_userId: { threadId, userId: session.user.id },
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const messages = await prisma.message.findMany({
    where: { threadId },
    include: {
      sender: { select: { id: true, name: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  // Mark as read
  await prisma.threadMember.update({
    where: {
      threadId_userId: { threadId, userId: session.user.id },
    },
    data: { lastReadAt: new Date() },
  });

  return NextResponse.json(messages);
}

// POST /api/messages/[threadId] - send a message in a thread
export async function POST(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { threadId } = await params;
  const body = await request.json();
  const { content } = body;

  if (!content?.trim()) {
    return NextResponse.json(
      { error: "Message content is required" },
      { status: 400 }
    );
  }

  // Verify user is a member
  const membership = await prisma.threadMember.findUnique({
    where: {
      threadId_userId: { threadId, userId: session.user.id },
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  // Gate: must still be connected with the other member(s) of the thread
  const otherMembers = await prisma.threadMember.findMany({
    where: { threadId, NOT: { userId: session.user.id } },
    select: { userId: true },
  });
  for (const om of otherMembers) {
    const ok = await areConnected(session.user.id, om.userId);
    if (!ok) {
      return NextResponse.json(
        {
          error:
            "You are no longer connected with this athlete. Reconnect to continue messaging.",
        },
        { status: 403 }
      );
    }
  }

  const message = await prisma.message.create({
    data: {
      threadId,
      senderId: session.user.id,
      content: content.trim(),
    },
    include: {
      sender: { select: { id: true, name: true, image: true } },
    },
  });

  // Update thread timestamp
  await prisma.thread.update({
    where: { id: threadId },
    data: { updatedAt: new Date() },
  });

  // Mark as read for sender
  await prisma.threadMember.update({
    where: {
      threadId_userId: { threadId, userId: session.user.id },
    },
    data: { lastReadAt: new Date() },
  });

  return NextResponse.json(message, { status: 201 });
}
