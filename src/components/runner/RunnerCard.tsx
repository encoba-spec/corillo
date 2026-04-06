"use client";

import { CompatibilityBadge } from "./CompatibilityBadge";
import { TIME_SLOT_LABELS } from "@/lib/matching/schedule";

const KM_TO_MI = 0.621371;
const MI_TO_KM = 1.60934;

interface RunnerCardProps {
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
  distanceKm: number;
  locationScore: number;
  scheduleScore: number;
  paceScore: number;
  distanceScore: number;
  stravaAthleteId?: number | null;
  isOnApp?: boolean;
  units?: string;
  onSelect?: (userId: string) => void;
  onMessage?: (userId: string) => void;
}

/** Convert decimal minutes to MM:SS */
function decimalToMMSS(decimal: number): string {
  const mins = Math.floor(decimal);
  const secs = Math.round((decimal - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function RunnerCard({
  name,
  image,
  city,
  state,
  averagePace,
  averageDistance,
  weeklyFrequency,
  preferredTimeSlot,
  score,
  distanceKm,
  locationScore,
  scheduleScore,
  paceScore,
  distanceScore,
  stravaAthleteId,
  isOnApp,
  units = "metric",
  onSelect,
  onMessage,
  userId,
}: RunnerCardProps) {
  const onApp = isOnApp ?? (stravaAthleteId != null);
  const isImperial = units === "imperial";
  const paceUnit = isImperial ? "min/mi" : "min/km";
  const distUnit = isImperial ? "mi" : "km";

  const displayPace =
    averagePace != null
      ? decimalToMMSS(isImperial ? averagePace * MI_TO_KM : averagePace)
      : null;

  const displayDistance =
    averageDistance != null
      ? isImperial
        ? (averageDistance * KM_TO_MI).toFixed(1)
        : averageDistance.toFixed(1)
      : null;

  const displayDistanceAway = isImperial
    ? distanceKm * KM_TO_MI
    : distanceKm;
  const distAwayUnit = isImperial ? "mi" : "km";

  return (
    <div
      className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 hover:border-cyan-300 dark:hover:border-cyan-700 transition-colors cursor-pointer"
      onClick={() => onSelect?.(userId)}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        {image ? (
          <img src={image} alt="" className="w-12 h-12 rounded-full flex-shrink-0 object-cover" />
        ) : (
          <div className="w-12 h-12 bg-zinc-200 dark:bg-zinc-700 rounded-full flex items-center justify-center text-lg font-medium flex-shrink-0">
            {name?.[0] ?? "?"}
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Name + Badge */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold truncate">{name || "Runner"}</h3>
            <CompatibilityBadge score={score} />
            {onApp && (
              <span
                className="flex-shrink-0 w-4 h-4 rounded-full bg-cyan-500 flex items-center justify-center"
                title="On corillo"
              >
                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}
            <a
              href={
                stravaAthleteId
                  ? `https://www.strava.com/athletes/${stravaAthleteId}`
                  : `https://www.strava.com/athletes/search?query=${encodeURIComponent(name || "")}`
              }
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex-shrink-0 text-[#FC4C02] hover:text-[#e04400] transition-colors"
              title={stravaAthleteId ? "view on strava" : "find on strava"}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
              </svg>
            </a>
          </div>

          {/* Location + Distance */}
          <p className="text-sm text-zinc-500 mb-2">
            {[city, state].filter(Boolean).join(", ") || "Unknown location"}
            {" · "}
            <span className="text-cyan-500 font-medium">
              {displayDistanceAway < 1
                ? `${Math.round(displayDistanceAway * (isImperial ? 5280 : 1000))}${isImperial ? "ft" : "m"} away`
                : `${displayDistanceAway.toFixed(1)}${distAwayUnit} away`}
            </span>
          </p>

          {/* Stats */}
          <div className="flex flex-wrap gap-3 text-xs text-zinc-600 dark:text-zinc-400">
            {displayPace && (
              <span>
                <span className="font-medium text-zinc-900 dark:text-zinc-200">
                  {displayPace}
                </span>{" "}
                {paceUnit}
              </span>
            )}
            {displayDistance && (
              <span>
                <span className="font-medium text-zinc-900 dark:text-zinc-200">
                  {displayDistance}
                </span>{" "}
                {distUnit} avg
              </span>
            )}
            {weeklyFrequency != null && (
              <span>
                <span className="font-medium text-zinc-900 dark:text-zinc-200">
                  {weeklyFrequency.toFixed(1)}x
                </span>
                /week
              </span>
            )}
            {preferredTimeSlot && (
              <span>
                {TIME_SLOT_LABELS[preferredTimeSlot as keyof typeof TIME_SLOT_LABELS]?.split(" ")[0] ?? preferredTimeSlot}
              </span>
            )}
          </div>

          {/* Score breakdown */}
          <div className="mt-2 flex gap-1">
            <ScoreBar label="Loc" value={locationScore} color="bg-blue-400" />
            <ScoreBar label="Sched" value={scheduleScore} color="bg-green-400" />
            <ScoreBar label="Pace" value={paceScore} color="bg-cyan-400" />
            <ScoreBar label="Dist" value={distanceScore} color="bg-purple-400" />
          </div>

          {/* Message button - only for users on the app */}
          {onMessage && onApp && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMessage(userId);
              }}
              className="mt-3 px-3 py-1.5 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 hover:text-cyan-500 rounded-lg transition-colors"
            >
              Message
            </button>
          )}
          {!onApp && (
            <p className="mt-2 text-[10px] text-zinc-400">not yet on <span className="text-cyan-500">corillo</span></p>
          )}
        </div>
      </div>
    </div>
  );
}

function ScoreBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex-1" title={`${label}: ${Math.round(value * 100)}%`}>
      <div className="text-[10px] text-zinc-400 mb-0.5">{label}</div>
      <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
    </div>
  );
}
