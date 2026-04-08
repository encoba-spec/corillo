"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface InitialUser {
  name: string | null;
  gender: string | null;
  sportRunning: boolean;
  sportCycling: boolean;
  averagePace: number | null;
  averageDistance: number | null;
  raceDistance: string | null;
  isDiscoverable: boolean;
  sharePace: boolean;
  shareSchedule: boolean;
  units: string;
  hasStrava: boolean;
  city: string | null;
  state: string | null;
  country: string | null;
}

export function OnboardingWizard({ initial }: { initial: InitialUser | null }) {
  const router = useRouter();
  const hasStrava = initial?.hasStrava ?? false;

  // Apple-only flow gets an extra "tell us about you" step (location + pace)
  // and the age gate at the end.
  const TOTAL_STEPS = hasStrava ? 5 : 6;

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Profile fields
  const [gender, setGender] = useState(initial?.gender ?? "");
  const [sportRunning, setSportRunning] = useState(initial?.sportRunning ?? true);
  const [sportCycling, setSportCycling] = useState(initial?.sportCycling ?? false);
  const [raceDistance, setRaceDistance] = useState(initial?.raceDistance ?? "");
  const [isDiscoverable, setIsDiscoverable] = useState(initial?.isDiscoverable ?? true);
  const [sharePace, setSharePace] = useState(initial?.sharePace ?? true);
  const [shareSchedule, setShareSchedule] = useState(initial?.shareSchedule ?? true);

  // Self-reported fields (Apple-only path)
  const [city, setCity] = useState(initial?.city ?? "");
  const [state, setState] = useState(initial?.state ?? "");
  const [selfPaceMin, setSelfPaceMin] = useState("");
  const [selfPaceSec, setSelfPaceSec] = useState("");
  const [selfDistance, setSelfDistance] = useState("");
  const [selfFrequency, setSelfFrequency] = useState("");

  // Age gate (both flows)
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [birthYear, setBirthYear] = useState("");

  function next() {
    setError("");
    if (step < TOTAL_STEPS) setStep(step + 1);
  }
  function back() {
    setError("");
    if (step > 1) setStep(step - 1);
  }

  async function finish() {
    setSaving(true);
    setError("");
    try {
      // Validate age gate
      const year = birthYear ? parseInt(birthYear) : 0;
      const now = new Date();
      const approxAge = year > 0 ? now.getFullYear() - year : 0;
      if (!ageConfirmed || !year || approxAge < 17 || approxAge > 120) {
        throw new Error("you must be at least 17 to use corillo");
      }

      // Build self-reported pace in decimal minutes if provided
      let selfReportedPace: number | null = null;
      if (selfPaceMin) {
        const mins = parseFloat(selfPaceMin);
        const secs = selfPaceSec ? parseFloat(selfPaceSec) : 0;
        if (!isNaN(mins)) selfReportedPace = mins + secs / 60;
      }

      const payload: any = {
        gender: gender || null,
        sportRunning,
        sportCycling,
        raceDistance: raceDistance || null,
        isDiscoverable,
        sharePace,
        shareSchedule,
        ageConfirmed: true,
      };

      if (!hasStrava) {
        payload.city = city || null;
        payload.state = state || null;
        payload.selfReportedPace = selfReportedPace;
        payload.selfReportedDistance = selfDistance ? parseFloat(selfDistance) : null;
        payload.selfReportedFrequency = selfFrequency ? parseFloat(selfFrequency) : null;
      }

      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Could not save your preferences");
      }
      router.push("/discover");
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "failed");
      setSaving(false);
    }
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl p-8">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            step {step} of {TOTAL_STEPS}
          </p>
          {step > 1 && (
            <button
              onClick={back}
              className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              ← back
            </button>
          )}
        </div>
        <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-cyan-500 transition-all"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      {step === 1 && (
        <div>
          <h1 className="text-2xl font-bold mb-3">
            welcome{initial?.name ? `, ${initial.name.split(" ")[0]}` : ""}!
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            corillo helps you find training partners nearby — runners and cyclists who
            train at your pace, near your usual routes, around the same time of day.
          </p>
          {hasStrava ? (
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              We&apos;ll ask a few quick questions so we can match you well, then
              we&apos;ll import your Strava activities to figure out where you
              typically train.
            </p>
          ) : (
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              We&apos;ll ask a few quick questions so we can match you well.
              You can connect Strava later for activity-based matching with
              more accurate pace, distance, and schedule data.
            </p>
          )}
          <button
            onClick={next}
            className="w-full py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors"
          >
            let&apos;s go
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h1 className="text-2xl font-bold mb-2">a bit about you</h1>
          <p className="text-zinc-500 mb-6 text-sm">
            Used for matching and to help others find training partners they&apos;re comfortable with.
          </p>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">gender</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { v: "man", l: "Man" },
                { v: "woman", l: "Woman" },
                { v: "non_binary", l: "Non-binary" },
                { v: "prefer_not_to_say", l: "Prefer not to say" },
              ].map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setGender(opt.v)}
                  className={`py-2 px-3 text-sm rounded-lg border transition-colors ${
                    gender === opt.v
                      ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300"
                      : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                  }`}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">what do you train for?</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSportRunning(!sportRunning)}
                className={`flex-1 py-2 px-3 text-sm rounded-lg border transition-colors ${
                  sportRunning
                    ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300"
                    : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                }`}
              >
                running
              </button>
              <button
                type="button"
                onClick={() => setSportCycling(!sportCycling)}
                className={`flex-1 py-2 px-3 text-sm rounded-lg border transition-colors ${
                  sportCycling
                    ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300"
                    : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                }`}
              >
                cycling
              </button>
            </div>
            <p className="text-xs text-zinc-500 mt-1">pick one or both</p>
          </div>

          {sportRunning && (
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                training for a race? (optional)
              </label>
              <select
                value={raceDistance}
                onChange={(e) => setRaceDistance(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:border-cyan-500 focus:outline-none"
              >
                <option value="">no specific race</option>
                <option value="5K">5K</option>
                <option value="10K">10K</option>
                <option value="Half Marathon">Half Marathon</option>
                <option value="Marathon">Marathon</option>
                <option value="Ultra">Ultra</option>
              </select>
            </div>
          )}

          <button
            onClick={next}
            disabled={!gender || (!sportRunning && !sportCycling)}
            className="w-full py-3 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            continue
          </button>
        </div>
      )}

      {/* Apple-only: manual location + self-reported stats */}
      {!hasStrava && step === 3 && (
        <div>
          <h1 className="text-2xl font-bold mb-2">your training</h1>
          <p className="text-zinc-500 mb-6 text-sm">
            Since you haven&apos;t connected Strava yet, tell us a bit about
            where and how you train. You can update any of this later.
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">city</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. San Juan"
              className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">state / region</label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="e.g. PR"
              className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              typical pace (min per {initial?.units === "imperial" ? "mile" : "km"})
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                max="20"
                value={selfPaceMin}
                onChange={(e) => setSelfPaceMin(e.target.value)}
                placeholder="min"
                className="flex-1 px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:border-cyan-500 focus:outline-none"
              />
              <span className="self-center text-zinc-400">:</span>
              <input
                type="number"
                min="0"
                max="59"
                value={selfPaceSec}
                onChange={(e) => setSelfPaceSec(e.target.value)}
                placeholder="sec"
                className="flex-1 px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              typical run length ({initial?.units === "imperial" ? "mi" : "km"})
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={selfDistance}
              onChange={(e) => setSelfDistance(e.target.value)}
              placeholder="e.g. 8"
              className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              runs per week
            </label>
            <input
              type="number"
              min="0"
              max="20"
              step="0.5"
              value={selfFrequency}
              onChange={(e) => setSelfFrequency(e.target.value)}
              placeholder="e.g. 3"
              className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <button
            onClick={next}
            disabled={!city && !state}
            className="w-full py-3 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            continue
          </button>
          <p className="text-[10px] text-zinc-400 text-center mt-2">
            we need at least a city or state so we can show you nearby athletes
          </p>
        </div>
      )}

      {/* Privacy step: step 3 for Strava flow, step 4 for Apple flow */}
      {((hasStrava && step === 3) || (!hasStrava && step === 4)) && (
        <div>
          <h1 className="text-2xl font-bold mb-2">privacy & discoverability</h1>
          <p className="text-zinc-500 mb-6 text-sm">
            corillo never shares your exact location — just fuzzed neighborhood-level
            zones where you typically run or ride.
          </p>

          <ToggleRow
            label="discoverable"
            description="let other athletes find you in discover and on the map"
            value={isDiscoverable}
            onChange={setIsDiscoverable}
          />
          <ToggleRow
            label="share pace"
            description="let matched athletes see your typical pace"
            value={sharePace}
            onChange={setSharePace}
          />
          <ToggleRow
            label="share schedule"
            description="let matched athletes see when you usually run"
            value={shareSchedule}
            onChange={setShareSchedule}
          />

          <button
            onClick={next}
            className="mt-4 w-full py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors"
          >
            continue
          </button>
        </div>
      )}

      {/* Age gate step: step 4 for Strava flow, step 5 for Apple flow */}
      {((hasStrava && step === 4) || (!hasStrava && step === 5)) && (
        <div>
          <h1 className="text-2xl font-bold mb-2">age verification</h1>
          <p className="text-zinc-500 mb-6 text-sm">
            corillo is for athletes 17 and older. This helps us comply with
            App Store rules and protect younger users from in-person meetups
            with strangers.
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">birth year</label>
            <input
              type="number"
              min="1900"
              max={new Date().getFullYear()}
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
              placeholder="YYYY"
              className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <label className="flex items-start gap-3 mb-6 cursor-pointer">
            <input
              type="checkbox"
              checked={ageConfirmed}
              onChange={(e) => setAgeConfirmed(e.target.checked)}
              className="mt-1 w-4 h-4 accent-cyan-500"
            />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">
              I confirm I am at least 17 years old and I agree to corillo&apos;s{" "}
              <a href="/terms" target="_blank" className="text-cyan-500 underline">
                terms
              </a>{" "}
              and{" "}
              <a href="/privacy" target="_blank" className="text-cyan-500 underline">
                privacy policy
              </a>
              .
            </span>
          </label>

          <button
            onClick={next}
            disabled={!ageConfirmed || !birthYear}
            className="w-full py-3 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            continue
          </button>
        </div>
      )}

      {/* Finish step: step 5 for Strava, step 6 for Apple */}
      {((hasStrava && step === 5) || (!hasStrava && step === 6)) && (
        <div>
          <h1 className="text-2xl font-bold mb-2">
            {hasStrava ? "we're importing your activities" : "you're all set"}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            {hasStrava
              ? "corillo is reading your recent Strava activities in the background to figure out your usual training zones, average pace, and schedule. This usually takes a minute or two — you can finish onboarding now and they'll appear shortly."
              : "You're ready to discover training partners in your area. When you're ready for more accurate matching, connect Strava from your profile."}
          </p>
          <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-cyan-800 dark:text-cyan-200">
              💡 head to <span className="font-semibold">discover</span> to see
              athletes who train near you.
            </p>
          </div>

          {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

          <button
            onClick={finish}
            disabled={saving}
            className="w-full py-3 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
          >
            {saving ? "saving..." : "finish & explore"}
          </button>
        </div>
      )}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-b-0">
      <div className="flex-1 mr-4">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-zinc-500">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
          value ? "bg-cyan-500" : "bg-zinc-300 dark:bg-zinc-700"
        }`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            value ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
