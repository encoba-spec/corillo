"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface ProfileMenuProps {
  name: string | null;
  image: string | null;
  /**
   * Server-component slot for the sign-out form. Rendered inside the
   * dropdown panel. Passed from the layout because server actions can't
   * be invoked directly from a client component.
   */
  signOutSlot: React.ReactNode;
}

/**
 * Profile avatar with a hover/click dropdown menu, modeled on Strava's
 * top-nav menu. Hover on desktop opens the panel; a small grace period
 * prevents flicker when moving between the trigger and the panel.
 * Click also toggles for touch devices and keyboard users.
 */
export function ProfileMenu({ name, image, signOutSlot }: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  function cancelClose() {
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current);
      closeTimeout.current = null;
    }
  }

  function scheduleClose() {
    cancelClose();
    closeTimeout.current = setTimeout(() => setOpen(false), 180);
  }

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    return () => cancelClose();
  }, []);

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 text-sm hover:text-cyan-500 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/50 rounded-full"
      >
        {image ? (
          <img src={image} alt="" className="w-8 h-8 rounded-full" />
        ) : (
          <div className="w-8 h-8 bg-zinc-200 dark:bg-zinc-700 rounded-full flex items-center justify-center text-xs font-medium">
            {name?.[0] ?? "?"}
          </div>
        )}
        <span className="hidden sm:inline">{name}</span>
        <svg
          className={`w-3 h-3 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full pt-2 w-48 z-50"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg py-1 overflow-hidden">
            <Link
              href="/profile"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              my profile
            </Link>
            <div className="border-t border-zinc-100 dark:border-zinc-800" />
            <div className="[&_button]:w-full [&_button]:text-left [&_button]:px-4 [&_button]:py-2.5 [&_button]:text-sm [&_button]:text-zinc-700 dark:[&_button]:text-zinc-200 [&_button]:hover:bg-zinc-100 dark:[&_button]:hover:bg-zinc-800">
              {signOutSlot}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
