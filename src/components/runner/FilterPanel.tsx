"use client";

import { useState, useCallback } from "react";
import { DAY_LABELS, TIME_SLOTS, TIME_SLOT_LABELS } from "@/lib/matching/schedule";

const KM_TO_MI = 0.621371;
const MI_TO_KM = 1.60934;

const RACE_DISTANCES = ["5K", "10K", "Half Marathon", "Marathon", "Ultra"];

/** Convert decimal minutes to MM:SS */
function decimalToMMSS(decimal: number): string {
  const mins = Math.floor(decimal);
  const secs = Math.round((decimal - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/** Parse MM:SS or decimal to decimal minutes */
function parseMMSS(value: string): number | null {
  if (!value.trim()) return null;
  if (value.includes(":")) {
    const parts = value.split(":");
    if (parts.length === 2) {
      const mins = parseInt(parts[0], 10);
      const secs = parseInt(parts[1], 10);
      if (!isNaN(mins) && !isNaN(secs) && secs >= 0 && secs < 60) {
        return mins + secs / 60;
      }
    }
    return null;
  }
  const val = parseFloat(value);
  return isNaN(val) ? null : val;
}

export interface FilterValues {
  maxDistanceKm: number;
  minPace: number;
  maxPace: number;
  minDistance: number;
  maxDistance: number;
  preferredDays: number[];
  preferredTimeSlots: string[];
  corilloOnly: boolean; // filter to corillo users only
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

/** Deep compare two FilterValues objects */
function filtersEqual(a: FilterValues, b: FilterValues): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function FilterPanel({ initial, onChange, units = "metric" }: FilterPanelProps) {
  // `applied` = the filters currently in effect (sent to parent)
  // `draft` = the filters the user is currently editing in the panel
  const [applied, setApplied] = useState<FilterValues>(initial);
  const [draft, setDraft] = useState<FilterValues>(initial);
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

  // Update draft only (no API call)
  const updateDraft = useCallback(
    (partial: Partial<FilterValues>) => {
      setDraft((prev) => ({ ...prev, ...partial }));
    },
    []
  );

  const toggleDay = (day: number) => {
    const days = draft.preferredDays.includes(day)
      ? draft.preferredDays.filter((d) => d !== day)
      : [...draft.preferredDays, day];
    updateDraft({ preferredDays: days });
  };

  const toggleTimeSlot = (slot: string) => {
    const slots = draft.preferredTimeSlots.includes(slot)
      ? draft.preferredTimeSlots.filter((s) => s !== slot)
      : [...draft.preferredTimeSlots, slot];
    updateDraft({ preferredTimeSlots: slots });
  };

  // Apply draft filters
  function handleApply() {
    setApplied(draft);
    onChange(draft);
  }

  // Reset draft to match currently applied
  function handleReset() {
    setDraft(applied);
  }

  const hasUnsavedChanges = !filtersEqual(draft, applied);

  // Check if any training filter is active
  const hasTrainingFilters =
    draft.raceDistance ||
    draft.longRunDistance != null ||
    draft.longRunPace != null;

  // Check if any filter differs from defaults
  const hasActiveFilters =
    draft.preferredDays.length > 0 ||
    draft.preferredTimeSlots.length > 0 ||
    draft.corilloOnly ||
    hasTrainingFilters;

  // Display values for sliders (converted to user units)
  const displayMaxDistance = kmToDisplay(draft.maxDistanceKm);
  const displayMinDist = kmToDisplay(draft.minDistance);
  const displayMaxDist = kmToDisplay(draft.maxDistance);
  const displayMinPace = paceKmToDisplay(draft.minPace);
  const displayMaxPace = paceKmToDisplay(draft.maxPace);

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
          filters
          {hasActiveFilters && (
            <span className="bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400 text-xs px-1.5 py-0.5 rounded-full">
              active
            </span>
          )}
          {hasUnsavedChanges && (
            <span className="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 text-xs px-1.5 py-0.5 rounded-full">
              unsaved
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
            <label className="text-xs font-medium text-zinc-500 tracking-wider">
              search radius: {displayMaxDistance.toFixed(0)} {distUnit}
            </label>
            <input
              type="range"
              min={isImperial ? 0.3 : 0.5}
              max={radiusMax}
              step={0.5}
              value={displayMaxDistance}
              onChange={(e) => updateDraft({ maxDistanceKm: displayToKm(parseFloat(e.target.value)) })}
              className="w-full mt-1 accent-cyan-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-400">
              <span>{isImperial ? "0.3" : "0.5"} {distUnit}</span>
              <span>{radiusMax} {distUnit}</span>
            </div>
          </div>

          {/* Pace Range */}
          <div>
            <label className="text-xs font-medium text-zinc-500 tracking-wider">
              pace: {decimalToMMSS(displayMinPace)} - {decimalToMMSS(displayMaxPace)} {paceUnit}
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
                  const maxDisplay = paceKmToDisplay(draft.maxPace);
                  updateDraft({ minPace: displayToPaceKm(Math.min(val, maxDisplay - (isImperial ? 0.8 : 0.5))) });
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
                  const minDisplay = paceKmToDisplay(draft.minPace);
                  updateDraft({ maxPace: displayToPaceKm(Math.max(val, minDisplay + (isImperial ? 0.8 : 0.5))) });
                }}
                className="flex-1 accent-cyan-500"
              />
            </div>
            <div className="flex justify-between text-[10px] text-zinc-400">
              <span>{decimalToMMSS(paceSliderMin)} {paceUnit} (fast)</span>
              <span>{decimalToMMSS(paceSliderMax)} {paceUnit} (easy)</span>
            </div>
          </div>

          {/* Distance Range */}
          <div>
            <label className="text-xs font-medium text-zinc-500 tracking-wider">
              run distance: {displayMinDist.toFixed(0)} - {displayMaxDist.toFixed(0)} {distUnit}
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
                  const maxDisplay = kmToDisplay(draft.maxDistance);
                  updateDraft({ minDistance: displayToKm(Math.min(val, maxDisplay - (isImperial ? 0.6 : 1))) });
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
                  const minDisplay = kmToDisplay(draft.minDistance);
                  updateDraft({ maxDistance: displayToKm(Math.max(val, minDisplay + (isImperial ? 0.6 : 1))) });
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
            <label className="text-xs font-medium text-zinc-500 tracking-wider mb-1 block">
              days (any if none selected)
            </label>
            <div className="flex gap-1">
              {DAY_LABELS.map((label, i) => (
                <button
                  key={i}
                  onClick={() => toggleDay(i)}
                  className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                    draft.preferredDays.includes(i)
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
            <label className="text-xs font-medium text-zinc-500 tracking-wider mb-1 block">
              time of day (any if none selected)
            </label>
            <div className="flex flex-wrap gap-1">
              {TIME_SLOTS.map((slot) => (
                <button
                  key={slot}
                  onClick={() => toggleTimeSlot(slot)}
                  className={`px-2.5 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                    draft.preferredTimeSlots.includes(slot)
                      ? "bg-cyan-500 text-white"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  {TIME_SLOT_LABELS[slot].split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          {/* corillo Users Only */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.corilloOnly}
                onChange={(e) => updateDraft({ corilloOnly: e.target.checked })}
                className="rounded border-zinc-300 text-cyan-500 focus:ring-cyan-500"
              />
              <span className="text-sm font-medium">
                only show <span className="text-cyan-500">corillo</span> users
              </span>
            </label>
          </div>

          {/* Training Filters Toggle */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <button
              onClick={() => setShowTraining(!showTraining)}
              className="flex items-center gap-2 text-xs font-medium text-zinc-500 tracking-wider hover:text-zinc-300 transition-colors"
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform ${showTraining ? "rotate-90" : ""}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              training filters
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
                    training for race
                  </label>
                  <select
                    value={draft.raceDistance || ""}
                    onChange={(e) =>
                      updateDraft({
                        raceDistance: e.target.value || null,
                        raceTargetTime: e.target.value ? draft.raceTargetTime : null,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white text-sm focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="">any / no preference</option>
                    {RACE_DISTANCES.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Race Target Time + Tolerance */}
                {draft.raceDistance && (
                  <div className="pl-4 border-l-2 border-cyan-500/30 space-y-3 animate-in fade-in duration-200">
                    <div>
                      <label className="text-xs font-medium text-zinc-500 block mb-1">
                        target time for {draft.raceDistance}
                      </label>
                      <input
                        type="text"
                        value={draft.raceTargetTime || ""}
                        onChange={(e) => updateDraft({ raceTargetTime: e.target.value || null })}
                        placeholder="e.g. 1:45:00 or 25:30"
                        className="w-full px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-sm focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                    {draft.raceTargetTime && (
                      <div>
                        <label className="text-xs font-medium text-zinc-500 block mb-1">
                          tolerance: ± {draft.raceTargetTimeTolerance} min
                        </label>
                        <input
                          type="range"
                          min={5}
                          max={60}
                          step={5}
                          value={draft.raceTargetTimeTolerance}
                          onChange={(e) => updateDraft({ raceTargetTimeTolerance: parseInt(e.target.value) })}
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
                    long run distance ({distUnit})
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={
                      draft.longRunDistance != null
                        ? kmToDisplay(draft.longRunDistance).toFixed(1)
                        : ""
                    }
                    onChange={(e) =>
                      updateDraft({
                        longRunDistance: e.target.value
                          ? displayToKm(parseFloat(e.target.value))
                          : null,
                      })
                    }
                    placeholder={`e.g. ${isImperial ? "10" : "16"}`}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-sm focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                {draft.longRunDistance != null && (
                  <div className="pl-4 border-l-2 border-cyan-500/30 animate-in fade-in duration-200">
                    <label className="text-xs font-medium text-zinc-500 block mb-1">
                      tolerance: ± {kmToDisplay(draft.longRunDistanceTolerance).toFixed(1)} {distUnit}
                    </label>
                    <input
                      type="range"
                      min={isImperial ? 0.6 : 1}
                      max={isImperial ? 12.4 : 20}
                      step={isImperial ? 0.5 : 1}
                      value={kmToDisplay(draft.longRunDistanceTolerance)}
                      onChange={(e) =>
                        updateDraft({ longRunDistanceTolerance: displayToKm(parseFloat(e.target.value)) })
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
                    long run pace ({paceUnit})
                  </label>
                  <input
                    type="text"
                    inputMode="text"
                    value={
                      draft.longRunPace != null
                        ? decimalToMMSS(paceKmToDisplay(draft.longRunPace))
                        : ""
                    }
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (!raw) {
                        updateDraft({ longRunPace: null });
                        return;
                      }
                      const parsed = parseMMSS(raw);
                      if (parsed != null) {
                        updateDraft({ longRunPace: displayToPaceKm(parsed) });
                      }
                    }}
                    onBlur={(e) => {
                      const parsed = parseMMSS(e.target.value);
                      if (parsed != null) {
                        updateDraft({ longRunPace: displayToPaceKm(parsed) });
                      } else if (e.target.value) {
                        updateDraft({ longRunPace: null });
                      }
                    }}
                    placeholder={`e.g. ${isImperial ? "8:30" : "5:30"}`}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-sm focus:border-cyan-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-zinc-400 mt-0.5">MM:SS format</p>
                </div>
                {draft.longRunPace != null && (
                  <div className="pl-4 border-l-2 border-cyan-500/30 animate-in fade-in duration-200">
                    <label className="text-xs font-medium text-zinc-500 block mb-1">
                      tolerance: ± {decimalToMMSS(paceKmToDisplay(draft.longRunPaceTolerance))} {paceUnit}
                    </label>
                    <input
                      type="range"
                      min={isImperial ? 0.3 : 0.2}
                      max={isImperial ? 4.8 : 3}
                      step={0.1}
                      value={paceKmToDisplay(draft.longRunPaceTolerance)}
                      onChange={(e) =>
                        updateDraft({ longRunPaceTolerance: displayToPaceKm(parseFloat(e.target.value)) })
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
                      updateDraft({
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
                    clear training filters
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Apply / Reset buttons */}
          {hasUnsavedChanges && (
            <div className="flex gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={handleApply}
                className="flex-1 py-2 px-4 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                apply filters
              </button>
              <button
                onClick={handleReset}
                className="py-2 px-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 rounded-lg text-sm font-medium transition-colors"
              >
                reset
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
