"use client";

import { useState } from "react";

interface EditProfileFormProps {
  initialData: {
    sport: string | null;
    longRunPace: number | null;
    raceDistance: string | null;
    raceTargetTime: string | null;
    cyclingType: string | null;
  };
}

const RACE_DISTANCES = ["5K", "10K", "Half Marathon", "Marathon", "Ultra"];

export function EditProfileForm({ initialData }: EditProfileFormProps) {
  const [sport, setSport] = useState(initialData.sport || "");
  const [longRunPace, setLongRunPace] = useState(
    initialData.longRunPace?.toString() || ""
  );
  const [raceDistance, setRaceDistance] = useState(
    initialData.raceDistance || ""
  );
  const [raceTargetTime, setRaceTargetTime] = useState(
    initialData.raceTargetTime || ""
  );
  const [cyclingType, setCyclingType] = useState(
    initialData.cyclingType || ""
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError("");

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sport: sport || null,
          longRunPace: longRunPace || null,
          raceDistance: raceDistance || null,
          raceTargetTime: raceTargetTime || null,
          cyclingType: cyclingType || null,
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
      {/* Sport Selection */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Sport for matching
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setSport("running")}
            className={`flex-1 py-3 px-4 rounded-lg border text-sm font-medium transition-colors ${
              sport === "running"
                ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
            }`}
          >
            Running
          </button>
          <button
            type="button"
            onClick={() => setSport("cycling")}
            className={`flex-1 py-3 px-4 rounded-lg border text-sm font-medium transition-colors ${
              sport === "cycling"
                ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
            }`}
          >
            Cycling
          </button>
        </div>
      </div>

      {/* Running-specific fields */}
      {sport === "running" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div>
            <label className="block text-sm font-medium mb-1">
              Long run pace (min/km)
            </label>
            <input
              type="number"
              step="0.1"
              min="3"
              max="12"
              value={longRunPace}
              onChange={(e) => setLongRunPace(e.target.value)}
              placeholder="e.g. 5.5"
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:border-cyan-500 focus:outline-none"
            />
            <p className="text-xs text-zinc-500 mt-1">
              Your comfortable long run pace
            </p>
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
      {sport === "cycling" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div>
            <label className="block text-sm font-medium mb-2">
              Cycling type
            </label>
            <div className="flex gap-3">
              {(
                [
                  ["road", "Road"],
                  ["mountain", "Mountain"],
                  ["both", "Both"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCyclingType(value)}
                  className={`flex-1 py-2.5 px-3 rounded-lg border text-sm font-medium transition-colors ${
                    cyclingType === value
                      ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                      : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

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
