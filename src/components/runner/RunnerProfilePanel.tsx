"use client";

import { useState, useEffect } from "react";
import { TIME_SLOT_LABELS } from "@/lib/matching/schedule";

const KM_TO_MI = 0.621371;
const MI_TO_KM = 1.60934;

interface RunnerProfile {
  id: string;
  name: string | null;
  image: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  gender: string | null;
  stravaAthleteId: number | null;
  sportRunning: boolean;
  sportCycling: boolean;
  averagePace: number | null;
  averageDistance: number | null;
  longRunPace: number | null;
  longRunDistance: number | null;
  raceDistance: string | null;
  raceTargetTime: string | null;
  cyclingRoad: boolean;
  cyclingMountain: boolean;
  weeklyFrequency: number | null;
  preferredTimeSlot: string | null;
  activityCount: number;
  runningZones: { id: string; label: string | null; activityCount: number }[];
  schedulePatterns: { dayOfWeek: number; timeSlot: string; frequency: number }[];
  clubs: { id: string; name: string; profileImage: string | null }[];
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TIME_SLOTS = [
  "early_morning",
  "morning",
  "midday",
  "evening",
  "night",
] as const;

/** Convert decimal minutes to MM:SS */
function decimalToMMSS(decimal: number): string {
  const mins = Math.floor(decimal);
  const secs = Math.round((decimal - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

interface RunnerProfilePanelProps {
  userId: string | null;
  onClose: () => void;
  onMessage: (userId: string) => void;
  units?: string;
}

export function RunnerProfilePanel({
  userId,
  onClose,
  onMessage,
  units = "metric",
}: RunnerProfilePanelProps) {
  const [profile, setProfile] = useState<RunnerProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isImperial = units === "imperial";
  const paceUnit = isImperial ? "min/mi" : "min/km";
  const distUnit = isImperial ? "mi" : "km";

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      return;
    }

    setLoading(true);
    setError("");

    fetch(`/api/runners/${userId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load profile");
        return res.json();
      })
      .then((data) => setProfile(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [userId]);

  if (!userId) return null;

  function formatPace(minPerKm: number): string {
    return decimalToMMSS(isImperial ? minPerKm * MI_TO_KM : minPerKm);
  }

  function formatDistance(km: number): string {
    return isImperial
      ? `${(km * KM_TO_MI).toFixed(1)} ${distUnit}`
      : `${km.toFixed(1)} ${distUnit}`;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-zinc-500 mt-3">Loading profile...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        ) : profile ? (
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              {profile.image ? (
                <a
                  href={
                    profile.stravaAthleteId
                      ? `https://www.strava.com/athletes/${profile.stravaAthleteId}`
                      : undefined
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0"
                >
                  <img
                    src={profile.image}
                    alt=""
                    className="w-20 h-20 rounded-full object-cover hover:ring-2 hover:ring-cyan-500 transition-all"
                  />
                </a>
              ) : (
                <div className="w-20 h-20 bg-zinc-200 dark:bg-zinc-700 rounded-full flex items-center justify-center text-2xl font-medium flex-shrink-0">
                  {profile.name?.[0] ?? "?"}
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold">{profile.name || "Runner"}</h2>
                <p className="text-sm text-zinc-500">
                  {[profile.city, profile.state, profile.country]
                    .filter(Boolean)
                    .join(", ") || "Location not set"}
                </p>
                {profile.gender && profile.gender !== "prefer_not_to_say" && (
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {profile.gender === "man"
                      ? "Man"
                      : profile.gender === "woman"
                      ? "Woman"
                      : profile.gender === "non_binary"
                      ? "Non-Binary"
                      : ""}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={() => onMessage(profile.id)}
                className="flex-1 py-2.5 px-4 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Message
              </button>
              {profile.stravaAthleteId && (
                <a
                  href={`https://www.strava.com/athletes/${profile.stravaAthleteId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 px-4 bg-[#FC4C02] hover:bg-[#e04400] text-white rounded-lg text-sm font-medium transition-colors text-center flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                  </svg>
                  Strava Profile
                </a>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {profile.averagePace != null && (
                <StatCard
                  label="Avg Pace"
                  value={`${formatPace(profile.averagePace)} ${paceUnit}`}
                />
              )}
              {profile.averageDistance != null && (
                <StatCard
                  label="Avg Distance"
                  value={formatDistance(profile.averageDistance)}
                />
              )}
              {profile.weeklyFrequency != null && (
                <StatCard
                  label="Weekly Runs"
                  value={`${profile.weeklyFrequency.toFixed(1)}x`}
                />
              )}
              <StatCard
                label="Activities"
                value={String(profile.activityCount)}
              />
            </div>

            {/* Training Profile */}
            {(profile.sportRunning || profile.sportCycling) && (
              <div className="mb-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <h3 className="text-sm font-semibold mb-3 text-zinc-500 uppercase tracking-wider">
                  Training
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Sports</span>
                    <span className="font-medium">
                      {[
                        profile.sportRunning && "Running",
                        profile.sportCycling && "Cycling",
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>
                  {profile.longRunPace != null && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Long Run Pace</span>
                      <span className="font-medium">
                        {formatPace(profile.longRunPace)} {paceUnit}
                      </span>
                    </div>
                  )}
                  {profile.longRunDistance != null && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Long Run Distance</span>
                      <span className="font-medium">
                        {formatDistance(profile.longRunDistance)}
                      </span>
                    </div>
                  )}
                  {profile.raceDistance && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Training For</span>
                      <span className="font-medium">
                        {profile.raceDistance}
                        {profile.raceTargetTime && ` (${profile.raceTargetTime})`}
                      </span>
                    </div>
                  )}
                  {(profile.cyclingRoad || profile.cyclingMountain) && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Cycling</span>
                      <span className="font-medium">
                        {[
                          profile.cyclingRoad && "Road",
                          profile.cyclingMountain && "Mountain",
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Running Areas */}
            {profile.runningZones && profile.runningZones.length > 0 && (
              <div className="mb-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <h3 className="text-sm font-semibold mb-3 text-zinc-500 uppercase tracking-wider">
                  Running Areas
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.runningZones.map((zone) => (
                    <div
                      key={zone.id}
                      className="bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 px-3 py-1.5 rounded-lg text-sm"
                    >
                      {zone.label || "Area"} ({zone.activityCount} runs)
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Schedule */}
            {profile.schedulePatterns && profile.schedulePatterns.length > 0 && (
              <div className="mb-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <h3 className="text-sm font-semibold mb-3 text-zinc-500 uppercase tracking-wider">
                  Running Schedule
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        <th className="text-left py-1 pr-2"></th>
                        {DAY_LABELS.map((day) => (
                          <th
                            key={day}
                            className="text-center py-1 px-1 font-normal text-zinc-500"
                          >
                            {day}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {TIME_SLOTS.map((slot) => (
                        <tr key={slot}>
                          <td className="py-1 pr-2 font-medium text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                            {(TIME_SLOT_LABELS as any)[slot]?.split(" ")[0] ?? slot}
                          </td>
                          {DAY_LABELS.map((day, dayIdx) => {
                            const pattern = profile.schedulePatterns?.find(
                              (p) =>
                                p.dayOfWeek === dayIdx && p.timeSlot === slot
                            );
                            const freq = pattern?.frequency ?? 0;
                            return (
                              <td key={day} className="py-1 px-1 text-center">
                                <div
                                  className="w-8 h-6 rounded mx-auto"
                                  style={{
                                    backgroundColor:
                                      freq > 0
                                        ? `rgba(6, 182, 212, ${Math.max(0.15, freq)})`
                                        : "rgba(0,0,0,0.05)",
                                  }}
                                  title={`${day} ${slot}: ${(freq * 100).toFixed(0)}%`}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Clubs */}
            {profile.clubs && profile.clubs.length > 0 && (
              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <h3 className="text-sm font-semibold mb-3 text-zinc-500 uppercase tracking-wider">
                  Clubs
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.clubs.map((club) => (
                    <div
                      key={club.id}
                      className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded-lg text-sm"
                    >
                      {club.profileImage && (
                        <img
                          src={club.profileImage}
                          alt=""
                          className="w-5 h-5 rounded-full"
                        />
                      )}
                      {club.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3 text-center">
      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
        {label}
      </p>
      <p className="text-sm font-semibold mt-0.5">{value}</p>
    </div>
  );
}
