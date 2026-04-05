"use client";

export function CompatibilityBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 70
      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      : pct >= 40
        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {pct}% match
    </span>
  );
}
