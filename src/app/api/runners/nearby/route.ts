import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { findNearbyRunners, getRunningZonesForUsers, getUserZones } from "@/lib/geo/queries";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/runners/nearby
 * Returns nearby runners and their zones for map display.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const maxDistanceKm = parseFloat(params.get("maxDistanceKm") ?? "10");

  // Get user's search preferences
  const prefs = await prisma.searchPreferences.findUnique({
    where: { userId: session.user.id },
  });

  try {
    const nearby = await findNearbyRunners(
      session.user.id,
      maxDistanceKm,
      {
        minPace: prefs?.minPace ?? undefined,
        maxPace: prefs?.maxPace ?? undefined,
        minDistance: prefs?.minDistance ?? undefined,
        maxDistance: prefs?.maxDistance ?? undefined,
      }
    );

    // Get all zones for map display
    const userIds = nearby.map((r) => r.userId);
    const zones = await getRunningZonesForUsers(userIds);
    const myZones = await getUserZones(session.user.id);

    return NextResponse.json({
      runners: nearby,
      zones,
      myZones,
    });
  } catch (error) {
    console.error("[nearby] Error:", error);
    return NextResponse.json(
      { error: "Failed to find nearby runners" },
      { status: 500 }
    );
  }
}
