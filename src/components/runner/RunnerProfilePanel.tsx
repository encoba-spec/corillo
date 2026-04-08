"use client";

import { useState, useEffect } from "react";
import { TIME_SLOT_LABELS } from "@/lib/matching/schedule";
import { PoweredByStrava } from "@/components/strava/PoweredByStrava";
import { SafetyMenu } from "@/components/moderation/SafetyMenu";

const KM_TO_MI = 0.621371;
const MI_TO_KM = 1.60934;

type ConnectionStatus =
  | "none"
  | "pending_outgoing"
  | "pending_incoming"
  | "accepted"
  | "declined";

interface UserRaceEntry {
  id: string;
  name: string;
  distance: string | null;
  raceDate: string | null;
  targetTime: string | null;
  city: string | null;
}

interface RunnerProfile {
  id: string;
  name: string | null;
  image: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  gender: string | null;
  stravaAthleteId: number | null;
  hasStrava: boolean;
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
  races: UserRaceEntry[];
  connectionStatus: ConnectionStatus;
  connectionId: string | null;
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
  onConnect?: (userId: string) => void;
  units?: string;
}

export function RunnerProfilePanel({
  userId,
  onClose,
  onConnect,
  units = "metric",
}: RunnerProfilePanelProps) {
  const [profile, setProfile] = useState<RunnerProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function refetch() {
    if (!userId) return;
    const res = await fetch(`/api/runners/${userId}`);
    if (res.ok) setProfile(await res.json());
  }

  async function sendRequest() {
    if (!profile) return;
    setActionBusy(true);
    setActionError(null);
    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile.id }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "failed");
      if (onConnect) onConnect(profile.id);
      await refetch();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "failed");
    } finally {
      setActionBusy(false);
    }
  }

  async function respond(action: "accept" | "decline") {
    if (!profile?.connectionId) return;
    setActionBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/connections/${profile.connectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "failed");
      await refetch();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "failed");
    } finally {
      setActionBusy(false);
    }
  }

  async function cancelRequest() {
    if (!profile?.connectionId) return;
    setActionBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/connections/${profile.connectionId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "failed");
      await refetch();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "failed");
    } finally {
      setActionBusy(false);
    }
  }

  async function sendMessage() {
    if (!profile) return;
    setActionBusy(true);
    setActionError(null);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: profile.id,
          content: "Hey! Want to run together?",
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "failed");
      const data = await res.json();
      window.location.href = `/messages?thread=${data.threadId}`;
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "failed");
      setActionBusy(false);
    }
  }

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
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.text();
          let msg = `Failed to load profile (${res.status})`;
          try {
            const j = JSON.parse(body);
            if (j?.error) msg = `${msg}: ${j.error}`;
          } catch {}
          console.error("[RunnerProfilePanel] fetch failed", res.status, body);
          throw new Error(msg);
        }
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
        {/* Top-right controls: safety menu + close */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-1">
          {profile && (
            <SafetyMenu
              targetUserId={profile.id}
              targetName={profile.name}
              onBlocked={onClose}
            />
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            aria-label="close"
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
        </div>

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
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">{profile.name || "athlete"}</h2>
                  {profile.stravaAthleteId && (
                    <span
                      className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center"
                      title="On corillo"
                    >
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                </div>
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
            <div className="flex gap-3 mb-2">
              {profile.stravaAthleteId ? (
                profile.connectionStatus === "accepted" ? (
                  <button
                    onClick={sendMessage}
                    disabled={actionBusy}
                    className="flex-1 py-2.5 px-4 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    message
                  </button>
                ) : profile.connectionStatus === "pending_outgoing" ? (
                  <button
                    onClick={cancelRequest}
                    disabled={actionBusy}
                    className="flex-1 py-2.5 px-4 bg-zinc-200 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-300 dark:hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    request sent · cancel
                  </button>
                ) : profile.connectionStatus === "pending_incoming" ? (
                  <>
                    <button
                      onClick={() => respond("accept")}
                      disabled={actionBusy}
                      className="flex-1 py-2.5 px-4 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      accept request
                    </button>
                    <button
                      onClick={() => respond("decline")}
                      disabled={actionBusy}
                      className="py-2.5 px-4 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 rounded-lg text-sm font-medium hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
                    >
                      decline
                    </button>
                  </>
                ) : (
                  <button
                    onClick={sendRequest}
                    disabled={actionBusy}
                    className="flex-1 py-2.5 px-4 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    connect
                  </button>
                )
              ) : (
                <div className="flex-1 py-2.5 px-4 bg-zinc-200 dark:bg-zinc-800 text-zinc-400 rounded-lg text-sm font-medium text-center">
                  not yet on <span className="text-cyan-500">corillo</span>
                </div>
              )}
              <a
                href={
                  profile.stravaAthleteId
                    ? `https://www.strava.com/athletes/${profile.stravaAthleteId}`
                    : `https://www.strava.com/athletes/search?query=${encodeURIComponent(profile.name || "")}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 px-4 bg-[#FC4C02] hover:bg-[#e04400] text-white rounded-lg text-sm font-medium transition-colors text-center flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                </svg>
                {profile.stravaAthleteId ? "strava profile" : "find on strava"}
              </a>
            </div>
            {actionError && (
              <p className="text-xs text-red-500 mb-4">{actionError}</p>
            )}
            {!actionError && <div className="mb-4" />}

            {/* Signed-up races */}
            {profile.races && profile.races.length > 0 && (
              <div className="mb-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <h3 className="text-sm font-semibold mb-3 text-zinc-500 tracking-wider">
                  signed up for
                </h3>
                <div className="space-y-2">
                  {profile.races.map((race) => (
                    <div
                      key={race.id}
                      className="bg-cyan-50 dark:bg-cyan-900/20 text-cyan-800 dark:text-cyan-200 px-3 py-2 rounded-lg text-sm"
                    >
                      <div className="font-medium">{race.name}</div>
                      <div className="text-xs text-cyan-700 dark:text-cyan-300 mt-0.5">
                        {[
                          race.distance,
                          race.raceDate
                            ? new Date(race.raceDate).toLocaleDateString()
                            : null,
                          race.city,
                          race.targetTime ? `goal ${race.targetTime}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {profile.averagePace != null && (
                <StatCard
                  label="avg pace"
                  value={`${formatPace(profile.averagePace)} ${paceUnit}`}
                />
              )}
              {profile.averageDistance != null && (
                <StatCard
                  label="avg distance"
                  value={formatDistance(profile.averageDistance)}
                />
              )}
              {profile.weeklyFrequency != null && (
                <StatCard
                  label="weekly runs"
                  value={`${profile.weeklyFrequency.toFixed(1)}x`}
                />
              )}
              <StatCard
                label="activities"
                value={String(profile.activityCount)}
              />
            </div>
            <div className="mb-6 -mt-3 flex justify-end">
              {profile.hasStrava ? (
                <PoweredByStrava width={110} />
              ) : (
                <span className="text-[10px] uppercase tracking-wider text-zinc-400">
                  self-reported
                </span>
              )}
            </div>

            {/* Training Profile */}
            {(profile.sportRunning || profile.sportCycling) && (
              <div className="mb-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <h3 className="text-sm font-semibold mb-3 text-zinc-500 tracking-wider">
                  training
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">sports</span>
                    <span className="font-medium">
                      {[
                        profile.sportRunning && "running",
                        profile.sportCycling && "cycling",
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>
                  {profile.longRunPace != null && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">long run pace</span>
                      <span className="font-medium">
                        {formatPace(profile.longRunPace)} {paceUnit}
                      </span>
                    </div>
                  )}
                  {profile.longRunDistance != null && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">long run distance</span>
                      <span className="font-medium">
                        {formatDistance(profile.longRunDistance)}
                      </span>
                    </div>
                  )}
                  {profile.raceDistance && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">training for</span>
                      <span className="font-medium">
                        {profile.raceDistance}
                        {profile.raceTargetTime && ` (${profile.raceTargetTime})`}
                      </span>
                    </div>
                  )}
                  {(profile.cyclingRoad || profile.cyclingMountain) && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">cycling</span>
                      <span className="font-medium">
                        {[
                          profile.cyclingRoad && "road",
                          profile.cyclingMountain && "mountain",
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
                <h3 className="text-sm font-semibold mb-3 text-zinc-500 tracking-wider">
                  running areas
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
                <h3 className="text-sm font-semibold mb-3 text-zinc-500 tracking-wider">
                  running schedule
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
                <h3 className="text-sm font-semibold mb-3 text-zinc-500 tracking-wider">
                  clubs
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
      <p className="text-[10px] text-zinc-500 tracking-wider">
        {label}
      </p>
      <p className="text-sm font-semibold mt-0.5">{value}</p>
    </div>
  );
}
