import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { areConnected } from "@/lib/connections";
import { NextResponse } from "next/server";

// GET /api/messages - get user's threads
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const threads = await prisma.thread.findMany({
    where: {
      members: { some: { userId: session.user.id } },
    },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, image: true } },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          sender: { select: { id: true, name: true } },
        },
      },
      activityRun: {
        select: {
          id: true,
          title: true,
          scheduledAt: true,
          activityType: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Add unread count for current user
  const threadsWithUnread = threads.map((thread) => {
    const membership = thread.members.find(
      (m) => m.userId === session.user!.id
    );
    const lastReadAt = membership?.lastReadAt || new Date(0);
    const lastMessage = thread.messages[0];
    const hasUnread = lastMessage && lastMessage.createdAt > lastReadAt;

    return {
      ...thread,
      hasUnread,
      isActivity: thread.activityRunId != null,
      otherMembers: thread.members
        .filter((m) => m.userId !== session.user!.id)
        .map((m) => m.user),
    };
  });

  return NextResponse.json(threadsWithUnread);
}

// POST /api/messages - create or find a thread with a user and send first message
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { recipientId, content } = body;

  if (!recipientId || !content?.trim()) {
    return NextResponse.json(
      { error: "Recipient and message content are required" },
      { status: 400 }
    );
  }

  if (recipientId === session.user.id) {
    return NextResponse.json(
      { error: "Cannot message yourself" },
      { status: 400 }
    );
  }

  // Gate: you can only start a conversation with a mutual corillo connection
  const connected = await areConnected(session.user.id, recipientId);
  if (!connected) {
    return NextResponse.json(
      {
        error:
          "You can only message athletes in your corillo. Send a connection request first.",
      },
      { status: 403 }
    );
  }

  // Check if thread already exists between these two users
  const existingThread = await prisma.thread.findFirst({
    where: {
      AND: [
        { members: { some: { userId: session.user.id } } },
        { members: { some: { userId: recipientId } } },
      ],
    },
  });

  let threadId: string;

  if (existingThread) {
    threadId = existingThread.id;
  } else {
    // Create new thread
    const thread = await prisma.thread.create({
      data: {
        members: {
          create: [
            { userId: session.user.id },
            { userId: recipientId },
          ],
        },
      },
    });
    threadId = thread.id;
  }

  // Create message
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
  await prisma.threadMember.updateMany({
    where: { threadId, userId: session.user.id },
    data: { lastReadAt: new Date() },
  });

  return NextResponse.json({ threadId, message }, { status: 201 });
}
