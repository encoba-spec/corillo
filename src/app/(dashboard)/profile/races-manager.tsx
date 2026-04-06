"use client";

import { useEffect, useState } from "react";

interface UserRace {
  id: string;
  name: string;
  distance: string | null;
  raceDate: string | null;
  targetTime: string | null;
  city: string | null;
}

const DISTANCES = [
  "5K",
  "10K",
  "Half Marathon",
  "Marathon",
  "Ultra",
  "Other",
];

export function RacesManager() {
  const [races, setRaces] = useState<UserRace[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [distance, setDistance] = useState("");
  const [raceDate, setRaceDate] = useState("");
  const [targetTime, setTargetTime] = useState("");
  const [city, setCity] = useState("");

  useEffect(() => {
    fetch("/api/races")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setRaces(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/races", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          distance: distance || null,
          raceDate: raceDate || null,
          targetTime: targetTime.trim() || null,
          city: city.trim() || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "failed");
      const race = await res.json();
      setRaces((prev) => [...prev, race]);
      setName("");
      setDistance("");
      setRaceDate("");
      setTargetTime("");
      setCity("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      const res = await fetch(`/api/races?id=${id}`, { method: "DELETE" });
      if (res.ok) setRaces((prev) => prev.filter((r) => r.id !== id));
    } catch {}
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500">
        add races you&apos;re signed up for so other athletes can find you and
        connect over shared races.
      </p>

      {loading ? (
        <div className="h-12 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
      ) : races.length > 0 ? (
        <div className="space-y-2">
          {races.map((race) => (
            <div
              key={race.id}
              className="flex items-start justify-between gap-3 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-800 dark:text-cyan-200 px-3 py-2 rounded-lg text-sm"
            >
              <div>
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
                    .join(" · ") || "no details"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(race.id)}
                className="text-cyan-700 dark:text-cyan-300 hover:text-red-500 transition-colors flex-shrink-0"
                title="remove"
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
          ))}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">no races yet.</p>
      )}

      <form
        onSubmit={add}
        className="space-y-3 pt-3 border-t border-zinc-200 dark:border-zinc-800"
      >
        <div>
          <label className="block text-xs font-medium mb-1">race name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Boston Marathon 2026"
            className="w-full px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm focus:border-cyan-500 focus:outline-none"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1">distance</label>
            <select
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm focus:border-cyan-500 focus:outline-none"
            >
              <option value="">—</option>
              {DISTANCES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">race date</label>
            <input
              type="date"
              value={raceDate}
              onChange={(e) => setRaceDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">city</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Boston, MA"
              className="w-full px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">target time</label>
            <input
              type="text"
              value={targetTime}
              onChange={(e) => setTargetTime(e.target.value)}
              placeholder="e.g. 3:45:00"
              className="w-full px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {saving ? "adding..." : "add race"}
        </button>
      </form>
    </div>
  );
}
