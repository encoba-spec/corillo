"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { RunnerCard } from "@/components/runner/RunnerCard";
import { RunnerProfilePanel } from "@/components/runner/RunnerProfilePanel";
import { FilterPanel, type FilterValues } from "@/components/runner/FilterPanel";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface MatchesClientProps {
  initialFilters: FilterValues;
  units?: string;
}

export function MatchesClient({ initialFilters, units = "metric" }: MatchesClientProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<FilterValues>(initialFilters);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  async function handleMessage(recipientId: string) {
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId, content: "Hey! Want to run together?" }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/messages?thread=${data.threadId}`);
      }
    } catch (err) {
      console.error("Failed to start conversation:", err);
    }
  }

  const params = new URLSearchParams();
  params.set("maxDistanceKm", String(filters.maxDistanceKm));
  params.set("minPace", String(filters.minPace));
  params.set("maxPace", String(filters.maxPace));
  params.set("minDistance", String(filters.minDistance));
  params.set("maxDistance", String(filters.maxDistance));
  if (filters.preferredDays.length > 0) {
    params.set("preferredDays", filters.preferredDays.join(","));
  }
  if (filters.preferredTimeSlots.length > 0) {
    params.set("preferredTimeSlots", filters.preferredTimeSlots.join(","));
  }
  if (filters.raceDistance) {
    params.set("raceDistance", filters.raceDistance);
  }
  if (filters.raceTargetTime) {
    params.set("raceTargetTime", filters.raceTargetTime);
    params.set("raceTargetTimeTolerance", String(filters.raceTargetTimeTolerance));
  }
  if (filters.longRunDistance != null) {
    params.set("longRunDistance", String(filters.longRunDistance));
    params.set("longRunDistanceTolerance", String(filters.longRunDistanceTolerance));
  }
  if (filters.longRunPace != null) {
    params.set("longRunPace", String(filters.longRunPace));
    params.set("longRunPaceTolerance", String(filters.longRunPaceTolerance));
  }

  const { data, isLoading } = useSWR(
    `/api/runners/matches?${params.toString()}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const matches = Array.isArray(data) ? data : [];

  const handleFilterChange = useCallback((newFilters: FilterValues) => {
    setFilters(newFilters);
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Your Matches</h1>

      <div className="mb-4">
        <FilterPanel initial={initialFilters} onChange={handleFilterChange} units={units} />
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 animate-pulse"
              >
                <div className="flex gap-3">
                  <div className="w-12 h-12 bg-zinc-200 dark:bg-zinc-700 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-32" />
                    <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-48" />
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : matches.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-12 text-center">
            <p className="text-zinc-500 font-medium">No matches found</p>
            <p className="text-sm text-zinc-400 mt-1">
              Try expanding your search radius or adjusting filters.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-zinc-500 mb-2">
              {matches.length} runners ranked by compatibility
            </p>
            {matches.map((m: any, i: number) => (
              <div key={m.userId} className="relative">
                <div className="absolute -left-8 top-4 text-sm font-bold text-zinc-300 dark:text-zinc-700">
                  #{i + 1}
                </div>
                <RunnerCard {...m} units={units} onSelect={setProfileUserId} onMessage={handleMessage} />
              </div>
            ))}
          </>
        )}
      </div>

      {/* Runner Profile Panel */}
      <RunnerProfilePanel
        userId={profileUserId}
        onClose={() => setProfileUserId(null)}
        onMessage={(userId) => {
          setProfileUserId(null);
          handleMessage(userId);
        }}
        units={units}
      />
    </div>
  );
}
