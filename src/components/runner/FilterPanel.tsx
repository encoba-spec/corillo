"use client";

import { useState, useCallback } from "react";
import { DAY_LABELS, TIME_SLOTS, TIME_SLOT_LABELS } from "@/lib/matching/schedule";

export interface FilterValues {
  maxDistanceKm: number;
  minPace: number;
  maxPace: number;
  minDistance: number;
  maxDistance: number;
  preferredDays: number[];
  preferredTimeSlots: string[];
}

interface FilterPanelProps {
  initial: FilterValues;
  onChange: (filters: FilterValues) => void;
}

export function FilterPanel({ initial, onChange }: FilterPanelProps) {
  const [filters, setFilters] = useState<FilterValues>(initial);
  const [isOpen, setIsOpen] = useState(false);

  const update = useCallback(
    (partial: Partial<FilterValues>) => {
      const next = { ...filters, ...partial };
      setFilters(next);
      onChange(next);
    },
    [filters, onChange]
  );

  const toggleDay = (day: number) => {
    const days = filters.preferredDays.includes(day)
      ? filters.preferredDays.filter((d) => d !== day)
      : [...filters.preferredDays, day];
    update({ preferredDays: days });
  };

  const toggleTimeSlot = (slot: string) => {
    const slots = filters.preferredTimeSlots.includes(slot)
      ? filters.preferredTimeSlots.filter((s) => s !== slot)
      : [...filters.preferredTimeSlots, slot];
    update({ preferredTimeSlots: slots });
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
      {/* Toggle Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium"
      >
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filters
          {(filters.preferredDays.length > 0 || filters.preferredTimeSlots.length > 0) && (
            <span className="bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400 text-xs px-1.5 py-0.5 rounded-full">
              active
            </span>
          )}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Filter Controls */}
      {isOpen && (
        <div className="px-4 pb-4 space-y-4 border-t border-zinc-100 dark:border-zinc-800 pt-3">
          {/* Distance Radius */}
          <div>
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Search Radius: {filters.maxDistanceKm.toFixed(0)} km
            </label>
            <input
              type="range"
              min={0.5}
              max={50}
              step={0.5}
              value={filters.maxDistanceKm}
              onChange={(e) => update({ maxDistanceKm: parseFloat(e.target.value) })}
              className="w-full mt-1 accent-cyan-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-400">
              <span>0.5 km</span>
              <span>50 km</span>
            </div>
          </div>

          {/* Pace Range */}
          <div>
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Pace: {filters.minPace.toFixed(1)} - {filters.maxPace.toFixed(1)} min/km
            </label>
            <div className="flex gap-2 mt-1">
              <input
                type="range"
                min={3}
                max={10}
                step={0.1}
                value={filters.minPace}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  update({ minPace: Math.min(val, filters.maxPace - 0.5) });
                }}
                className="flex-1 accent-cyan-500"
              />
              <input
                type="range"
                min={3}
                max={10}
                step={0.1}
                value={filters.maxPace}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  update({ maxPace: Math.max(val, filters.minPace + 0.5) });
                }}
                className="flex-1 accent-cyan-500"
              />
            </div>
            <div className="flex justify-between text-[10px] text-zinc-400">
              <span>3 min/km (fast)</span>
              <span>10 min/km (easy)</span>
            </div>
          </div>

          {/* Distance Range */}
          <div>
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Run Distance: {filters.minDistance.toFixed(0)} - {filters.maxDistance.toFixed(0)} km
            </label>
            <div className="flex gap-2 mt-1">
              <input
                type="range"
                min={1}
                max={50}
                step={1}
                value={filters.minDistance}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  update({ minDistance: Math.min(val, filters.maxDistance - 1) });
                }}
                className="flex-1 accent-cyan-500"
              />
              <input
                type="range"
                min={1}
                max={50}
                step={1}
                value={filters.maxDistance}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  update({ maxDistance: Math.max(val, filters.minDistance + 1) });
                }}
                className="flex-1 accent-cyan-500"
              />
            </div>
            <div className="flex justify-between text-[10px] text-zinc-400">
              <span>1 km</span>
              <span>50 km</span>
            </div>
          </div>

          {/* Preferred Days */}
          <div>
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1 block">
              Days (any if none selected)
            </label>
            <div className="flex gap-1">
              {DAY_LABELS.map((label, i) => (
                <button
                  key={i}
                  onClick={() => toggleDay(i)}
                  className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                    filters.preferredDays.includes(i)
                      ? "bg-cyan-500 text-white"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Preferred Time Slots */}
          <div>
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1 block">
              Time of Day (any if none selected)
            </label>
            <div className="flex flex-wrap gap-1">
              {TIME_SLOTS.map((slot) => (
                <button
                  key={slot}
                  onClick={() => toggleTimeSlot(slot)}
                  className={`px-2.5 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                    filters.preferredTimeSlots.includes(slot)
                      ? "bg-cyan-500 text-white"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  {TIME_SLOT_LABELS[slot].split(" ")[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
