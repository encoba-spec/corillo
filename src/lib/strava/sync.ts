/**
 * Strava data sync pipeline.
 * Imports activities, clusters into running zones, and extracts schedule patterns.
 */

import { prisma } from "@/lib/prisma";
import {
  getAllActivitiesSince,
  getAthlete,
  getAthleteClubs,
  type StravaActivity,
} from "./client";
import { dbscan } from "@/lib/geo/clustering";
import { fuzzCoordinate } from "@/lib/geo/fuzzy";
import {
  extractSchedulePatterns,
  getPreferredDays,
  getPreferredTimeSlot,
  hourToTimeSlot,
} from "@/lib/matching/schedule";

/**
 * Full sync for a user: fetch activities, compute zones and schedule.
 * Called on first sign-in and manual re-sync.
 */
export async function syncUserData(userId: string, accessToken: string) {
  console.log(`[sync] Starting full sync for user ${userId}`);

  // 1. Fetch and update athlete profile
  try {
    const athlete = await getAthlete(accessToken);
    await prisma.user.update({
      where: { id: userId },
      data: {
        stravaAthleteId: athlete.id,
        city: athlete.city,
        state: athlete.state,
        country: athlete.country,
        image: athlete.profile,
        gender: athlete.sex === "M" ? "man" : athlete.sex === "F" ? "woman" : null,
      },
    });
  } catch (err) {
    console.error("[sync] Failed to fetch athlete profile:", err);
  }

  // 1b. Sync clubs
  try {
    const clubs = await getAthleteClubs(accessToken);
    for (const club of clubs) {
      // Upsert club
      await prisma.club.upsert({
        where: { stravaClubId: club.id },
        create: {
          stravaClubId: club.id,
          name: club.name,
          sportType: club.sport_type?.toLowerCase() || null,
          city: club.city || null,
          state: club.state || null,
          country: club.country || null,
          memberCount: club.member_count || 0,
          profileImage: club.profile_medium || null,
          coverImage: club.cover_photo || null,
        },
        update: {
          name: club.name,
          sportType: club.sport_type?.toLowerCase() || null,
          city: club.city || null,
          state: club.state || null,
          country: club.country || null,
          memberCount: club.member_count || 0,
          profileImage: club.profile_medium || null,
          coverImage: club.cover_photo || null,
        },
      });

      // Get the club record
      const dbClub = await prisma.club.findUnique({
        where: { stravaClubId: club.id },
      });
      if (!dbClub) continue;

      // Upsert club membership
      await prisma.clubMember.upsert({
        where: {
          clubId_userId: { clubId: dbClub.id, userId },
        },
        create: {
          clubId: dbClub.id,
          userId,
          role: club.admin ? "admin" : "member",
        },
        update: {
          role: club.admin ? "admin" : "member",
        },
      });
    }
    console.log(`[sync] Synced ${clubs.length} clubs for user ${userId}`);
  } catch (err) {
    console.error("[sync] Failed to sync clubs:", err);
  }

  // 2. Fetch activities from last 90 days
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - 90);

  let stravaActivities: StravaActivity[];
  try {
    stravaActivities = await getAllActivitiesSince(accessToken, sinceDate);
  } catch (err) {
    console.error("[sync] Failed to fetch activities:", err);
    return;
  }

  // Filter to running activities only
  const runActivities = stravaActivities.filter((a) =>
    ["Run", "TrailRun", "VirtualRun"].includes(a.sport_type)
  );

  console.log(
    `[sync] Found ${runActivities.length} running activities out of ${stravaActivities.length} total`
  );

  // 3. Upsert activities into DB
  for (const activity of runActivities) {
    const startDate = new Date(activity.start_date_local);
    const dayOfWeek = startDate.getDay();
    const timeSlot = hourToTimeSlot(startDate.getHours());

    await prisma.activity.upsert({
      where: { stravaActivityId: BigInt(activity.id) },
      create: {
        userId,
        stravaActivityId: BigInt(activity.id),
        sportType: activity.sport_type,
        name: activity.name,
        startDate,
        elapsedTime: activity.elapsed_time,
        movingTime: activity.moving_time,
        distance: activity.distance,
        averageSpeed: activity.average_speed,
        startLatitude: activity.start_latlng?.[0] ?? null,
        startLongitude: activity.start_latlng?.[1] ?? null,
        endLatitude: activity.end_latlng?.[0] ?? null,
        endLongitude: activity.end_latlng?.[1] ?? null,
        dayOfWeek,
        timeSlot,
      },
      update: {
        name: activity.name,
        sportType: activity.sport_type,
        distance: activity.distance,
        averageSpeed: activity.average_speed,
      },
    });
  }

  // 4. Recompute running zones
  await computeRunningZones(userId);

  // 5. Recompute schedule patterns
  await computeSchedulePatterns(userId);

  // 6. Update user aggregates
  await updateUserAggregates(userId);

  console.log(`[sync] Completed sync for user ${userId}`);
}

/**
 * Cluster activity start points into running zones using DBSCAN.
 */
async function computeRunningZones(userId: string) {
  // Get all non-hidden activities with GPS data
  const activities = await prisma.activity.findMany({
    where: {
      userId,
      isHidden: false,
      startLatitude: { not: null },
      startLongitude: { not: null },
    },
    select: {
      startLatitude: true,
      startLongitude: true,
    },
  });

  const points = activities
    .filter((a) => a.startLatitude != null && a.startLongitude != null)
    .map((a) => ({
      lat: a.startLatitude!,
      lng: a.startLongitude!,
    }));

  if (points.length === 0) return;

  // Run DBSCAN clustering (epsilon=500m, minPoints=2 for smaller datasets)
  const minPts = points.length < 10 ? 2 : 3;
  const clusters = dbscan(points, 500, minPts);

  // Delete old zones and insert new ones
  await prisma.runningZone.deleteMany({ where: { userId } });

  for (const cluster of clusters) {
    // Fuzz the center for privacy
    const fuzzed = fuzzCoordinate(cluster.centerLat, cluster.centerLng);

    await prisma.runningZone.create({
      data: {
        userId,
        latitude: fuzzed.lat,
        longitude: fuzzed.lng,
        activityCount: cluster.points.length,
        radius: Math.round(cluster.radius),
      },
    });
  }

  // Apply PostGIS trigger by running raw update
  await prisma.$queryRawUnsafe(`
    UPDATE "RunningZone"
    SET center = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
    WHERE "userId" = '${userId}'
  `);
}

/**
 * Extract schedule patterns from activities.
 */
async function computeSchedulePatterns(userId: string) {
  const activities = await prisma.activity.findMany({
    where: { userId, isHidden: false },
    select: { startDate: true },
  });

  const patterns = extractSchedulePatterns(
    activities.map((a) => ({ startDate: a.startDate }))
  );

  // Delete old patterns and insert new ones
  await prisma.schedulePattern.deleteMany({ where: { userId } });

  for (const pattern of patterns) {
    await prisma.schedulePattern.create({
      data: {
        userId,
        dayOfWeek: pattern.dayOfWeek,
        timeSlot: pattern.timeSlot,
        frequency: pattern.frequency,
      },
    });
  }
}

/**
 * Compute and store user aggregate stats.
 */
async function updateUserAggregates(userId: string) {
  const activities = await prisma.activity.findMany({
    where: { userId, isHidden: false },
    select: {
      distance: true,
      movingTime: true,
      averageSpeed: true,
      startDate: true,
    },
    orderBy: { startDate: "desc" },
  });

  if (activities.length === 0) return;

  // Average pace (min/km) from average speed (m/s)
  const speedsWithValues = activities.filter(
    (a) => a.averageSpeed && a.averageSpeed > 0
  );
  const avgSpeed =
    speedsWithValues.length > 0
      ? speedsWithValues.reduce((sum, a) => sum + a.averageSpeed!, 0) /
        speedsWithValues.length
      : null;
  const averagePace = avgSpeed ? 1000 / avgSpeed / 60 : null; // min/km

  // Average distance (km)
  const averageDistance =
    activities.reduce((sum, a) => sum + a.distance, 0) /
    activities.length /
    1000;

  // Weekly frequency
  const dates = activities.map((a) => a.startDate.getTime());
  const dateRange = Math.max(dates[0] - dates[dates.length - 1], 7 * 24 * 60 * 60 * 1000);
  const totalWeeks = dateRange / (7 * 24 * 60 * 60 * 1000);
  const weeklyFrequency = activities.length / Math.max(1, totalWeeks);

  // Preferred days and time slot from schedule patterns
  const patterns = await prisma.schedulePattern.findMany({
    where: { userId },
  });
  const scheduleEntries = patterns.map((p) => ({
    dayOfWeek: p.dayOfWeek,
    timeSlot: p.timeSlot as any,
    frequency: p.frequency,
  }));

  const preferredDays = getPreferredDays(scheduleEntries);
  const preferredTimeSlot = getPreferredTimeSlot(scheduleEntries);

  await prisma.user.update({
    where: { id: userId },
    data: {
      averagePace,
      averageDistance,
      weeklyFrequency,
      preferredDays,
      preferredTimeSlot,
    },
  });
}

/**
 * Process a single new activity (from webhook).
 */
export async function processNewActivity(
  userId: string,
  accessToken: string,
  stravaActivityId: number
) {
  const { stravaFetch } = await import("./client");
  const activity = await stravaFetch<StravaActivity>(
    `/activities/${stravaActivityId}`,
    accessToken
  );

  if (!["Run", "TrailRun", "VirtualRun"].includes(activity.sport_type)) {
    return; // Not a running activity
  }

  const startDate = new Date(activity.start_date_local);

  await prisma.activity.upsert({
    where: { stravaActivityId: BigInt(activity.id) },
    create: {
      userId,
      stravaActivityId: BigInt(activity.id),
      sportType: activity.sport_type,
      name: activity.name,
      startDate,
      elapsedTime: activity.elapsed_time,
      movingTime: activity.moving_time,
      distance: activity.distance,
      averageSpeed: activity.average_speed,
      startLatitude: activity.start_latlng?.[0] ?? null,
      startLongitude: activity.start_latlng?.[1] ?? null,
      endLatitude: activity.end_latlng?.[0] ?? null,
      endLongitude: activity.end_latlng?.[1] ?? null,
      dayOfWeek: startDate.getDay(),
      timeSlot: hourToTimeSlot(startDate.getHours()),
    },
    update: {
      name: activity.name,
      distance: activity.distance,
      averageSpeed: activity.average_speed,
    },
  });

  // Recompute zones and schedule
  await computeRunningZones(userId);
  await computeSchedulePatterns(userId);
  await updateUserAggregates(userId);
}
