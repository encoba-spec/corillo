import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getConnectionStatus } from "@/lib/connections";
import { NextResponse } from "next/server";

// GET /api/runners/[id] - get a runner's public profile
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      image: true,
      city: true,
      state: true,
      country: true,
      gender: true,
      stravaAthleteId: true,
      sportRunning: true,
      sportCycling: true,
      longRunPace: true,
      longRunDistance: true,
      raceDistance: true,
      raceTargetTime: true,
      cyclingRoad: true,
      cyclingMountain: true,
      averagePace: true,
      averageDistance: true,
      weeklyFrequency: true,
      preferredTimeSlot: true,
      isDiscoverable: true,
      sharePace: true,
      shareSchedule: true,
      schedulePatterns: {
        select: { dayOfWeek: true, timeSlot: true, frequency: true },
      },
      runningZones: {
        select: { id: true, latitude: true, longitude: true, activityCount: true, radius: true, label: true },
      },
      clubMemberships: {
        include: {
          club: {
            select: { id: true, name: true, profileImage: true },
          },
        },
      },
      races: {
        orderBy: [{ raceDate: "asc" }, { createdAt: "desc" }],
        select: {
          id: true,
          name: true,
          distance: true,
          raceDate: true,
          targetTime: true,
          city: true,
        },
      },
      _count: {
        select: { activities: true },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!user.isDiscoverable) {
    return NextResponse.json({ error: "User is not discoverable" }, { status: 403 });
  }

  // Respect privacy settings
  const profile: any = {
    id: user.id,
    name: user.name,
    image: user.image,
    city: user.city,
    state: user.state,
    country: user.country,
    gender: user.gender,
    stravaAthleteId: user.stravaAthleteId,
    sportRunning: user.sportRunning,
    sportCycling: user.sportCycling,
    raceDistance: user.raceDistance,
    raceTargetTime: user.raceTargetTime,
    cyclingRoad: user.cyclingRoad,
    cyclingMountain: user.cyclingMountain,
    weeklyFrequency: user.weeklyFrequency,
    preferredTimeSlot: user.preferredTimeSlot,
    activityCount: user._count.activities,
    runningZones: user.runningZones,
    clubs: user.clubMemberships.map((m) => ({
      id: m.club.id,
      name: m.club.name,
      profileImage: m.club.profileImage,
    })),
    races: user.races,
  };

  // Connection status from the viewer's perspective
  const { status: connectionStatus, connectionId } = await getConnectionStatus(
    session.user.id,
    user.id
  );
  profile.connectionStatus = connectionStatus;
  profile.connectionId = connectionId;

  // Conditionally share pace/distance
  if (user.sharePace) {
    profile.averagePace = user.averagePace;
    profile.averageDistance = user.averageDistance;
    profile.longRunPace = user.longRunPace;
    profile.longRunDistance = user.longRunDistance;
  }

  // Conditionally share schedule
  if (user.shareSchedule) {
    profile.schedulePatterns = user.schedulePatterns;
  }

  return NextResponse.json(profile);
  } catch (error) {
    console.error("[runners/[id]] Error loading profile:", error);
    return NextResponse.json(
      {
        error: "Failed to load profile",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
