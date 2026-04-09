import { addWeeks, addMonths } from "date-fns";

export type Recurrence = "weekly" | "biweekly" | "monthly";

export function isValidRecurrence(v: unknown): v is Recurrence {
  return v === "weekly" || v === "biweekly" || v === "monthly";
}

function step(date: Date, recurrence: Recurrence): Date {
  switch (recurrence) {
    case "weekly":
      return addWeeks(date, 1);
    case "biweekly":
      return addWeeks(date, 2);
    case "monthly":
      return addMonths(date, 1);
  }
}

/**
 * Compute the next occurrence of a recurring activity on or after `now`.
 * For one-offs (no recurrence) returns `scheduledAt` unchanged.
 * Returns `null` when the series has ended (`recurrenceEndAt < now`).
 */
export function nextOccurrence(
  scheduledAt: Date,
  recurrence: Recurrence | null,
  recurrenceEndAt: Date | null,
  now: Date = new Date()
): Date | null {
  if (!recurrence) {
    return scheduledAt >= now ? scheduledAt : null;
  }

  // If the series has ended, nothing upcoming
  if (recurrenceEndAt && recurrenceEndAt < now) return null;

  let next = new Date(scheduledAt);
  // Walk forward until we pass `now`
  while (next < now) {
    next = step(next, recurrence);
    if (recurrenceEndAt && next > recurrenceEndAt) return null;
  }
  return next;
}

/**
 * Human-readable description of a recurrence, e.g. "every week on Tuesday".
 * Day-of-week is derived from the series start `scheduledAt`.
 */
export function describeRecurrence(
  scheduledAt: Date,
  recurrence: Recurrence | null
): string | null {
  if (!recurrence) return null;
  const weekday = scheduledAt.toLocaleDateString(undefined, { weekday: "long" });
  switch (recurrence) {
    case "weekly":
      return `every ${weekday}`;
    case "biweekly":
      return `every other ${weekday}`;
    case "monthly":
      return `monthly on day ${scheduledAt.getDate()}`;
  }
}
