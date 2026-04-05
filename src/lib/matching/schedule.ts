/**
 * Schedule pattern extraction from activities.
 * Computes a frequency matrix: how often a user runs on each (day, timeSlot) combination.
 */

export const TIME_SLOTS = [
  "early_morning", // 05:00-06:59
  "morning",       // 07:00-09:59
  "midday",        // 10:00-13:59
  "afternoon",     // 14:00-16:59
  "evening",       // 17:00-19:59
  "night",         // 20:00-22:59
] as const;

export type TimeSlot = (typeof TIME_SLOTS)[number];

export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  early_morning: "Early Morning (5-7am)",
  morning: "Morning (7-10am)",
  midday: "Midday (10am-2pm)",
  afternoon: "Afternoon (2-5pm)",
  evening: "Evening (5-8pm)",
  night: "Night (8-11pm)",
};

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Map an hour (0-23) to a time slot.
 */
export function hourToTimeSlot(hour: number): TimeSlot {
  if (hour >= 5 && hour < 7) return "early_morning";
  if (hour >= 7 && hour < 10) return "morning";
  if (hour >= 10 && hour < 14) return "midday";
  if (hour >= 14 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 20) return "evening";
  if (hour >= 20 && hour < 23) return "night";
  // 23:00-04:59 — rare, classify as night
  return "night";
}

export interface ScheduleEntry {
  dayOfWeek: number; // 0=Sun..6=Sat
  timeSlot: TimeSlot;
  frequency: number; // 0.0-1.0
}

/**
 * Extract schedule patterns from a list of activity timestamps.
 * Returns frequency matrix entries where frequency > 0.
 */
export function extractSchedulePatterns(
  activities: { startDate: Date }[]
): ScheduleEntry[] {
  if (activities.length === 0) return [];

  // Count activities per (day, slot)
  const counts = new Map<string, number>();
  for (const activity of activities) {
    const date = new Date(activity.startDate);
    const day = date.getDay(); // 0=Sun..6=Sat
    const slot = hourToTimeSlot(date.getHours());
    const key = `${day}-${slot}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  // Compute total weeks in the activity window
  const dates = activities.map((a) => new Date(a.startDate).getTime());
  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);
  const totalWeeks = Math.max(1, (maxDate - minDate) / (7 * 24 * 60 * 60 * 1000));

  // Convert counts to frequencies
  const patterns: ScheduleEntry[] = [];
  for (const [key, count] of counts) {
    const [dayStr, slot] = key.split("-");
    const frequency = Math.min(1, count / totalWeeks);
    patterns.push({
      dayOfWeek: parseInt(dayStr),
      timeSlot: slot as TimeSlot,
      frequency,
    });
  }

  return patterns;
}

/**
 * Determine the preferred time slot (most frequent overall).
 */
export function getPreferredTimeSlot(
  patterns: ScheduleEntry[]
): TimeSlot | null {
  if (patterns.length === 0) return null;

  const slotTotals = new Map<string, number>();
  for (const p of patterns) {
    slotTotals.set(
      p.timeSlot,
      (slotTotals.get(p.timeSlot) ?? 0) + p.frequency
    );
  }

  let maxSlot: string | null = null;
  let maxTotal = 0;
  for (const [slot, total] of slotTotals) {
    if (total > maxTotal) {
      maxSlot = slot;
      maxTotal = total;
    }
  }

  return maxSlot as TimeSlot | null;
}

/**
 * Determine preferred days (days with frequency > 0.3).
 */
export function getPreferredDays(patterns: ScheduleEntry[]): number[] {
  const dayTotals = new Map<number, number>();
  for (const p of patterns) {
    dayTotals.set(p.dayOfWeek, (dayTotals.get(p.dayOfWeek) ?? 0) + p.frequency);
  }

  return Array.from(dayTotals.entries())
    .filter(([, total]) => total > 0.3)
    .map(([day]) => day)
    .sort();
}
