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
    // Self-reported (Apple-only path)
    city,
    state,
    selfReportedPace,
    selfReportedDistance,
    selfReportedFrequency,
    // Age gate (required, App Store 17+)
    ageConfirmed,
  } = body;

  if (!sportRunning && !sportCycling) {
    return NextResponse.json(
      { error: "Pick at least one sport" },
      { status: 400 }
    );
  }

  if (ageConfirmed !== true) {
    return NextResponse.json(
      { error: "You must confirm you are 17 or older to use corillo." },
      { status: 400 }
    );
  }

  const data: Record<string, unknown> = {
    gender: gender || null,
    sportRunning: !!sportRunning,
    sportCycling: !!sportCycling,
    raceDistance: raceDistance || null,
    isDiscoverable: isDiscoverable !== false,
    sharePace: sharePace !== false,
    shareSchedule: shareSchedule !== false,
    onboardedAt: new Date(),
    ageConfirmedAt: new Date(),
  };

  // Apple-only fields: only set if provided (don't overwrite Strava-derived
  // city/state/country for users who have Strava data).
  if (typeof city === "string" && city.trim()) data.city = city.trim();
  if (typeof state === "string" && state.trim()) data.state = state.trim();
  if (selfReportedPace != null && !isNaN(Number(selfReportedPace))) {
    data.selfReportedPace = Number(selfReportedPace);
  }
  if (selfReportedDistance != null && !isNaN(Number(selfReportedDistance))) {
    data.selfReportedDistance = Number(selfReportedDistance);
  }
  if (selfReportedFrequency != null && !isNaN(Number(selfReportedFrequency))) {
    data.selfReportedFrequency = Number(selfReportedFrequency);
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data,
  });

  return NextResponse.json({ ok: true });
}
