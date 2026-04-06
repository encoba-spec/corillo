"use client";

import { useState, useCallback } from "react";
import { DAY_LABELS, TIME_SLOTS, TIME_SLOT_LABELS } from "@/lib/matching/schedule";

const KM_TO_MI = 0.621371;
const MI_TO_KM = 1.60934;

const RACE_DISTANCES = ["5K", "10K", "Half Marathon", "Marathon", "Ultra"];

export interface FilterValues {
  maxDistanceKm: number;
  minPace: number;
  maxPace: number;
  minDistance: number;
  maxDistance: number;
  preferredDays: number[];
  preferredTimeSlots: string[];
  // Training-specific filters
  raceDistance: string | null;
  raceTargetTime: string | null;
  raceTargetTimeTolerance: number; // ± minutes
  longRunDistance: number | null; // km (stored metric)
  longRunDistanceTolerance: number; // ± km (stored metric)
  longRunPace: number | null; // min/km (stored metric)
  longRunPaceTolerance: number; // ± min/km (stored metric)
}

interface FilterPanelProps {
  initial: FilterValues;
  onChange: (filters: FilterValues) => void;
  units?: string; // "metric" | "imperial"
}

/** Parse a time string like "1:45:00" or "25:30" to total minutes */
function parseTimeToMinutes(t: string): number | null {
  if (!t) return null;
  const parts = t.split(":").map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 3) return parts[0] * 60 + parts[1] + parts[2] / 60;
  if (parts.length === 2) return parts[0] + parts[1] / 60;
  return null;
}

export function FilterPanel({ initial, onChange, units = "metric" }: FilterPanelProps) {
  const [filters, setFilters] = useState<FilterValues>(initial);
  const [isOpen, setIsOpen] = useState(false);
  const [showTraining, setShowTraining] = useState(false);

  const isImperial = units === "imperial";
  const distUnit = isImperial ? "mi" : "km";
  const paceUnit = isImperial ? "min/mi" : "min/km";

  // Conversion helpers for display
  function kmToDisplay(km: number): number {
    return isImperial ? km * KM_TO_MI : km;
  }
  function displayToKm(val: number): number {
    return isImperial ? val * MI_TO_KM : val;
  }
  function paceKmToDisplay(minPerKm: number): number {
    return isImperial ? minPerKm * MI_TO_KM : minPerKm;
  }
  function displayToPaceKm(minPerDisplay: number): number {
    return isImperial ? minPerDisplay * KM_TO_MI : minPerDisplay;
  }

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

  // Check if any training filter is active
  const hasTrainingFilters =
    filters.raceDistance ||
    filters.longRunDistance != null ||
    filters.longRunPace != null;

  // Display values for sliders (converted to user units)
  const displayMaxDistance = kmToDisplay(filters.maxDistanceKm);
  const displayMinDist = kmToDisplay(filters.minDistance);
  const displayMaxDist = kmToDisplay(filters.maxDistance);
  const displayMinPace = paceKmToDisplay(filters.minPace);
  const displayMaxPace = paceKmToDisplay(filters.maxPace);

  // Slider limits in display units
  const radiusMax = isImperial ? 31 : 50;
  const distSliderMax = isImperial ? 31 : 50;
  const paceSliderMin = isImperial ? 4.8 : 3;
  const paceSliderMax = isImperial ? 16.1 : 10;

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
          {(filters.preferredDays.length > 0 || filters.preferredTimeSlots.length > 0 || hasTrainingFilters) && (
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
              Search Radius: {displayMaxDistance.toFixed(0)} {distUnit}
            </label>
            <input
              type="range"
              min={isImperial ? 0.3 : 0.5}
              max={radiusMax}
              step={0.5}
              value={displayMaxDistance}
              onChange={(e) => update({ maxDistanceKm: displayToKm(parseFloat(e.target.value)) })}
              className="w-full mt-1 accent-cyan-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-400">
              <span>{isImperial ? "0.3" : "0.5"} {distUnit}</span>
              <span>{radiusMax} {distUnit}</span>
            </div>
          </div>

          {/* Pace Range */}
          <div>
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Pace: {displayMinPace.toFixed(1)} - {displayMaxPace.toFixed(1)} {paceUnit}
            </label>
            <div className="flex gap-2 mt-1">
              <input
                type="range"
                min={paceSliderMin}
                max={paceSliderMax}
                step={0.1}
                value={displayMinPace}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  const maxDisplay = paceKmToDisplay(filters.maxPace);
                  update({ minPace: displayToPaceKm(Math.min(val, maxDisplay - (isImperial ? 0.8 : 0.5))) });
                }}
                className="flex-1 accent-cyan-500"
              />
              <input
                type="range"
                min={paceSliderMin}
                max={paceSliderMax}
                step={0.1}
                value={displayMaxPace}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  const minDisplay = paceKmToDisplay(filters.minPace);
                  update({ maxPace: displayToPaceKm(Math.max(val, minDisplay + (isImperial ? 0.8 : 0.5))) });
                }}
                className="flex-1 accent-cyan-500"
              />
            </div>
            <div className="flex justify-between text-[10px] text-zinc-400">
              <span>{paceSliderMin.toFixed(0)} {paceUnit} (fast)</span>
              <span>{paceSliderMax.toFixed(0)} {paceUnit} (easy)</span>
            </div>
          </div>

          {/* Distance Range */}
          <div>
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Run Distance: {displayMinDist.toFixed(0)} - {displayMaxDist.toFixed(0)} {distUnit}
            </label>
            <div className="flex gap-2 mt-1">
              <input
                type="range"
                min={isImperial ? 0.6 : 1}
                max={distSliderMax}
                step={1}
                value={displayMinDist}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  const maxDisplay = kmToDisplay(filters.maxDistance);
                  update({ minDistance: displayToKm(Math.min(val, maxDisplay - (isImperial ? 0.6 : 1))) });
                }}
                className="flex-1 accent-cyan-500"
              />
              <input
                type="range"
                min={isImperial ? 0.6 : 1}
                max={distSliderMax}
                step={1}
                value={displayMaxDist}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  const minDisplay = kmToDisplay(filters.minDistance);
                  update({ maxDistance: displayToKm(Math.max(val, minDisplay + (isImperial ? 0.6 : 1))) });
                }}
                className="flex-1 accent-cyan-500"
              />
            </div>
            <div className="flex justify-between text-[10px] text-zinc-400">
              <span>{isImperial ? "1" : "1"} {distUnit}</span>
              <span>{distSliderMax} {distUnit}</span>
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

          {/* Training Filters Toggle */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <button
              onClick={() => setShowTraining(!showTraining)}
              className="flex items-center gap-2 text-xs font-medium text-zinc-500 uppercase tracking-wider hover:text-zinc-300 transition-colors"
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform ${showTraining ? "rotate-90" : ""}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Training Filters
              {hasTrainingFilters && (
                <span className="bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400 text-xs px-1.5 py-0.5 rounded-full normal-case tracking-normal">
                  active
                </span>
              )}
            </button>

            {showTraining && (
              <div className="mt-3 space-y-4">
                {/* Race Distance Filter */}
                <div>
                  <label className="text-xs font-medium text-zinc-500 block mb-1">
                    Training for race
                  </label>
                  <select
                    value={filters.raceDistance || ""}
                    onChange={(e) =>
                      update({
                        raceDistance: e.target.value || null,
                        raceTargetTime: e.target.value ? filters.raceTargetTime : null,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="">Any / No preference</option>
                    {RACE_DISTANCES.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Race Target Time + Tolerance */}
                {filters.raceDistance && (
                  <div className="pl-4 border-l-2 border-cyan-500/30 space-y-3 animate-in fade-in duration-200">
                    <div>
                      <label className="text-xs font-medium text-zinc-500 block mb-1">
                        Target time for {filters.raceDistance}
                      </label>
                      <input
                        type="text"
                        value={filters.raceTargetTime || ""}
                        onChange={(e) => update({ raceTargetTime: e.target.value || null })}
                        placeholder="e.g. 1:45:00 or 25:30"
                        className="w-full px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-sm focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                    {filters.raceTargetTime && (
                      <div>
                        <label className="text-xs font-medium text-zinc-500 block mb-1">
                          Tolerance: ± {filters.raceTargetTimeTolerance} min
                        </label>
                        <input
                          type="range"
                          min={5}
                          max={60}
                          step={5}
                          value={filters.raceTargetTimeTolerance}
                          onChange={(e) => update({ raceTargetTimeTolerance: parseInt(e.target.value) })}
                          className="w-full accent-cyan-500"
                        />
                        <div className="flex justify-between text-[10px] text-zinc-400">
                          <span>± 5 min</span>
                          <span>± 60 min</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Long Run Distance + Tolerance */}
                <div>
                  <label className="text-xs font-medium text-zinc-500 block mb-1">
                    Long run distance ({distUnit})
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={
                      filters.longRunDistance != null
                        ? kmToDisplay(filters.longRunDistance).toFixed(1)
                        : ""
                    }
                    onChange={(e) =>
                      update({
                        longRunDistance: e.target.value
                          ? displayToKm(parseFloat(e.target.value))
                          : null,
                      })
                    }
                    placeholder={`e.g. ${isImperial ? "10" : "16"}`}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-sm focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                {filters.longRunDistance != null && (
                  <div className="pl-4 border-l-2 border-cyan-500/30 animate-in fade-in duration-200">
                    <label className="text-xs font-medium text-zinc-500 block mb-1">
                      Tolerance: ± {kmToDisplay(filters.longRunDistanceTolerance).toFixed(1)} {distUnit}
                    </label>
                    <input
                      type="range"
                      min={isImperial ? 0.6 : 1}
                      max={isImperial ? 12.4 : 20}
                      step={isImperial ? 0.5 : 1}
                      value={kmToDisplay(filters.longRunDistanceTolerance)}
                      onChange={(e) =>
                        update({ longRunDistanceTolerance: displayToKm(parseFloat(e.target.value)) })
                      }
                      className="w-full accent-cyan-500"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-400">
                      <span>± {isImperial ? "1" : "1"} {distUnit}</span>
                      <span>± {isImperial ? "12" : "20"} {distUnit}</span>
                    </div>
                  </div>
                )}

                {/* Long Run Pace + Tolerance */}
                <div>
                  <label className="text-xs font-medium text-zinc-500 block mb-1">
                    Long run pace ({paceUnit})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={
                      filters.longRunPace != null
                        ? paceKmToDisplay(filters.longRunPace).toFixed(1)
                        : ""
                    }
                    onChange={(e) =>
                      update({
                        longRunPace: e.target.value
                          ? displayToPaceKm(parseFloat(e.target.value))
                          : null,
                      })
                    }
                    placeholder={`e.g. ${isImperial ? "8.5" : "5.5"}`}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-sm focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                {filters.longRunPace != null && (
                  <div className="pl-4 border-l-2 border-cyan-500/30 animate-in fade-in duration-200">
                    <label className="text-xs font-medium text-zinc-500 block mb-1">
                      Tolerance: ± {paceKmToDisplay(filters.longRunPaceTolerance).toFixed(1)} {paceUnit}
                    </label>
                    <input
                      type="range"
                      min={isImperial ? 0.3 : 0.2}
                      max={isImperial ? 4.8 : 3}
                      step={0.1}
                      value={paceKmToDisplay(filters.longRunPaceTolerance)}
                      onChange={(e) =>
                        update({ longRunPaceTolerance: displayToPaceKm(parseFloat(e.target.value)) })
                      }
                      className="w-full accent-cyan-500"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-400">
                      <span>± {isImperial ? "0.5" : "0.2"} {paceUnit}</span>
                      <span>± {isImperial ? "5" : "3"} {paceUnit}</span>
                    </div>
                  </div>
                )}

                {/* Clear Training Filters */}
                {hasTrainingFilters && (
                  <button
                    onClick={() =>
                      update({
                        raceDistance: null,
                        raceTargetTime: null,
                        raceTargetTimeTolerance: 15,
                        longRunDistance: null,
                        longRunDistanceTolerance: 5,
                        longRunPace: null,
                        longRunPaceTolerance: 1,
                      })
                    }
                    className="text-xs text-zinc-400 hover:text-zinc-200 underline transition-colors"
                  >
                    Clear training filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
