"use client";

import { useState } from "react";

interface SafetyMenuProps {
  targetUserId: string;
  targetName: string | null;
  onBlocked?: () => void;
  /** Optional: report a specific message instead of the user */
  targetMessageId?: string;
  /** Optional: report a specific planned run */
  targetRunId?: string;
}

const REASONS: { value: string; label: string }[] = [
  { value: "harassment", label: "harassment or bullying" },
  { value: "inappropriate", label: "inappropriate content" },
  { value: "safety", label: "safety concern" },
  { value: "spam", label: "spam or scam" },
  { value: "impersonation", label: "impersonation" },
  { value: "other", label: "something else" },
];

export function SafetyMenu({
  targetUserId,
  targetName,
  onBlocked,
  targetMessageId,
  targetRunId,
}: SafetyMenuProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "report" | "block" | "done">(
    "menu"
  );
  const [reason, setReason] = useState("harassment");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitReport() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason,
          targetUserId,
          targetMessageId,
          targetRunId,
          details: details || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "failed");
      }
      setMode("done");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitBlock() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetUserId }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "failed");
      }
      setOpen(false);
      if (onBlocked) onBlocked();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
        aria-label="safety menu"
        title="block or report"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
        </svg>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setOpen(false);
              setMode("menu");
              setError(null);
            }}
          />
          <div className="absolute right-0 top-10 z-50 w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg p-3">
            {mode === "menu" && (
              <div className="space-y-1">
                <p className="text-xs text-zinc-500 px-2 py-1">
                  {targetName ?? "user"}
                </p>
                <button
                  onClick={() => setMode("report")}
                  className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  report
                </button>
                <button
                  onClick={() => setMode("block")}
                  className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-red-600 dark:text-red-400"
                >
                  block
                </button>
              </div>
            )}

            {mode === "report" && (
              <div>
                <p className="text-sm font-medium mb-2">
                  report {targetName ?? "user"}
                </p>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={busy}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 bg-transparent rounded-lg mb-2"
                >
                  {REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  disabled={busy}
                  rows={3}
                  maxLength={2000}
                  placeholder="optional details"
                  className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 bg-transparent rounded-lg mb-2 resize-none"
                />
                {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={submitReport}
                    disabled={busy}
                    className="flex-1 px-3 py-2 text-sm bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium disabled:opacity-50"
                  >
                    {busy ? "sending..." : "send report"}
                  </button>
                  <button
                    onClick={() => setMode("menu")}
                    disabled={busy}
                    className="px-3 py-2 text-sm bg-zinc-200 dark:bg-zinc-800 rounded-lg"
                  >
                    cancel
                  </button>
                </div>
                <p className="text-[10px] text-zinc-500 mt-2">
                  we review reports within 24 hours.
                </p>
              </div>
            )}

            {mode === "block" && (
              <div>
                <p className="text-sm font-medium mb-2">
                  block {targetName ?? "user"}?
                </p>
                <p className="text-xs text-zinc-500 mb-3">
                  you won&apos;t see each other in discovery or messages.
                  any existing connection will be removed.
                </p>
                {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={submitBlock}
                    disabled={busy}
                    className="flex-1 px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50"
                  >
                    {busy ? "blocking..." : "block"}
                  </button>
                  <button
                    onClick={() => setMode("menu")}
                    disabled={busy}
                    className="px-3 py-2 text-sm bg-zinc-200 dark:bg-zinc-800 rounded-lg"
                  >
                    cancel
                  </button>
                </div>
              </div>
            )}

            {mode === "done" && (
              <div className="p-2">
                <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-2">
                  thanks — we&apos;ve received your report and will review it
                  within 24 hours.
                </p>
                <button
                  onClick={() => {
                    setOpen(false);
                    setMode("menu");
                  }}
                  className="w-full px-3 py-2 text-sm bg-zinc-200 dark:bg-zinc-800 rounded-lg"
                >
                  close
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
