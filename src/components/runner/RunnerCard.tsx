"use client";

import { CompatibilityBadge } from "./CompatibilityBadge";
import { TIME_SLOT_LABELS } from "@/lib/matching/schedule";

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
  onSelect?: (userId: string) => void;
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
  onSelect,
  userId,
}: RunnerCardProps) {
  return (
    <div
      className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 hover:border-cyan-300 dark:hover:border-cyan-700 transition-colors cursor-pointer"
      onClick={() => onSelect?.(userId)}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        {image ? (
          <img src={image} alt="" className="w-12 h-12 rounded-full flex-shrink-0" />
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
          </div>

          {/* Location + Distance */}
          <p className="text-sm text-zinc-500 mb-2">
            {[city, state].filter(Boolean).join(", ") || "Unknown location"}
            {" · "}
            <span className="text-cyan-500 font-medium">
              {distanceKm < 1
                ? `${Math.round(distanceKm * 1000)}m away`
                : `${distanceKm.toFixed(1)}km away`}
            </span>
          </p>

          {/* Stats */}
          <div className="flex flex-wrap gap-3 text-xs text-zinc-600 dark:text-zinc-400">
            {averagePace != null && (
              <span>
                <span className="font-medium text-zinc-900 dark:text-zinc-200">
                  {averagePace.toFixed(1)}
                </span>{" "}
                min/km
              </span>
            )}
            {averageDistance != null && (
              <span>
                <span className="font-medium text-zinc-900 dark:text-zinc-200">
                  {averageDistance.toFixed(1)}
                </span>{" "}
                km avg
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
