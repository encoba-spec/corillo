"use client";

import { useState } from "react";
import { SafetyTipsModal } from "@/components/safety/SafetyTipsModal";

export function SafetyTipsLink() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-cyan-500 hover:underline"
      >
        view safety tips
      </button>
      {open && (
        <SafetyTipsModal
          forceOpen
          alreadyAcked
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
