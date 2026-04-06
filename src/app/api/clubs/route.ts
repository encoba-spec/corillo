import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/clubs - get current user's clubs
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await prisma.clubMember.findMany({
    where: { userId: session.user.id },
    include: {
      club: true,
    },
    orderBy: { club: { name: "asc" } },
  });

  return NextResponse.json(
    memberships.map((m) => ({
      ...m.club,
      role: m.role,
      notifyPlannedActivities: m.notifyPlannedActivities,
    }))
  );
}
