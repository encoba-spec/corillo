/**
 * Matching engine: orchestrates spatial pre-filter + compatibility scoring.
 * This is the core value proposition of the app.
 */

import { prisma } from "@/lib/prisma";
import { findNearbyRunners } from "@/lib/geo/queries";
import {
  compatibilityScore,
  locationScore as calcLocation,
  scheduleScore as calcSchedule,
  paceScore as calcPace,
  distanceScore as calcDistance,
  type RunnerProfile,
  type ScoringOptions,
} from "./scoring";

export interface MatchResult {
  userId: string;
  name: string | null;
  image: string | null;
  city: string | null;
  state: string | null;
  averagePace: number | null;
  averageDistance: number | null;
  weeklyFrequency: number | null;
  preferredTimeSlot: string | null;
  score: number;
  locationScore: number;
  scheduleScore: number;
  paceScore: number;
  distanceScore: number;
  distanceKm: number;
  zoneLat: number;
  zoneLng: number;
}

/**
 * Find and score matches for a user, applying their search preferences.
 */
export async function findMatches(
  userId: string,
  overrides?: Partial<ScoringOptions>
): Promise<MatchResult[]> {
  // Get user's search preferences (or defaults)
  const prefs = await prisma.searchPreferences.findUnique({
    where: { userId },
  });

  const options: ScoringOptions = {
    maxDistanceKm: overrides?.maxDistanceKm ?? prefs?.maxDistanceKm ?? 10,
    minPace: overrides?.minPace ?? prefs?.minPace ?? 3.0,
    maxPace: overrides?.maxPace ?? prefs?.maxPace ?? 10.0,
    minDistance: overrides?.minDistance ?? prefs?.minDistance ?? 1.0,
    maxDistance: overrides?.maxDistance ?? prefs?.maxDistance ?? 50.0,
    preferredDays: overrides?.preferredDays ?? prefs?.preferredDays ?? [],
    preferredTimeSlots:
      overrides?.preferredTimeSlots ?? prefs?.preferredTimeSlots ?? [],
  };

  // 1. Spatial pre-filter: find nearby discoverable runners
  const nearby = await findNearbyRunners(userId, options.maxDistanceKm, {
    minPace: options.minPace,
    maxPace: options.maxPace,
    minDistance: options.minDistance,
    maxDistance: options.maxDistance,
  });

  if (nearby.length === 0) return [];

  // 2. Get current user's profile for scoring
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      averagePace: true,
      averageDistance: true,
      schedulePatterns: {
        select: { dayOfWeek: true, timeSlot: true, frequency: true },
      },
    },
  });

  if (!currentUser) return [];

  const currentProfile: RunnerProfile = {
    averagePace: currentUser.averagePace,
    averageDistance: currentUser.averageDistance,
    schedulePatterns: currentUser.schedulePatterns,
  };

  // 3. Get schedule patterns for all candidate users
  const candidateIds = nearby.map((r) => r.userId);
  const allPatterns = await prisma.schedulePattern.findMany({
    where: { userId: { in: candidateIds } },
    select: { userId: true, dayOfWeek: true, timeSlot: true, frequency: true },
  });

  const patternsByUser = new Map<
    string,
    { dayOfWeek: number; timeSlot: string; frequency: number }[]
  >();
  for (const p of allPatterns) {
    if (!patternsByUser.has(p.userId)) patternsByUser.set(p.userId, []);
    patternsByUser.get(p.userId)!.push(p);
  }

  // 4. Score each candidate
  const results: MatchResult[] = nearby.map((runner) => {
    const otherProfile: RunnerProfile = {
      averagePace: runner.averagePace,
      averageDistance: runner.averageDistance,
      schedulePatterns: patternsByUser.get(runner.userId) ?? [],
    };

    const score = compatibilityScore(
      runner.minDistanceMeters,
      currentProfile,
      otherProfile,
      options
    );

    const locScore = calcLocation(runner.minDistanceMeters, options.maxDistanceKm);
    const schedScore = calcSchedule(
      currentProfile.schedulePatterns,
      otherProfile.schedulePatterns,
      options.preferredDays,
      options.preferredTimeSlots
    );
    const pcScore = calcPace(
      currentProfile.averagePace,
      otherProfile.averagePace,
      options.minPace,
      options.maxPace
    );
    const distScore = calcDistance(
      currentProfile.averageDistance,
      otherProfile.averageDistance,
      options.minDistance,
      options.maxDistance
    );

    return {
      userId: runner.userId,
      name: runner.name,
      image: runner.image,
      city: runner.city,
      state: runner.state,
      averagePace: runner.averagePace,
      averageDistance: runner.averageDistance,
      weeklyFrequency: runner.weeklyFrequency,
      preferredTimeSlot: runner.preferredTimeSlot,
      score,
      locationScore: locScore,
      scheduleScore: schedScore,
      paceScore: pcScore,
      distanceScore: distScore,
      distanceKm: runner.minDistanceMeters / 1000,
      zoneLat: runner.zoneLat,
      zoneLng: runner.zoneLng,
    };
  });

  // 5. Sort by score descending
  results.sort((a, b) => b.score - a.score);

  // 6. Filter by schedule preferences if set
  if (options.preferredDays?.length || options.preferredTimeSlots?.length) {
    return results.filter((r) => r.scheduleScore > 0);
  }

  return results;
}
