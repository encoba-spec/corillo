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

  // Build optional WHERE clauses for pace/distance filters
  let paceFilter = "";
  if (options?.minPace != null) {
    paceFilter += ` AND u."averagePace" >= ${options.minPace}`;
  }
  if (options?.maxPace != null) {
    paceFilter += ` AND u."averagePace" <= ${options.maxPace}`;
  }
  if (options?.minDistance != null) {
    paceFilter += ` AND u."averageDistance" >= ${options.minDistance}`;
  }
  if (options?.maxDistance != null) {
    paceFilter += ` AND u."averageDistance" <= ${options.maxDistance}`;
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

  return results;
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
