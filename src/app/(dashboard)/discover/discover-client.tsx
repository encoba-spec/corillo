"use client";

import { useState, useCallback, useEffect } from "react";
import useSWR from "swr";
import dynamic from "next/dynamic";
import { RunnerCard } from "@/components/runner/RunnerCard";
import { FilterPanel, type FilterValues } from "@/components/runner/FilterPanel";

// Leaflet must be loaded client-side only (uses window)
const RunnerMap = dynamic(
  () => import("@/components/map/RunnerMap").then((m) => m.RunnerMap),
  { ssr: false, loading: () => <div className="w-full h-[400px] bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" /> }
);

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface DiscoverClientProps {
  initialFilters: FilterValues;
}

export function DiscoverClient({ initialFilters }: DiscoverClientProps) {
  const [filters, setFilters] = useState<FilterValues>(initialFilters);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [view, setView] = useState<"map" | "list">("map");

  // Build query string from filters
  const queryParams = new URLSearchParams();
  queryParams.set("maxDistanceKm", String(filters.maxDistanceKm));

  // Fetch matches with filters
  const matchParams = new URLSearchParams();
  matchParams.set("maxDistanceKm", String(filters.maxDistanceKm));
  matchParams.set("minPace", String(filters.minPace));
  matchParams.set("maxPace", String(filters.maxPace));
  matchParams.set("minDistance", String(filters.minDistance));
  matchParams.set("maxDistance", String(filters.maxDistance));
  if (filters.preferredDays.length > 0) {
    matchParams.set("preferredDays", filters.preferredDays.join(","));
  }
  if (filters.preferredTimeSlots.length > 0) {
    matchParams.set("preferredTimeSlots", filters.preferredTimeSlots.join(","));
  }

  const { data: matchData, isLoading: matchesLoading } = useSWR(
    `/api/runners/matches?${matchParams.toString()}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: nearbyData, isLoading: nearbyLoading } = useSWR(
    `/api/runners/nearby?${queryParams.toString()}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const matches = Array.isArray(matchData) ? matchData : [];
  const zones = nearbyData?.zones ?? [];
  const myZones = nearbyData?.myZones ?? [];

  const handleFilterChange = useCallback((newFilters: FilterValues) => {
    setFilters(newFilters);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Discover Runners</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView("map")}
            className={`px-3 py-1.5 text-sm rounded-lg ${
              view === "map"
                ? "bg-cyan-500 text-white"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
            }`}
          >
            Map
          </button>
          <button
            onClick={() => setView("list")}
            className={`px-3 py-1.5 text-sm rounded-lg ${
              view === "list"
                ? "bg-cyan-500 text-white"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
            }`}
          >
            List
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="mb-4">
        <FilterPanel initial={initialFilters} onChange={handleFilterChange} />
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-4">
        {/* Map or List */}
        <div>
          {view === "map" ? (
            <RunnerMap
              myZones={myZones}
              zones={zones}
              selectedUserId={selectedUserId}
              onZoneClick={setSelectedUserId}
              className="h-[500px]"
            />
          ) : (
            <div className="space-y-3">
              {matchesLoading ? (
                <LoadingSkeleton />
              ) : matches.length === 0 ? (
                <EmptyState />
              ) : (
                matches.map((m: any) => (
                  <RunnerCard
                    key={m.userId}
                    {...m}
                    onSelect={setSelectedUserId}
                  />
                ))
              )}
            </div>
          )}
        </div>

        {/* Runner List Sidebar (visible in map view) */}
        {view === "map" && (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider sticky top-0 bg-zinc-50 dark:bg-zinc-950 py-1">
              {matchesLoading
                ? "Loading..."
                : `${matches.length} runners nearby`}
            </h2>
            {matchesLoading ? (
              <LoadingSkeleton />
            ) : matches.length === 0 ? (
              <EmptyState />
            ) : (
              matches.map((m: any) => (
                <RunnerCard
                  key={m.userId}
                  {...m}
                  onSelect={setSelectedUserId}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 animate-pulse"
        >
          <div className="flex gap-3">
            <div className="w-12 h-12 bg-zinc-200 dark:bg-zinc-700 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-32" />
              <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-48" />
              <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-24" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

function EmptyState() {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center">
      <svg
        className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
        />
      </svg>
      <p className="text-zinc-500 font-medium">No runners found</p>
      <p className="text-sm text-zinc-400 mt-1">
        Try expanding your search radius or adjusting filters.
      </p>
    </div>
  );
}
