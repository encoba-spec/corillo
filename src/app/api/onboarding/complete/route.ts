import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST /api/onboarding/complete - save preferences and mark the user as onboarded
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const {
    gender,
    sportRunning,
    sportCycling,
    raceDistance,
    isDiscoverable,
    sharePace,
    shareSchedule,
  } = body;

  if (!sportRunning && !sportCycling) {
    return NextResponse.json(
      { error: "Pick at least one sport" },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      gender: gender || null,
      sportRunning: !!sportRunning,
      sportCycling: !!sportCycling,
      raceDistance: raceDistance || null,
      isDiscoverable: isDiscoverable !== false,
      sharePace: sharePace !== false,
      shareSchedule: shareSchedule !== false,
      onboardedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
