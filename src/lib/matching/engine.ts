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
  stravaAthleteId: number | null;
  isOnApp: boolean;
  score: number;
  locationScore: number;
  scheduleScore: number;
  paceScore: number;
  distanceScore: number;
  distanceKm: number;
  zoneLat: number;
  zoneLng: number;
}

/** Parse a time string like "1:45:00" or "25:30" to total minutes */
function parseTimeToMinutes(t: string): number | null {
  if (!t) return null;
  const parts = t.split(":").map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 3) return parts[0] * 60 + parts[1] + parts[2] / 60;
  if (parts.length === 2) return parts[0] + parts[1] / 60;
  return null;
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
    // Training filters
    raceDistance: overrides?.raceDistance ?? null,
    raceTargetTime: overrides?.raceTargetTime ?? null,
    raceTargetTimeTolerance: overrides?.raceTargetTimeTolerance ?? 15,
    longRunDistance: overrides?.longRunDistance ?? null,
    longRunDistanceTolerance: overrides?.longRunDistanceTolerance ?? 5,
    longRunPace: overrides?.longRunPace ?? null,
    longRunPaceTolerance: overrides?.longRunPaceTolerance ?? 1,
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
      gender: true,
      genderMatchWith: true,
      schedulePatterns: {
        select: { dayOfWeek: true, timeSlot: true, frequency: true },
      },
    },
  });

  if (!currentUser) return [];

  // Filter by gender match preferences (array of genders user wants to match with)
  let filteredNearby = nearby;
  const matchWith = currentUser.genderMatchWith;
  if (matchWith && matchWith.length > 0 && matchWith.length < 3) {
    // Not all genders selected, so filter
    const candidateIds = filteredNearby.map((r) => r.userId);
    const usersWithGender = await prisma.user.findMany({
      where: {
        id: { in: candidateIds },
        OR: [
          { gender: { in: matchWith } },
          { gender: null }, // include users who haven't set gender
        ],
      },
      select: { id: true },
    });
    const genderMatchIds = new Set(usersWithGender.map((u) => u.id));
    filteredNearby = filteredNearby.filter((r) => genderMatchIds.has(r.userId));
  }

  if (filteredNearby.length === 0) return [];

  // 3. Apply training-specific filters if set
  const needsTrainingFilter =
    options.raceDistance ||
    options.longRunDistance != null ||
    options.longRunPace != null;

  if (needsTrainingFilter) {
    const candidateIds = filteredNearby.map((r) => r.userId);

    // Build a WHERE clause for training filters
    const whereConditions: any = { id: { in: candidateIds } };

    // Race distance filter
    if (options.raceDistance) {
      whereConditions.raceDistance = options.raceDistance;
    }

    // Fetch candidates that match race distance (if set) to check target time
    const trainingUsers = await prisma.user.findMany({
      where: whereConditions,
      select: {
        id: true,
        raceDistance: true,
        raceTargetTime: true,
        longRunDistance: true,
        longRunPace: true,
      },
    });

    const passIds = new Set<string>();

    for (const u of trainingUsers) {
      // Check race target time tolerance
      if (options.raceTargetTime && options.raceDistance) {
        const filterMinutes = parseTimeToMinutes(options.raceTargetTime);
        const userMinutes = u.raceTargetTime
          ? parseTimeToMinutes(u.raceTargetTime)
          : null;
        if (filterMinutes != null && userMinutes != null) {
          const tolerance = options.raceTargetTimeTolerance ?? 15;
          if (Math.abs(filterMinutes - userMinutes) > tolerance) continue;
        } else if (filterMinutes != null && userMinutes == null) {
          // User has no target time set - skip if we're filtering by it
          continue;
        }
      }

      // Check long run distance tolerance
      if (options.longRunDistance != null) {
        if (u.longRunDistance == null) continue;
        const tolerance = options.longRunDistanceTolerance ?? 5;
        if (Math.abs(options.longRunDistance - u.longRunDistance) > tolerance)
          continue;
      }

      // Check long run pace tolerance
      if (options.longRunPace != null) {
        if (u.longRunPace == null) continue;
        const tolerance = options.longRunPaceTolerance ?? 1;
        if (Math.abs(options.longRunPace - u.longRunPace) > tolerance) continue;
      }

      passIds.add(u.id);
    }

    filteredNearby = filteredNearby.filter((r) => passIds.has(r.userId));
  }

  if (filteredNearby.length === 0) return [];

  const currentProfile: RunnerProfile = {
    averagePace: currentUser.averagePace,
    averageDistance: currentUser.averageDistance,
    schedulePatterns: currentUser.schedulePatterns,
  };

  // 4. Get schedule patterns for all candidate users
  const candidateIds = filteredNearby.map((r) => r.userId);
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

  // 5. Score each candidate
  const results: MatchResult[] = filteredNearby.map((runner) => {
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
      stravaAthleteId: runner.stravaAthleteId,
      isOnApp: runner.stravaAthleteId != null,
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

  // 6. Sort: app users first, then by score descending
  results.sort((a, b) => {
    // Prioritize users on the app
    if (a.isOnApp !== b.isOnApp) return a.isOnApp ? -1 : 1;
    return b.score - a.score;
  });

  // 7. Filter by schedule preferences if set
  if (options.preferredDays?.length || options.preferredTimeSlots?.length) {
    return results.filter((r) => r.scheduleScore > 0);
  }

  return results;
}
