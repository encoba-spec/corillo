import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// PATCH /api/clubs/[clubId]/notifications - toggle planned-activity notifications for current user
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { clubId } = await params;
  const body = await request.json();
  const notify = body?.notifyPlannedActivities;
  if (typeof notify !== "boolean") {
    return NextResponse.json(
      { error: "notifyPlannedActivities must be a boolean" },
      { status: 400 }
    );
  }

  const membership = await prisma.clubMember.findUnique({
    where: { clubId_userId: { clubId, userId: session.user.id } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Not a member of this club" }, { status: 404 });
  }

  const updated = await prisma.clubMember.update({
    where: { clubId_userId: { clubId, userId: session.user.id } },
    data: { notifyPlannedActivities: notify },
  });

  return NextResponse.json({
    clubId: updated.clubId,
    notifyPlannedActivities: updated.notifyPlannedActivities,
  });
}
