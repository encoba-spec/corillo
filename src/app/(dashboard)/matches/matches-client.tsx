"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface MiniUser {
  id: string;
  name: string | null;
  image: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  stravaAthleteId: number | null;
  averagePace: number | null;
  averageDistance: number | null;
  weeklyFrequency: number | null;
  preferredTimeSlot: string | null;
}

interface ConnectionEntry {
  id: string;
  createdAt: string;
  user: MiniUser;
}

interface ConnectionsResponse {
  accepted: ConnectionEntry[];
  incoming: ConnectionEntry[];
  outgoing: ConnectionEntry[];
}

interface MatchesClientProps {
  units?: string;
}

export function MatchesClient({ units = "metric" }: MatchesClientProps) {
  const router = useRouter();
  const { data, isLoading } = useSWR<ConnectionsResponse>(
    "/api/connections",
    fetcher,
    { revalidateOnFocus: false }
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const accepted = data?.accepted ?? [];
  const incoming = data?.incoming ?? [];
  const outgoing = data?.outgoing ?? [];

  async function respond(id: string, action: "accept" | "decline") {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/connections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "failed");
      await mutate("/api/connections");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/connections/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "failed");
      await mutate("/api/connections");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setBusyId(null);
    }
  }

  async function message(userId: string) {
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: userId,
          content: "Hey! Want to run together?",
        }),
      });
      if (res.ok) {
        const json = await res.json();
        router.push(`/messages?thread=${json.threadId}`);
      } else {
        const json = await res.json();
        setError(json.error ?? "failed to start conversation");
      }
    } catch {
      setError("failed to start conversation");
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-1">
        my <span className="text-cyan-500">corillo</span>
      </h1>
      <p className="text-sm text-zinc-500 mb-6">
        the athletes you&apos;ve connected with
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Incoming requests */}
      {incoming.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-zinc-500 mb-3">
            pending requests ({incoming.length})
          </h2>
          <div className="space-y-2">
            {incoming.map((c) => (
              <ConnectionRow
                key={c.id}
                entry={c}
                units={units}
                busy={busyId === c.id}
                actions={
                  <>
                    <button
                      onClick={() => respond(c.id, "accept")}
                      disabled={busyId === c.id}
                      className="px-3 py-1.5 text-xs font-medium bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      accept
                    </button>
                    <button
                      onClick={() => respond(c.id, "decline")}
                      disabled={busyId === c.id}
                      className="px-3 py-1.5 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 rounded-lg transition-colors disabled:opacity-50"
                    >
                      decline
                    </button>
                  </>
                }
              />
            ))}
          </div>
        </section>
      )}

      {/* Accepted connections */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-zinc-500 mb-3">
          connected ({accepted.length})
        </h2>
        {isLoading ? (
          <div className="space-y-2">
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
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : accepted.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center">
            <p className="text-zinc-500 font-medium">
              my <span className="text-cyan-500">corillo</span> is empty
            </p>
            <p className="text-sm text-zinc-400 mt-1">
              Head to discover to send connection requests.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {accepted.map((c) => (
              <ConnectionRow
                key={c.id}
                entry={c}
                units={units}
                busy={busyId === c.id}
                actions={
                  <>
                    <button
                      onClick={() => message(c.user.id)}
                      className="px-3 py-1.5 text-xs font-medium bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
                    >
                      message
                    </button>
                    <button
                      onClick={() => remove(c.id)}
                      disabled={busyId === c.id}
                      className="px-3 py-1.5 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 text-zinc-500 rounded-lg transition-colors disabled:opacity-50"
                    >
                      remove
                    </button>
                  </>
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* Outgoing pending */}
      {outgoing.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-zinc-500 mb-3">
            sent requests ({outgoing.length})
          </h2>
          <div className="space-y-2">
            {outgoing.map((c) => (
              <ConnectionRow
                key={c.id}
                entry={c}
                units={units}
                busy={busyId === c.id}
                actions={
                  <button
                    onClick={() => remove(c.id)}
                    disabled={busyId === c.id}
                    className="px-3 py-1.5 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 rounded-lg transition-colors disabled:opacity-50"
                  >
                    cancel
                  </button>
                }
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ConnectionRow({
  entry,
  actions,
}: {
  entry: ConnectionEntry;
  units: string;
  busy: boolean;
  actions: React.ReactNode;
}) {
  const u = entry.user;
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
      <div className="flex items-center gap-3">
        {u.image ? (
          <img
            src={u.image}
            alt=""
            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-12 bg-zinc-200 dark:bg-zinc-700 rounded-full flex items-center justify-center text-lg font-medium flex-shrink-0">
            {u.name?.[0] ?? "?"}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{u.name || "athlete"}</h3>
            {u.stravaAthleteId != null && (
              <span
                className="flex-shrink-0 w-4 h-4 rounded-full bg-cyan-500 flex items-center justify-center"
                title="on corillo"
              >
                <svg
                  className="w-2.5 h-2.5 text-white"
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
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-500 truncate">
            {[u.city, u.state].filter(Boolean).join(", ") || "location not set"}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">{actions}</div>
      </div>
    </div>
  );
}
