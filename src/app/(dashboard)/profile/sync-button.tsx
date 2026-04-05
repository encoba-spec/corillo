"use client";

import { useState } from "react";

export function SyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setResult(null);

    try {
      const res = await fetch("/api/strava/sync", { method: "POST" });
      if (res.ok) {
        setResult("Sync complete! Refreshing...");
        // Reload to show updated data
        setTimeout(() => window.location.reload(), 1000);
      } else {
        const data = await res.json();
        setResult(`Sync failed: ${data.error}`);
      }
    } catch {
      setResult("Sync failed: network error");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {result && (
        <span className="text-sm text-zinc-500">{result}</span>
      )}
      <button
        onClick={handleSync}
        disabled={syncing}
        className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
      >
        <svg
          className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        {syncing ? "Syncing..." : "Sync Strava"}
      </button>
    </div>
  );
}
