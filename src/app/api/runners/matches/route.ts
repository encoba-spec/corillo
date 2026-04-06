import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { findMatches } from "@/lib/matching/engine";

/**
 * GET /api/runners/matches
 * Returns compatibility-ranked matches for the authenticated user.
 * Supports filter overrides via query params.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;

  // Parse optional filter overrides
  const overrides: Record<string, unknown> = {};
  if (params.has("maxDistanceKm"))
    overrides.maxDistanceKm = parseFloat(params.get("maxDistanceKm")!);
  if (params.has("minPace"))
    overrides.minPace = parseFloat(params.get("minPace")!);
  if (params.has("maxPace"))
    overrides.maxPace = parseFloat(params.get("maxPace")!);
  if (params.has("minDistance"))
    overrides.minDistance = parseFloat(params.get("minDistance")!);
  if (params.has("maxDistance"))
    overrides.maxDistance = parseFloat(params.get("maxDistance")!);
  if (params.has("preferredDays"))
    overrides.preferredDays = params
      .get("preferredDays")!
      .split(",")
      .map(Number);
  if (params.has("preferredTimeSlots"))
    overrides.preferredTimeSlots = params
      .get("preferredTimeSlots")!
      .split(",");

  // Training-specific filters
  if (params.has("raceDistance"))
    overrides.raceDistance = params.get("raceDistance")!;
  if (params.has("raceTargetTime"))
    overrides.raceTargetTime = params.get("raceTargetTime")!;
  if (params.has("raceTargetTimeTolerance"))
    overrides.raceTargetTimeTolerance = parseFloat(params.get("raceTargetTimeTolerance")!);
  if (params.has("longRunDistance"))
    overrides.longRunDistance = parseFloat(params.get("longRunDistance")!);
  if (params.has("longRunDistanceTolerance"))
    overrides.longRunDistanceTolerance = parseFloat(params.get("longRunDistanceTolerance")!);
  if (params.has("longRunPace"))
    overrides.longRunPace = parseFloat(params.get("longRunPace")!);
  if (params.has("longRunPaceTolerance"))
    overrides.longRunPaceTolerance = parseFloat(params.get("longRunPaceTolerance")!);

  try {
    const matches = await findMatches(session.user.id, overrides);
    return NextResponse.json(matches);
  } catch (error) {
    console.error("[matches] Error:", error);
    return NextResponse.json(
      { error: "Failed to find matches" },
      { status: 500 }
    );
  }
}
