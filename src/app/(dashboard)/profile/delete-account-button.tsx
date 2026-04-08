"use client";

import { useState } from "react";

export function DeleteAccountButton() {
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (typed !== "DELETE") {
      setError("type DELETE in all caps to confirm");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "failed");
      }
      window.location.href = "/api/auth/signout?callbackUrl=/";
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "failed");
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="px-4 py-2 text-sm font-medium border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
      >
        delete my corillo account
      </button>
    );
  }

  return (
    <div className="p-4 border border-red-400 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/10">
      <p className="text-sm text-red-800 dark:text-red-200 font-medium mb-2">
        Permanently delete your account
      </p>
      <p className="text-xs text-red-700 dark:text-red-300 mb-3">
        This will permanently delete your corillo profile, all imported
        activities, your running zones, messages, planned activities, races,
        and connections. It will also revoke corillo&apos;s access to your
        Strava account. This cannot be undone.
      </p>
      <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">
        Type <strong>DELETE</strong> to confirm:
      </p>
      <input
        type="text"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        disabled={busy}
        className="w-full px-3 py-2 text-sm border border-red-400 dark:border-red-800 bg-white dark:bg-zinc-900 rounded-lg mb-3 font-mono"
        placeholder="DELETE"
      />
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleDelete}
          disabled={busy || typed !== "DELETE"}
          className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50"
        >
          {busy ? "deleting..." : "permanently delete"}
        </button>
        <button
          onClick={() => {
            setConfirming(false);
            setTyped("");
            setError(null);
          }}
          disabled={busy}
          className="px-4 py-2 text-sm font-medium bg-zinc-200 dark:bg-zinc-800 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-700"
        >
          cancel
        </button>
      </div>
    </div>
  );
}
