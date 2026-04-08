/**
 * PostGIS spatial queries for finding nearby runners.
 * Uses $queryRawUnsafe for ST_DWithin and ST_Distance.
 */

import { prisma } from "@/lib/prisma";

export interface NearbyRunner {
  userId: string;
  name: string | null;
  image: string | null;
  city: string | null;
  state: string | null;
  averagePace: number | null;
  averageDistance: number | null;
  weeklyFrequency: number | null;
  preferredTimeSlot: string | null;
  stravaAthleteId: number | null;
  minDistanceMeters: number;
  zoneLat: number;
  zoneLng: number;
  zoneActivityCount: number;
}

/**
 * Find discoverable users with running zones within a radius of any of the given user's zones.
 * Uses PostGIS ST_DWithin for fast spatial pre-filtering.
 *
 * For users without any RunningZone rows (e.g. signed in with Apple and
 * haven't connected Strava yet), falls back to city/state text matching
 * so they can still discover athletes in their area.
 */
export async function findNearbyRunners(
  userId: string,
  maxDistanceKm: number,
  options?: {
    minPace?: number;
    maxPace?: number;
    minDistance?: number;
    maxDistance?: number;
    limit?: number;
  }
): Promise<NearbyRunner[]> {
  const maxDistanceMeters = maxDistanceKm * 1000;
  const limit = options?.limit ?? 50;

  // Build optional WHERE clauses for pace/distance filters.
  // Allow nulls so Apple-only users (who have no averagePace) still match.
  let paceFilter = "";
  if (options?.minPace != null) {
    paceFilter += ` AND (u."averagePace" IS NULL OR u."averagePace" >= ${options.minPace})`;
  }
  if (options?.maxPace != null) {
    paceFilter += ` AND (u."averagePace" IS NULL OR u."averagePace" <= ${options.maxPace})`;
  }
  if (options?.minDistance != null) {
    paceFilter += ` AND (u."averageDistance" IS NULL OR u."averageDistance" >= ${options.minDistance})`;
  }
  if (options?.maxDistance != null) {
    paceFilter += ` AND (u."averageDistance" IS NULL OR u."averageDistance" <= ${options.maxDistance})`;
  }

  const results = await prisma.$queryRawUnsafe<NearbyRunner[]>(`
    SELECT DISTINCT ON (u.id)
      u.id AS "userId",
      u.name,
      u.image,
      u.city,
      u.state,
      u."averagePace",
      u."averageDistance",
      u."weeklyFrequency",
      u."preferredTimeSlot",
      u."stravaAthleteId",
      ST_Distance(rz1.center::geography, rz2.center::geography) AS "minDistanceMeters",
      rz2.latitude AS "zoneLat",
      rz2.longitude AS "zoneLng",
      rz2."activityCount" AS "zoneActivityCount"
    FROM "RunningZone" rz1
    JOIN "RunningZone" rz2
      ON ST_DWithin(rz1.center::geography, rz2.center::geography, ${maxDistanceMeters})
    JOIN "User" u ON rz2."userId" = u.id
    WHERE rz1."userId" = '${userId}'
      AND rz2."userId" != '${userId}'
      AND u."isDiscoverable" = true
      AND rz1.center IS NOT NULL
      AND rz2.center IS NOT NULL
      ${paceFilter}
    ORDER BY u.id, "minDistanceMeters" ASC
    LIMIT ${limit}
  `);

  if (results.length > 0) return results;

  // Fallback: no rows from spatial query. This happens when the user has no
  // RunningZone (Apple-only user pre-Strava) OR when no nearby athletes have
  // zones overlapping. We do a city/state text match on the User table.
  return findNearbyRunnersByCity(userId, options);
}

/**
 * Fallback discovery by city/state when the spatial query returns no rows.
 * Self users without a RunningZone are matched against other users with the
 * same city OR same state (depending on what they have set).
 */
async function findNearbyRunnersByCity(
  userId: string,
  options?: {
    minPace?: number;
    maxPace?: number;
    minDistance?: number;
    maxDistance?: number;
    limit?: number;
  }
): Promise<NearbyRunner[]> {
  const limit = options?.limit ?? 50;
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { city: true, state: true, country: true },
  });
  if (!me) return [];
  if (!me.city && !me.state) return [];

  const whereFilters: any = {
    id: { not: userId },
    isDiscoverable: true,
    OR: [
      me.city ? { city: me.city } : null,
      me.state ? { state: me.state } : null,
    ].filter(Boolean),
  };

  const users = await prisma.user.findMany({
    where: whereFilters,
    select: {
      id: true,
      name: true,
      image: true,
      city: true,
      state: true,
      averagePace: true,
      averageDistance: true,
      weeklyFrequency: true,
      preferredTimeSlot: true,
      stravaAthleteId: true,
      runningZones: {
        select: { latitude: true, longitude: true, activityCount: true },
        take: 1,
        orderBy: { activityCount: "desc" },
      },
    },
    take: limit,
  });

  // Map to NearbyRunner shape. Without spatial data, we use 0 meters (same
  // city implies co-located) and rely on the scorer's non-spatial dimensions.
  return users.map((u) => ({
    userId: u.id,
    name: u.name,
    image: u.image,
    city: u.city,
    state: u.state,
    averagePace: u.averagePace,
    averageDistance: u.averageDistance,
    weeklyFrequency: u.weeklyFrequency,
    preferredTimeSlot: u.preferredTimeSlot,
    stravaAthleteId: u.stravaAthleteId,
    minDistanceMeters: 0,
    zoneLat: u.runningZones[0]?.latitude ?? 0,
    zoneLng: u.runningZones[0]?.longitude ?? 0,
    zoneActivityCount: u.runningZones[0]?.activityCount ?? 0,
  }));
}

/**
 * Find all running zones for a set of user IDs (for map display).
 */
export async function getRunningZonesForUsers(
  userIds: string[]
): Promise<
  {
    userId: string;
    latitude: number;
    longitude: number;
    activityCount: number;
    radius: number;
    label: string | null;
  }[]
> {
  if (userIds.length === 0) return [];

  return prisma.runningZone.findMany({
    where: { userId: { in: userIds } },
    select: {
      userId: true,
      latitude: true,
      longitude: true,
      activityCount: true,
      radius: true,
      label: true,
    },
  });
}

/**
 * Get the current user's running zones (for centering the map).
 */
export async function getUserZones(userId: string) {
  return prisma.runningZone.findMany({
    where: { userId },
    select: {
      latitude: true,
      longitude: true,
      activityCount: true,
      radius: true,
      label: true,
    },
  });
}
