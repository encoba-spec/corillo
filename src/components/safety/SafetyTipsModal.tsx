"use client";

import { useEffect, useState } from "react";

interface SafetyTipsModalProps {
  /** If true, show immediately regardless of ack state (used by manual open). */
  forceOpen?: boolean;
  onClose?: () => void;
  /** Whether user has already acknowledged safety tips (from server). */
  alreadyAcked?: boolean;
}

/**
 * First-run safety guidance for meeting strangers in person.
 * Required by App Store Guideline 1.4.1 for social-meet apps.
 *
 * Behavior:
 *  - If `alreadyAcked` is false, shows on mount and calls POST /api/safety-ack on dismiss.
 *  - If `forceOpen` is true, shows even if already acked (user clicked "safety tips" link).
 */
export function SafetyTipsModal({
  forceOpen,
  onClose,
  alreadyAcked,
}: SafetyTipsModalProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
      return;
    }
    if (alreadyAcked === false) {
      setOpen(true);
    }
  }, [forceOpen, alreadyAcked]);

  async function dismiss() {
    setBusy(true);
    if (!alreadyAcked) {
      try {
        await fetch("/api/safety-ack", { method: "POST" });
      } catch (err) {
        console.error("[safety-ack] failed", err);
      }
    }
    setOpen(false);
    setBusy(false);
    if (onClose) onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-900/30 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold">stay safe out there</h2>
        </div>

        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          corillo connects you with other athletes nearby. Before meeting
          anyone in person, please follow these guidelines:
        </p>

        <ul className="space-y-3 text-sm mb-5">
          <Tip>
            <strong>Meet in public.</strong> Pick a well-trafficked park
            entrance, café, or track — not someone&apos;s home.
          </Tip>
          <Tip>
            <strong>Tell a friend.</strong> Share your meeting location and
            expected return time with a family member or friend before you
            head out.
          </Tip>
          <Tip>
            <strong>Share location live.</strong> Use your phone&apos;s
            built-in location sharing (Find My, Google Maps) with someone
            you trust during the activity.
          </Tip>
          <Tip>
            <strong>Don&apos;t share sensitive info.</strong> Never share your
            home address, financial details, or login credentials with someone
            you met through corillo.
          </Tip>
          <Tip>
            <strong>Trust your instincts.</strong> If something feels off,
            leave. You can block or report anyone at any time from their
            profile.
          </Tip>
          <Tip>
            <strong>Emergencies.</strong> In an emergency, call your local
            emergency number immediately. corillo is not a safety service
            and cannot intervene in real time.
          </Tip>
        </ul>

        <button
          onClick={dismiss}
          disabled={busy}
          className="w-full py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {alreadyAcked ? "close" : "I understand — continue"}
        </button>
      </div>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="text-cyan-500 flex-shrink-0">•</span>
      <span className="text-zinc-700 dark:text-zinc-300">{children}</span>
    </li>
  );
}
