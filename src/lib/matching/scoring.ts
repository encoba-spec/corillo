/**
 * Compatibility scoring between two runners.
 *
 * Score = 0.30 * Location + 0.30 * Schedule + 0.25 * Pace + 0.15 * Distance
 *
 * All sub-scores are 0.0-1.0.
 */

export interface RunnerProfile {
  averagePace: number | null;
  averageDistance: number | null;
  schedulePatterns: { dayOfWeek: number; timeSlot: string; frequency: number }[];
}

export interface ScoringOptions {
  maxDistanceKm: number;
  minPace: number;
  maxPace: number;
  minDistance: number;
  maxDistance: number;
  preferredDays?: number[];
  preferredTimeSlots?: string[];
}

/**
 * Compute location score based on minimum zone distance.
 * Score = max(0, 1 - distance_km / maxDistanceKm)
 */
export function locationScore(
  distanceMeters: number,
  maxDistanceKm: number
): number {
  const distKm = distanceMeters / 1000;
  return Math.max(0, 1 - distKm / maxDistanceKm);
}

/**
 * Compute schedule overlap score.
 * For each (day, slot), take min(A.frequency, B.frequency).
 * Sum overlaps / max of either user's total.
 */
export function scheduleScore(
  patternsA: { dayOfWeek: number; timeSlot: string; frequency: number }[],
  patternsB: { dayOfWeek: number; timeSlot: string; frequency: number }[],
  preferredDays?: number[],
  preferredTimeSlots?: string[]
): number {
  // Build lookup for B
  const bMap = new Map<string, number>();
  for (const p of patternsB) {
    bMap.set(`${p.dayOfWeek}-${p.timeSlot}`, p.frequency);
  }

  let overlap = 0;
  let totalA = 0;
  let totalB = 0;

  // Filter patterns if user has preferences
  const filteredA = patternsA.filter((p) => {
    if (preferredDays?.length && !preferredDays.includes(p.dayOfWeek)) return false;
    if (preferredTimeSlots?.length && !preferredTimeSlots.includes(p.timeSlot))
      return false;
    return true;
  });

  for (const p of filteredA) {
    const key = `${p.dayOfWeek}-${p.timeSlot}`;
    const bFreq = bMap.get(key) ?? 0;
    overlap += Math.min(p.frequency, bFreq);
    totalA += p.frequency;
  }

  for (const p of patternsB) {
    if (preferredDays?.length && !preferredDays.includes(p.dayOfWeek)) continue;
    if (preferredTimeSlots?.length && !preferredTimeSlots.includes(p.timeSlot))
      continue;
    totalB += p.frequency;
  }

  const maxTotal = Math.max(totalA, totalB);
  if (maxTotal === 0) return 0;

  return overlap / maxTotal;
}

/**
 * Compute pace compatibility score.
 * Score = max(0, 1 - |paceA - paceB| / paceRange)
 */
export function paceScore(
  paceA: number | null,
  paceB: number | null,
  minPace: number,
  maxPace: number
): number {
  if (paceA == null || paceB == null) return 0.5; // unknown = neutral
  const range = maxPace - minPace;
  if (range <= 0) return 1;
  return Math.max(0, 1 - Math.abs(paceA - paceB) / range);
}

/**
 * Compute distance compatibility score.
 * Score = max(0, 1 - |distA - distB| / distRange)
 */
export function distanceScore(
  distA: number | null,
  distB: number | null,
  minDist: number,
  maxDist: number
): number {
  if (distA == null || distB == null) return 0.5;
  const range = maxDist - minDist;
  if (range <= 0) return 1;
  return Math.max(0, 1 - Math.abs(distA - distB) / range);
}

/**
 * Compute the overall compatibility score.
 */
export function compatibilityScore(
  locationDist: number,
  currentUser: RunnerProfile,
  otherUser: RunnerProfile,
  options: ScoringOptions
): number {
  const loc = locationScore(locationDist, options.maxDistanceKm);
  const sched = scheduleScore(
    currentUser.schedulePatterns,
    otherUser.schedulePatterns,
    options.preferredDays,
    options.preferredTimeSlots
  );
  const pace = paceScore(
    currentUser.averagePace,
    otherUser.averagePace,
    options.minPace,
    options.maxPace
  );
  const dist = distanceScore(
    currentUser.averageDistance,
    otherUser.averageDistance,
    options.minDistance,
    options.maxDistance
  );

  return 0.3 * loc + 0.3 * sched + 0.25 * pace + 0.15 * dist;
}
