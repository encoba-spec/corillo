"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";

const LocationPicker = dynamic(
  () =>
    import("@/components/map/LocationPicker").then((m) => m.LocationPicker),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
    ),
  }
);

interface User {
  id: string;
  name: string | null;
  image: string | null;
}

interface Club {
  id: string;
  name: string;
  profileImage: string | null;
}

interface PlannedRun {
  id: string;
  activityType: string;
  title: string;
  description: string | null;
  scheduledAt: string;
  estimatedPace: number | null;
  estimatedSpeed: number | null;
  estimatedDistance: number | null;
  terrainType: string | null;
  latitude: number;
  longitude: number;
  locationName: string | null;
  maxParticipants: number;
  genderRestriction: string | null;
  clubId: string | null;
  clubOnly: boolean;
  club: Club | null;
  creatorId: string;
  creator: User;
  participants: { user: User }[];
  invitations: { status: string }[];
  _count: { participants: number };
}

interface Invitation {
  id: string;
  status: string;
  run: PlannedRun & { creator: User; _count: { participants: number } };
}

export function PlannedRunsClient({ userId }: { userId: string }) {
  const [runs, setRuns] = useState<PlannedRun[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [filter, setFilter] = useState<"upcoming" | "mine" | "invited" | "club">(
    "upcoming"
  );
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/planned-runs?filter=${filter}`);
      if (res.ok) setRuns(await res.json());
    } catch (err) {
      console.error("Failed to fetch runs:", err);
    }
    setLoading(false);
  }, [filter]);

  const fetchInvitations = useCallback(async () => {
    try {
      const res = await fetch("/api/invitations");
      if (res.ok) setInvitations(await res.json());
    } catch (err) {
      console.error("Failed to fetch invitations:", err);
    }
  }, []);

  useEffect(() => {
    fetchRuns();
    fetchInvitations();
  }, [fetchRuns, fetchInvitations]);

  async function handleJoin(runId: string) {
    const res = await fetch(`/api/planned-runs/${runId}/join`, {
      method: "POST",
    });
    if (res.ok) fetchRuns();
  }

  async function handleLeave(runId: string) {
    const res = await fetch(`/api/planned-runs/${runId}/join`, {
      method: "DELETE",
    });
    if (res.ok) fetchRuns();
  }

  async function handleInvitation(invitationId: string, status: string) {
    const res = await fetch("/api/invitations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitationId, status }),
    });
    if (res.ok) {
      fetchInvitations();
      fetchRuns();
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">planned activities</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {showCreate ? "cancel" : "create activity"}
        </button>
      </div>

      {showCreate && (
        <CreateActivityForm
          onCreated={() => {
            setShowCreate(false);
            fetchRuns();
          }}
        />
      )}

      {/* Invitations */}
      {invitations.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">activity invitations</h2>
          <div className="space-y-3">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <ActivityTypeBadge type={inv.run.activityType} />
                      <p className="font-medium">{inv.run.title}</p>
                    </div>
                    <p className="text-sm text-zinc-500">
                      by {inv.run.creator.name} &middot;{" "}
                      {formatDate(inv.run.scheduledAt)} &middot;{" "}
                      {inv.run.locationName || "Location TBD"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleInvitation(inv.id, "accepted")}
                      className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm transition-colors"
                    >
                      join
                    </button>
                    <button
                      onClick={() => handleInvitation(inv.id, "declined")}
                      className="px-3 py-1.5 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 rounded-lg text-sm transition-colors"
                    >
                      decline
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
        {(
          [
            ["upcoming", "all upcoming"],
            ["mine", "my activities"],
            ["invited", "invited"],
            ["club", "my clubs"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              filter === key
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Activity list */}
      {loading ? (
        <div className="text-center py-12 text-zinc-500">Loading...</div>
      ) : runs.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-12 text-center text-zinc-500">
          <p>No planned activities yet. Create one to get started!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {runs.map((run) => (
            <ActivityCard
              key={run.id}
              run={run}
              userId={userId}
              onJoin={() => handleJoin(run.id)}
              onLeave={() => handleLeave(run.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityTypeBadge({ type }: { type: string }) {
  const isRide = type === "ride";
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
        isRide
          ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-300"
          : "bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-300"
      }`}
    >
      {isRide ? (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="5.5" cy="17.5" r="3.5" strokeWidth={2} />
          <circle cx="18.5" cy="17.5" r="3.5" strokeWidth={2} />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 6l-4 8h5l3-5" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.5 17.5L9 9l3 5" />
        </svg>
      ) : (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )}
      {isRide ? "ride" : "run"}
    </span>
  );
}

function ActivityCard({
  run,
  userId,
  onJoin,
  onLeave,
}: {
  run: PlannedRun;
  userId: string;
  onJoin: () => void;
  onLeave: () => void;
}) {
  const isCreator = run.creatorId === userId;
  const isParticipant = run.participants.some((p) => p.user.id === userId);
  const isFull = run._count.participants >= run.maxParticipants;
  const date = new Date(run.scheduledAt);
  const isRide = run.activityType === "ride";

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ActivityTypeBadge type={run.activityType} />
            <h3 className="font-semibold text-lg">{run.title}</h3>
          </div>
          <p className="text-sm text-zinc-500">
            by {run.creator.name}
            {run.locationName && ` \u00B7 ${run.locationName}`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">
            {date.toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </p>
          <p className="text-lg font-bold text-cyan-500">
            {date.toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      {run.description && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
          {run.description}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-500 mb-4">
        {isRide && run.estimatedSpeed && (
          <span>{run.estimatedSpeed.toFixed(0)} km/h</span>
        )}
        {!isRide && run.estimatedPace && (
          <span>{Math.floor(run.estimatedPace)}:{Math.round((run.estimatedPace % 1) * 60).toString().padStart(2, "0")} min/km pace</span>
        )}
        {run.estimatedDistance && (
          <span>{run.estimatedDistance.toFixed(1)} km</span>
        )}
        {isRide && run.terrainType && (
          <span className="inline-flex items-center text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-300 px-2 py-0.5 rounded-full">
            {run.terrainType === "mountain" ? "Mountain" : run.terrainType === "gravel" ? "Gravel" : "Road"}
          </span>
        )}
        <span>
          {run._count.participants}/{run.maxParticipants} {isRide ? "riders" : "runners"}
        </span>
        {run.club && (
          <span className="inline-flex items-center gap-1 text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 px-2 py-0.5 rounded-full">
            {run.club.name}
            {run.clubOnly && " (members only)"}
          </span>
        )}
        {run.genderRestriction && (
          <span className="text-xs bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-300 px-2 py-0.5 rounded-full">
            {run.genderRestriction === "woman"
              ? "women only"
              : run.genderRestriction === "man"
              ? "men only"
              : run.genderRestriction === "non_binary"
              ? "non-binary only"
              : "open"}
          </span>
        )}
      </div>

      {/* Participant avatars */}
      {run.participants.length > 0 && (
        <div className="flex -space-x-2 mb-4">
          {run.participants.slice(0, 8).map((p) => (
            <div key={p.user.id} title={p.user.name || ""}>
              {p.user.image ? (
                <img
                  src={p.user.image}
                  alt=""
                  className="w-8 h-8 rounded-full border-2 border-white dark:border-zinc-900"
                />
              ) : (
                <div className="w-8 h-8 rounded-full border-2 border-white dark:border-zinc-900 bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-medium">
                  {p.user.name?.[0] ?? "?"}
                </div>
              )}
            </div>
          ))}
          {run.participants.length > 8 && (
            <div className="w-8 h-8 rounded-full border-2 border-white dark:border-zinc-900 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs">
              +{run.participants.length - 8}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {isCreator ? (
          <span className="text-xs text-cyan-500 font-medium px-3 py-1.5 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
            your activity
          </span>
        ) : isParticipant ? (
          <button
            onClick={onLeave}
            className="px-4 py-1.5 text-sm bg-zinc-100 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 rounded-lg transition-colors"
          >
            leave
          </button>
        ) : (
          <button
            onClick={onJoin}
            disabled={isFull}
            className="px-4 py-1.5 text-sm bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {isFull ? "full" : "join"}
          </button>
        )}
      </div>
    </div>
  );
}

function CreateActivityForm({ onCreated }: { onCreated: () => void }) {
  const [activityType, setActivityType] = useState<"run" | "ride">("run");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [pace, setPace] = useState("");
  const [speed, setSpeed] = useState("");
  const [terrainType, setTerrainType] = useState("");
  const [distance, setDistance] = useState("");
  const [locationName, setLocationName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("10");
  const [genderRestriction, setGenderRestriction] = useState("");
  const [clubId, setClubId] = useState("");
  const [clubOnly, setClubOnly] = useState(false);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [addressSearch, setAddressSearch] = useState("");
  const [searching, setSearching] = useState(false);

  const isRide = activityType === "ride";

  useEffect(() => {
    fetch("/api/clubs")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setClubs(data);
      })
      .catch(() => {});
  }, []);

  function handleGetLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }
    setUseCurrentLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setUseCurrentLocation(false);
      },
      () => {
        setError("Could not get location");
        setUseCurrentLocation(false);
      }
    );
  }

  async function handleAddressSearch() {
    if (!addressSearch.trim()) return;
    setSearching(true);
    setError("");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          addressSearch.trim()
        )}&format=json&limit=1&addressdetails=1`,
        { headers: { "User-Agent": "corillo/1.0" } }
      );
      const results = await res.json();
      if (results.length > 0) {
        const result = results[0];
        setLat(parseFloat(result.lat).toFixed(6));
        setLng(parseFloat(result.lon).toFixed(6));
        if (!locationName) {
          setLocationName(result.display_name.split(",").slice(0, 2).join(",").trim());
        }
      } else {
        setError("Address not found. Try a different search or drop a pin on the map.");
      }
    } catch {
      setError("Search failed. Try again or drop a pin on the map.");
    }
    setSearching(false);
  }

  function handleMapLocationChange(newLat: number, newLng: number) {
    setLat(newLat.toFixed(6));
    setLng(newLng.toFixed(6));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !date || !time || !lat || !lng) {
      setError("Title, date/time, and location are required");
      return;
    }

    setSaving(true);
    setError("");

    const scheduledAt = new Date(`${date}T${time}`).toISOString();

    // Parse MM:SS pace to decimal (for runs)
    let parsedPace: number | null = null;
    if (!isRide && pace) {
      if (pace.includes(":")) {
        const parts = pace.split(":");
        if (parts.length === 2) {
          const mins = parseInt(parts[0], 10);
          const secs = parseInt(parts[1], 10);
          if (!isNaN(mins) && !isNaN(secs)) {
            parsedPace = mins + secs / 60;
          }
        }
      } else {
        parsedPace = parseFloat(pace) || null;
      }
    }

    try {
      const res = await fetch("/api/planned-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityType,
          title,
          description: description || null,
          scheduledAt,
          estimatedPace: parsedPace,
          estimatedSpeed: isRide && speed ? parseFloat(speed) : null,
          estimatedDistance: distance || null,
          terrainType: isRide ? terrainType || null : null,
          latitude: lat,
          longitude: lng,
          locationName: locationName || null,
          maxParticipants,
          genderRestriction: genderRestriction || null,
          clubId: clubId || null,
          clubOnly,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create activity");
      }

      onCreated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6"
    >
      <h2 className="text-lg font-semibold mb-4">create an activity</h2>

      {/* Activity Type Toggle */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">activity type</label>
        <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 w-fit">
          <button
            type="button"
            onClick={() => setActivityType("run")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
              activityType === "run"
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            run
          </button>
          <button
            type="button"
            onClick={() => setActivityType("ride")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
              activityType === "ride"
                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="5.5" cy="17.5" r="3.5" strokeWidth={2} />
              <circle cx="18.5" cy="17.5" r="3.5" strokeWidth={2} />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 6l-4 8h5l3-5" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.5 17.5L9 9l3 5" />
            </svg>
            ride
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={isRide ? "e.g. Sunday Group Ride" : "e.g. Saturday Long Run"}
            className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:border-cyan-500 focus:outline-none"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">
            description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Route details, meeting point, etc."
            rows={2}
            className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:border-cyan-500 focus:outline-none resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:border-cyan-500 focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            departure time
          </label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:border-cyan-500 focus:outline-none"
            required
          />
        </div>

        {/* Run-specific: Pace */}
        {!isRide && (
          <div>
            <label className="block text-sm font-medium mb-1">
              pace (min/km)
            </label>
            <input
              type="text"
              inputMode="text"
              value={pace}
              onChange={(e) => setPace(e.target.value)}
              placeholder="e.g. 5:30"
              className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:border-cyan-500 focus:outline-none"
            />
            <p className="text-xs text-zinc-500 mt-0.5">MM:SS format</p>
          </div>
        )}

        {/* Ride-specific: Speed */}
        {isRide && (
          <div>
            <label className="block text-sm font-medium mb-1">
              estimated speed (km/h)
            </label>
            <input
              type="number"
              step="1"
              min="5"
              max="60"
              value={speed}
              onChange={(e) => setSpeed(e.target.value)}
              placeholder="e.g. 25"
              className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:border-cyan-500 focus:outline-none"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">
            distance (km)
          </label>
          <input
            type="number"
            step="0.5"
            min="1"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            placeholder={isRide ? "e.g. 50" : "e.g. 10"}
            className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        {/* Ride-specific: Terrain */}
        {isRide && (
          <div>
            <label className="block text-sm font-medium mb-1">
              terrain type
            </label>
            <select
              value={terrainType}
              onChange={(e) => setTerrainType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:border-cyan-500 focus:outline-none"
            >
              <option value="">any / not specified</option>
              <option value="road">road</option>
              <option value="mountain">mountain</option>
              <option value="gravel">gravel</option>
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">
            max participants
          </label>
          <input
            type="number"
            min="2"
            max="100"
            value={maxParticipants}
            onChange={(e) => setMaxParticipants(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            location name
          </label>
          <input
            type="text"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            placeholder={isRide ? "e.g. Prospect Park Loop" : "e.g. Central Park South Gate"}
            className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            gender restriction
          </label>
          <select
            value={genderRestriction}
            onChange={(e) => setGenderRestriction(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:border-cyan-500 focus:outline-none"
          >
            <option value="">open to all</option>
            <option value="woman">women only</option>
            <option value="man">men only</option>
            <option value="non_binary">non-binary only</option>
          </select>
        </div>

        {clubs.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-1">
              club
            </label>
            <select
              value={clubId}
              onChange={(e) => setClubId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:border-cyan-500 focus:outline-none"
            >
              <option value="">no club</option>
              {clubs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {clubId && (
              <label className="flex items-center gap-2 mt-2 text-sm">
                <input
                  type="checkbox"
                  checked={clubOnly}
                  onChange={(e) => setClubOnly(e.target.checked)}
                  className="rounded border-zinc-300 text-cyan-500 focus:ring-cyan-500"
                />
                club members only
              </label>
            )}
          </div>
        )}

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-2">
            meeting point
          </label>

          {/* Address search + Use My Location */}
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={addressSearch}
              onChange={(e) => setAddressSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddressSearch();
                }
              }}
              placeholder="Search address, landmark, or place..."
              className="flex-1 px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:border-cyan-500 focus:outline-none text-sm"
            />
            <button
              type="button"
              onClick={handleAddressSearch}
              disabled={searching || !addressSearch.trim()}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {searching ? "..." : "search"}
            </button>
            <button
              type="button"
              onClick={handleGetLocation}
              disabled={useCurrentLocation}
              className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-sm transition-colors whitespace-nowrap"
              title="Use my current location"
            >
              {useCurrentLocation ? (
                "..."
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>

          {/* Map */}
          <LocationPicker
            latitude={lat ? parseFloat(lat) : null}
            longitude={lng ? parseFloat(lng) : null}
            onLocationChange={handleMapLocationChange}
            className="h-[300px]"
          />

          <p className="text-xs text-zinc-500 mt-2">
            Search for an address, use your location, or click the map to drop a pin.
            {lat && lng && (
              <span className="text-cyan-500 ml-1">
                Pin set at {parseFloat(lat).toFixed(4)}, {parseFloat(lng).toFixed(4)}
              </span>
            )}
          </p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400 mt-3">{error}</p>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {saving ? "creating..." : `create ${isRide ? "ride" : "run"}`}
        </button>
      </div>
    </form>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
