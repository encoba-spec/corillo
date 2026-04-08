import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/safety-ack — mark that the user has acknowledged safety tips.
 * Called once on first dismissal of the safety modal.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { safetyAckAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
