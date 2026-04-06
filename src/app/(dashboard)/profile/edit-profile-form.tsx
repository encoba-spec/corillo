"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const NotificationAreaMap = dynamic(
  () =>
    import("@/components/map/NotificationAreaMap").then(
      (m) => m.NotificationAreaMap
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[350px] bg-zinc-800 rounded-lg animate-pulse" />
    ),
  }
);

const KM_TO_MI = 0.621371;
const MI_TO_KM = 1.60934;

interface EditProfileFormProps {
  initialData: {
    sportRunning: boolean;
    sportCycling: boolean;
    longRunPace: number | null;
    longRunDistance: number | null;
    raceDistance: string | null;
    raceTargetTime: string | null;
    cyclingRoad: boolean;
    cyclingMountain: boolean;
    units: string;
    gender: string | null;
    genderMatchWith: string[];
    runNotifications: string;
    notifyTimeStart: string | null;
    notifyTimeEnd: string | null;
  };
}

const RACE_DISTANCES = ["5K", "10K", "Half Marathon", "Marathon", "Ultra"];

const GENDER_OPTIONS = [
  { value: "man", label: "Man" },
  { value: "woman", label: "Woman" },
  { value: "non_binary", label: "Non-Binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

const GENDER_MATCH_OPTIONS = [
  { value: "man", label: "Men" },
  { value: "woman", label: "Women" },
  { value: "non_binary", label: "Non-Binary" },
] as const;

function paceKmToMi(minPerKm: number): number {
  return minPerKm * MI_TO_KM;
}

function paceMiToKm(minPerMi: number): number {
  return minPerMi * KM_TO_MI;
}

/** Convert decimal minutes (e.g. 5.5) to MM:SS string (e.g. "5:30") */
function decimalToMMSS(decimal: number): string {
  const mins = Math.floor(decimal);
  const secs = Math.round((decimal - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/** Parse MM:SS string (e.g. "5:30") to decimal minutes (e.g. 5.5). Also accepts plain number. */
function parseMMSS(value: string): number | null {
  if (!value.trim()) return null;
  // Try MM:SS format first
  if (value.includes(":")) {
    const parts = value.split(":");
    if (parts.length === 2) {
      const mins = parseInt(parts[0], 10);
      const secs = parseInt(parts[1], 10);
      if (!isNaN(mins) && !isNaN(secs) && secs >= 0 && secs < 60) {
        return mins + secs / 60;
      }
    }
    return null;
  }
  // Fall back to decimal
  const val = parseFloat(value);
  return isNaN(val) ? null : val;
}

export function EditProfileForm({ initialData }: EditProfileFormProps) {
  const [units, setUnits] = useState(initialData.units || "metric");

  // Gender
  const [gender, setGender] = useState(initialData.gender || "");
  const [genderMatchWith, setGenderMatchWith] = useState<string[]>(
    initialData.genderMatchWith?.length
      ? initialData.genderMatchWith
      : ["man", "woman", "non_binary"]
  );

  // Notifications
  const [runNotifications, setRunNotifications] = useState(
    initialData.runNotifications || "my_zones"
  );
  const [notifyTimeStart, setNotifyTimeStart] = useState(
    initialData.notifyTimeStart || ""
  );
  const [notifyTimeEnd, setNotifyTimeEnd] = useState(
    initialData.notifyTimeEnd || ""
  );

  // Custom notification areas
  const [notifAreas, setNotifAreas] = useState<
    {
      id: string;
      label: string;
      radiusKm: number;
      latitude: number | null;
      longitude: number | null;
      polygon: number[][] | null;
      isPolygon: boolean;
    }[]
  >([]);
  const [newAreaLabel, setNewAreaLabel] = useState("");
  const [addingArea, setAddingArea] = useState(false);

  useEffect(() => {
    fetch("/api/notification-areas")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setNotifAreas(data);
      })
      .catch(() => {});
  }, []);

  async function handleAddArea() {
    if (!newAreaLabel.trim()) return;
    setAddingArea(true);
    try {
      const res = await fetch("/api/notification-areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newAreaLabel.trim() }),
      });
      if (res.ok) {
        const area = await res.json();
        setNotifAreas((prev) => [...prev, area]);
        setNewAreaLabel("");
      }
    } catch {}
    setAddingArea(false);
  }

  async function handleRemoveArea(id: string) {
    await fetch("/api/notification-areas", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotifAreas((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleDrawComplete(polygon: number[][]) {
    try {
      const res = await fetch("/api/notification-areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: `Drawn area ${notifAreas.filter((a) => a.isPolygon).length + 1}`,
          polygon,
        }),
      });
      if (res.ok) {
        const area = await res.json();
        setNotifAreas((prev) => [...prev, area]);
      }
    } catch {}
  }

  // Sports (independent toggles)
  const [sportRunning, setSportRunning] = useState(initialData.sportRunning);
  const [sportCycling, setSportCycling] = useState(initialData.sportCycling);

  // Running fields (stored in metric internally)
  const [longRunPaceMetric, setLongRunPaceMetric] = useState(
    initialData.longRunPace
  );
  const [longRunDistanceMetric, setLongRunDistanceMetric] = useState(
    initialData.longRunDistance
  );
  const [raceDistance, setRaceDistance] = useState(
    initialData.raceDistance || ""
  );
  const [raceTargetTime, setRaceTargetTime] = useState(
    initialData.raceTargetTime || ""
  );

  // Cycling fields (independent toggles)
  const [cyclingRoad, setCyclingRoad] = useState(initialData.cyclingRoad);
  const [cyclingMountain, setCyclingMountain] = useState(
    initialData.cyclingMountain
  );

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const isImperial = units === "imperial";
  const paceUnit = isImperial ? "min/mi" : "min/km";
  const distUnit = isImperial ? "mi" : "km";

  // Display values converted to current units (pace as MM:SS)
  const displayPace = longRunPaceMetric
    ? isImperial
      ? decimalToMMSS(paceKmToMi(longRunPaceMetric))
      : decimalToMMSS(longRunPaceMetric)
    : "";

  const displayDistance = longRunDistanceMetric
    ? isImperial
      ? (longRunDistanceMetric * KM_TO_MI).toFixed(1)
      : longRunDistanceMetric.toFixed(1)
    : "";

  // Track raw text input for pace (so user can type freely)
  const [paceInput, setPaceInput] = useState(displayPace);
  const [distanceInput, setDistanceInput] = useState(displayDistance);

  function handlePaceBlur() {
    const parsed = parseMMSS(paceInput);
    if (parsed == null) {
      setLongRunPaceMetric(null);
      setPaceInput("");
      return;
    }
    setLongRunPaceMetric(isImperial ? paceMiToKm(parsed) : parsed);
    // Re-format to MM:SS
    setPaceInput(decimalToMMSS(parsed));
  }

  function handleDistanceBlur() {
    if (!distanceInput.trim()) {
      setLongRunDistanceMetric(null);
      setDistanceInput("");
      return;
    }
    const val = parseFloat(distanceInput);
    if (isNaN(val)) return;
    setLongRunDistanceMetric(isImperial ? val * MI_TO_KM : val);
    setDistanceInput(val.toFixed(1));
  }

  function toggleGenderMatch(value: string) {
    setGenderMatchWith((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value]
    );
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError("");

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sportRunning,
          sportCycling,
          longRunPace: sportRunning ? (longRunPaceMetric ?? null) : null,
          longRunDistance: sportRunning
            ? (longRunDistanceMetric ?? null)
            : null,
          raceDistance: sportRunning ? (raceDistance || null) : null,
          raceTargetTime: sportRunning ? (raceTargetTime || null) : null,
          cyclingRoad: sportCycling ? cyclingRoad : false,
          cyclingMountain: sportCycling ? cyclingMountain : false,
          units,
          gender: gender || null,
          genderMatchWith,
          runNotifications,
          notifyTimeStart: notifyTimeStart || null,
          notifyTimeEnd: notifyTimeEnd || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Units Toggle */}
      <div>
        <label className="block text-sm font-medium mb-2">Display units</label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setUnits("metric")}
            className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-colors ${
              units === "metric"
                ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
            }`}
          >
            Metric (km)
          </button>
          <button
            type="button"
            onClick={() => setUnits("imperial")}
            className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-colors ${
              units === "imperial"
                ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
            }`}
          >
            Imperial (mi)
          </button>
        </div>
      </div>

      {/* Gender */}
      <div>
        <label className="block text-sm font-medium mb-2">Gender</label>
        <div className="grid grid-cols-2 gap-2">
          {GENDER_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setGender(value)}
              className={`py-2.5 px-3 rounded-lg border text-sm font-medium transition-colors ${
                gender === value
                  ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                  : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-500 mt-1">
          Synced from Strava. Update here if needed.
        </p>
      </div>

      {/* ─── Matching Preferences Section ─── */}
      <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <h4 className="text-base font-semibold mb-4">Matching Preferences</h4>

        <div className="space-y-6">
          {/* Gender Match Preference - Multi-select checkboxes */}
          <div>
            <label className="block text-sm font-medium mb-2">Match with</label>
            <div className="flex gap-3">
              {GENDER_MATCH_OPTIONS.map(({ value, label }) => {
                const checked = genderMatchWith.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleGenderMatch(value)}
                    className={`flex-1 py-2.5 px-3 rounded-lg border text-sm font-medium transition-colors ${
                      checked
                        ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                        : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
                    }`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                          checked
                            ? "bg-cyan-500 border-cyan-500"
                            : "border-zinc-600"
                        }`}
                      >
                        {checked && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </span>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Uncheck to opt out of matching with a gender
            </p>
          </div>

          {/* Sport Selection - Independent toggles */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Sports
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSportRunning(!sportRunning)}
                className={`flex-1 py-3 px-4 rounded-lg border text-sm font-medium transition-colors ${
                  sportRunning
                    ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                    : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <span
                    className={`w-4 h-4 rounded border flex items-center justify-center ${
                      sportRunning
                        ? "bg-cyan-500 border-cyan-500"
                        : "border-zinc-600"
                    }`}
                  >
                    {sportRunning && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </span>
                  Running
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSportCycling(!sportCycling)}
                className={`flex-1 py-3 px-4 rounded-lg border text-sm font-medium transition-colors ${
                  sportCycling
                    ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                    : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <span
                    className={`w-4 h-4 rounded border flex items-center justify-center ${
                      sportCycling
                        ? "bg-cyan-500 border-cyan-500"
                        : "border-zinc-600"
                    }`}
                  >
                    {sportCycling && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </span>
                  Cycling
                </span>
              </button>
            </div>
          </div>

      {/* Running-specific fields */}
      {sportRunning && (
        <div className="space-y-4 pl-4 border-l-2 border-cyan-500/30 animate-in fade-in duration-200">
          <h4 className="text-sm font-medium text-cyan-400">Running Details</h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Long run distance ({distUnit})
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={distanceInput}
                onChange={(e) => setDistanceInput(e.target.value)}
                onBlur={handleDistanceBlur}
                placeholder={isImperial ? "e.g. 10" : "e.g. 16"}
                className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none"
              />
              <p className="text-xs text-zinc-500 mt-1">
                Your typical long run distance
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Long run pace ({paceUnit})
              </label>
              <input
                type="text"
                inputMode="text"
                value={paceInput}
                onChange={(e) => setPaceInput(e.target.value)}
                onBlur={handlePaceBlur}
                placeholder={isImperial ? "e.g. 8:30" : "e.g. 5:30"}
                className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none"
              />
              <p className="text-xs text-zinc-500 mt-1">
                MM:SS per {isImperial ? "mile" : "km"}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Currently training for
            </label>
            <select
              value={raceDistance}
              onChange={(e) => setRaceDistance(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:border-cyan-500 focus:outline-none"
            >
              <option value="">Not training for a race</option>
              {RACE_DISTANCES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {raceDistance && (
            <div className="animate-in fade-in duration-200">
              <label className="block text-sm font-medium mb-1">
                Target time
              </label>
              <input
                type="text"
                value={raceTargetTime}
                onChange={(e) => setRaceTargetTime(e.target.value)}
                placeholder="e.g. 1:45:00"
                className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none"
              />
              <p className="text-xs text-zinc-500 mt-1">
                Your goal finish time (H:MM:SS or MM:SS)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Cycling-specific fields */}
      {sportCycling && (
        <div className="space-y-4 pl-4 border-l-2 border-cyan-500/30 animate-in fade-in duration-200">
          <h4 className="text-sm font-medium text-cyan-400">
            Cycling Details
          </h4>

          <div>
            <label className="block text-sm font-medium mb-2">
              Cycling type
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setCyclingRoad(!cyclingRoad)}
                className={`flex-1 py-2.5 px-3 rounded-lg border text-sm font-medium transition-colors ${
                  cyclingRoad
                    ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                    : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <span
                    className={`w-4 h-4 rounded border flex items-center justify-center ${
                      cyclingRoad
                        ? "bg-cyan-500 border-cyan-500"
                        : "border-zinc-600"
                    }`}
                  >
                    {cyclingRoad && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </span>
                  Road
                </span>
              </button>
              <button
                type="button"
                onClick={() => setCyclingMountain(!cyclingMountain)}
                className={`flex-1 py-2.5 px-3 rounded-lg border text-sm font-medium transition-colors ${
                  cyclingMountain
                    ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                    : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <span
                    className={`w-4 h-4 rounded border flex items-center justify-center ${
                      cyclingMountain
                        ? "bg-cyan-500 border-cyan-500"
                        : "border-zinc-600"
                    }`}
                  >
                    {cyclingMountain && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </span>
                  Mountain
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

        </div>
      </div>

      {/* ─── Notifications Section ─── */}
      <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <h4 className="text-base font-semibold mb-4">Notifications</h4>

        <div className="space-y-6">
          {/* Run Notifications */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Planned run notifications
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["my_zones", "My Running Areas"],
                  ["custom_areas", "Custom Areas"],
                  ["all_nearby", "All Nearby"],
                  ["none", "None"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRunNotifications(value)}
                  className={`py-2.5 px-3 rounded-lg border text-sm font-medium transition-colors ${
                    runNotifications === value
                      ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                      : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Get invited to planned runs in your running areas
            </p>
          </div>

          {/* Custom Notification Areas */}
          {runNotifications === "custom_areas" && (
            <div className="pl-4 border-l-2 border-cyan-500/30 space-y-4 animate-in fade-in duration-200">
              <label className="block text-sm font-medium">
                Notification areas
              </label>
              <p className="text-xs text-zinc-500">
                Add areas by name or draw them on the map. You&apos;ll get notified about planned runs in these areas.
              </p>

              {/* Map showing all areas + draw tools */}
              <NotificationAreaMap
                areas={notifAreas}
                onDrawComplete={handleDrawComplete}
              />
              <p className="text-xs text-zinc-400">
                Use the polygon or rectangle tools on the map to draw custom areas.
              </p>

              {/* Existing areas */}
              {notifAreas.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {notifAreas.map((area) => (
                    <div
                      key={area.id}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${
                        area.isPolygon
                          ? "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300"
                          : "bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300"
                      }`}
                    >
                      {area.isPolygon && (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4z" />
                        </svg>
                      )}
                      {area.label}
                      <button
                        type="button"
                        onClick={() => handleRemoveArea(area.id)}
                        className="hover:text-red-400 transition-colors ml-1"
                      >
                        <svg
                          className="w-3.5 h-3.5"
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
                  ))}
                </div>
              )}

              {/* Add named area */}
              <div>
                <label className="text-xs font-medium text-zinc-500 block mb-1">
                  Or add by name
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newAreaLabel}
                    onChange={(e) => setNewAreaLabel(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddArea())}
                    placeholder="e.g. Condado, 00907, San Juan"
                    className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleAddArea}
                    disabled={addingArea || !newAreaLabel.trim()}
                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {addingArea ? "..." : "Add"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notification Time Range */}
          {runNotifications !== "none" && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Departure time range
              </label>
              <p className="text-xs text-zinc-500">
                Only get notified about runs departing within this window. Leave empty for any time.
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="time"
                  value={notifyTimeStart}
                  onChange={(e) => setNotifyTimeStart(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:border-cyan-500 focus:outline-none text-sm"
                />
                <span className="text-zinc-500 text-sm">to</span>
                <input
                  type="time"
                  value={notifyTimeEnd}
                  onChange={(e) => setNotifyTimeEnd(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:border-cyan-500 focus:outline-none text-sm"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Profile"}
        </button>
        {saved && (
          <span className="text-sm text-emerald-400">Saved!</span>
        )}
        {error && <span className="text-sm text-red-400">{error}</span>}
      </div>
    </div>
  );
}
