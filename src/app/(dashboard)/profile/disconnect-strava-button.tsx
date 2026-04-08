"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function DisconnectStravaButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function handleDisconnect() {
    setError(null);
    try {
      const res = await fetch("/api/strava/disconnect", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "failed to disconnect");
      }
      startTransition(() => {
        // After disconnecting, sign the user out since auth is Strava-only.
        window.location.href = "/api/auth/signout?callbackUrl=/";
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "failed");
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="px-4 py-2 text-sm font-medium border border-red-300 dark:border-red-900 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
      >
        disconnect strava
      </button>
    );
  }

  return (
    <div className="p-4 border border-red-300 dark:border-red-900 rounded-lg bg-red-50 dark:bg-red-900/10">
      <p className="text-sm text-red-700 dark:text-red-300 mb-3">
        This will revoke corillo&apos;s access to your Strava account and
        permanently delete all imported activities. You will be signed out.
      </p>
      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleDisconnect}
          disabled={isPending}
          className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50"
        >
          {isPending ? "disconnecting..." : "yes, disconnect"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="px-4 py-2 text-sm font-medium bg-zinc-200 dark:bg-zinc-800 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-700"
        >
          cancel
        </button>
      </div>
    </div>
  );
}
