"use client";

import { useState, useEffect, useCallback } from "react";

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
  title: string;
  description: string | null;
  scheduledAt: string;
  estimatedPace: number | null;
  estimatedDistance: number | null;
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
        <h1 className="text-2xl font-bold">Planned Runs</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {showCreate ? "Cancel" : "Create Run"}
        </button>
      </div>

      {showCreate && (
        <CreateRunForm
          onCreated={() => {
            setShowCreate(false);
            fetchRuns();
          }}
        />
      )}

      {/* Invitations */}
      {invitations.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Run Invitations</h2>
          <div className="space-y-3">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{inv.run.title}</p>
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
                      Join
                    </button>
                    <button
                      onClick={() => handleInvitation(inv.id, "declined")}
                      className="px-3 py-1.5 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 rounded-lg text-sm transition-colors"
                    >
                      Decline
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
            ["upcoming", "All Upcoming"],
            ["mine", "My Runs"],
            ["invited", "Invited"],
            ["club", "My Clubs"],
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

      {/* Run list */}
      {loading ? (
        <div className="text-center py-12 text-zinc-500">Loading...</div>
      ) : runs.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-12 text-center text-zinc-500">
          <p>No planned runs yet. Create one to get started!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {runs.map((run) => (
            <RunCard
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

function RunCard({
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

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-lg">{run.title}</h3>
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
        {run.estimatedPace && (
          <span>{run.estimatedPace.toFixed(1)} min/km pace</span>
        )}
        {run.estimatedDistance && (
          <span>{run.estimatedDistance.toFixed(1)} km</span>
        )}
        <span>
          {run._count.participants}/{run.maxParticipants} runners
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
              ? "Women only"
              : run.genderRestriction === "man"
              ? "Men only"
              : run.genderRestriction === "non_binary"
              ? "Non-Binary only"
              : "Open"}
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
            Your run
          </span>
        ) : isParticipant ? (
          <button
            onClick={onLeave}
            className="px-4 py-1.5 text-sm bg-zinc-100 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 rounded-lg transition-colors"
          >
            Leave
          </button>
        ) : (
          <button
            onClick={onJoin}
            disabled={isFull}
            className="px-4 py-1.5 text-sm bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {isFull ? "Full" : "Join Run"}
          </button>
        )}
      </div>
    </div>
  );
}

function CreateRunForm({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [pace, setPace] = useState("");
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !date || !time || !lat || !lng) {
      setError("Title, date/time, and location are required");
      return;
    }

    setSaving(true);
    setError("");

    const scheduledAt = new Date(`${date}T${time}`).toISOString();

    try {
      const res = await fetch("/api/planned-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || null,
          scheduledAt,
          estimatedPace: pace || null,
          estimatedDistance: distance || null,
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
        throw new Error(data.error || "Failed to create run");
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
      <h2 className="text-lg font-semibold mb-4">Create a Run</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Saturday Long Run"
            className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:border-cyan-500 focus:outline-none"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">
            Description (optional)
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
          <label className="block text-sm font-medium mb-1">Date</label>
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
            Departure Time
          </label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:border-cyan-500 focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Pace (min/km)
          </label>
          <input
            type="number"
            step="0.1"
            min="3"
            max="12"
            value={pace}
            onChange={(e) => setPace(e.target.value)}
            placeholder="e.g. 5.5"
            className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Distance (km)
          </label>
          <input
            type="number"
            step="0.5"
            min="1"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            placeholder="e.g. 10"
            className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Max Participants
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
            Location Name
          </label>
          <input
            type="text"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            placeholder="e.g. Central Park South Gate"
            className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Gender Restriction
          </label>
          <select
            value={genderRestriction}
            onChange={(e) => setGenderRestriction(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:border-cyan-500 focus:outline-none"
          >
            <option value="">Open to all</option>
            <option value="woman">Women only</option>
            <option value="man">Men only</option>
            <option value="non_binary">Non-Binary only</option>
          </select>
        </div>

        {clubs.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-1">
              Club
            </label>
            <select
              value={clubId}
              onChange={(e) => setClubId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:border-cyan-500 focus:outline-none"
            >
              <option value="">No club</option>
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
                Club members only
              </label>
            )}
          </div>
        )}

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">
            Meeting Point Coordinates
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.000001"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="Latitude"
              className="flex-1 px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:border-cyan-500 focus:outline-none"
              required
            />
            <input
              type="number"
              step="0.000001"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="Longitude"
              className="flex-1 px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:border-cyan-500 focus:outline-none"
              required
            />
            <button
              type="button"
              onClick={handleGetLocation}
              disabled={useCurrentLocation}
              className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-sm transition-colors whitespace-nowrap"
            >
              {useCurrentLocation ? "..." : "Use My Location"}
            </button>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Use &ldquo;Use My Location&rdquo; or enter coordinates manually
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
          {saving ? "Creating..." : "Create Run"}
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
