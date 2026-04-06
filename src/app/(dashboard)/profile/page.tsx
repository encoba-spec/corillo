import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SyncButton } from "./sync-button";
import { EditProfileForm } from "./edit-profile-form";
import {
  DAY_LABELS,
  TIME_SLOTS,
  TIME_SLOT_LABELS,
} from "@/lib/matching/schedule";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      _count: {
        select: {
          activities: true,
          runningZones: true,
        },
      },
      schedulePatterns: true,
      runningZones: true,
      clubMemberships: {
        include: {
          club: true,
        },
      },
    },
  });

  if (!user) redirect("/login");

  // Build schedule heatmap data
  const heatmap: Record<string, Record<string, number>> = {};
  for (const day of DAY_LABELS) {
    heatmap[day] = {};
    for (const slot of TIME_SLOTS) {
      heatmap[day][slot] = 0;
    }
  }
  for (const pattern of user.schedulePatterns) {
    const dayLabel = DAY_LABELS[pattern.dayOfWeek];
    heatmap[dayLabel][pattern.timeSlot] = pattern.frequency;
  }

  const isImperial = user.units === "imperial";
  const KM_TO_MI = 0.621371;
  const MI_TO_KM = 1.60934;

  function decimalToMMSS(decimal: number): string {
    const mins = Math.floor(decimal);
    const secs = Math.round((decimal - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  const paceDisplay = user.averagePace
    ? isImperial
      ? `${decimalToMMSS(user.averagePace * MI_TO_KM)} min/mi`
      : `${decimalToMMSS(user.averagePace)} min/km`
    : "--";

  const distDisplay = user.averageDistance
    ? isImperial
      ? `${(user.averageDistance * KM_TO_MI).toFixed(1)} mi`
      : `${user.averageDistance.toFixed(1)} km`
    : "--";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">your profile</h1>
        <SyncButton />
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          {user.image ? (
            <img
              src={user.image}
              alt=""
              className="w-16 h-16 rounded-full"
            />
          ) : (
            <div className="w-16 h-16 bg-zinc-200 dark:bg-zinc-700 rounded-full flex items-center justify-center text-xl font-medium">
              {user.name?.[0] ?? "?"}
            </div>
          )}
          <div>
            <h2 className="text-xl font-semibold">{user.name}</h2>
            <p className="text-zinc-500">
              {[user.city, user.state, user.country]
                .filter(Boolean)
                .join(", ") || "Location not set"}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="avg pace" value={paceDisplay} />
          <StatCard label="avg distance" value={distDisplay} />
          <StatCard
            label="weekly runs"
            value={
              user.weeklyFrequency
                ? `${user.weeklyFrequency.toFixed(1)}x`
                : "--"
            }
          />
          <StatCard
            label="activities"
            value={String(user._count.activities)}
          />
        </div>

        {/* Running Areas */}
        {user.runningZones.length > 0 && (
          <div className="mb-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
            <h3 className="font-medium mb-3">running areas</h3>
            <div className="flex flex-wrap gap-2">
              {user.runningZones.map((zone) => (
                <div
                  key={zone.id}
                  className="bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 px-3 py-1.5 rounded-lg text-sm"
                >
                  {zone.label || `Area`} ({zone.activityCount} runs)
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Clubs */}
        {user.clubMemberships.length > 0 && (
          <div className="mb-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
            <h3 className="font-medium mb-3">clubs</h3>
            <div className="flex flex-wrap gap-2">
              {user.clubMemberships.map((membership) => (
                <div
                  key={membership.id}
                  className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded-lg text-sm"
                >
                  {membership.club.profileImage && (
                    <img
                      src={membership.club.profileImage}
                      alt=""
                      className="w-5 h-5 rounded-full"
                    />
                  )}
                  {membership.club.name}
                  {membership.role === "admin" && (
                    <span className="text-xs bg-purple-200 dark:bg-purple-800 px-1.5 py-0.5 rounded">
                      admin
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Schedule Heatmap */}
        {user.schedulePatterns.length > 0 && (
          <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
            <h3 className="font-medium mb-3">running schedule</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left py-1 pr-2"></th>
                    {DAY_LABELS.map((day) => (
                      <th
                        key={day}
                        className="text-center py-1 px-1 font-normal text-zinc-500"
                      >
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIME_SLOTS.map((slot) => (
                    <tr key={slot}>
                      <td className="py-1 pr-2 font-medium text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                        {TIME_SLOT_LABELS[slot].split(" ")[0]}
                      </td>
                      {DAY_LABELS.map((day) => {
                        const freq = heatmap[day][slot];
                        return (
                          <td key={day} className="py-1 px-1 text-center">
                            <div
                              className="w-8 h-6 rounded mx-auto"
                              style={{
                                backgroundColor:
                                  freq > 0
                                    ? `rgba(6, 182, 212, ${Math.max(0.15, freq)})`
                                    : "rgba(0,0,0,0.05)",
                              }}
                              title={`${day} ${slot}: ${(freq * 100).toFixed(0)}%`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Training Profile & Matching */}
        <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
          <h3 className="font-medium mb-4">profile settings</h3>
          <EditProfileForm
            initialData={{
              sportRunning: user.sportRunning,
              sportCycling: user.sportCycling,
              longRunPace: user.longRunPace,
              longRunDistance: user.longRunDistance,
              raceDistance: user.raceDistance,
              raceTargetTime: user.raceTargetTime,
              cyclingRoad: user.cyclingRoad,
              cyclingMountain: user.cyclingMountain,
              units: user.units,
              gender: user.gender,
              genderMatchWith: user.genderMatchWith,
              runNotifications: user.runNotifications,
              notifyTimeStart: user.notifyTimeStart,
              notifyTimeEnd: user.notifyTimeEnd,
            }}
          />
        </div>

        {/* Privacy */}
        <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
          <h3 className="font-medium mb-2">privacy settings</h3>
          <div className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
            <p>
              Discoverable:{" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {user.isDiscoverable ? "Yes" : "No"}
              </span>
            </p>
            <p>
              Location precision:{" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {user.locationPrecision}
              </span>
            </p>
            <p>
              Share schedule:{" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {user.shareSchedule ? "Yes" : "No"}
              </span>
            </p>
            <p>
              Share pace:{" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {user.sharePace ? "Yes" : "No"}
              </span>
            </p>
            <p>
              Run notifications:{" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {user.runNotifications === "my_zones"
                  ? "My running areas"
                  : user.runNotifications === "all_nearby"
                  ? "All nearby"
                  : "None"}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3 text-center">
      <p className="text-xs text-zinc-500 tracking-wider">{label}</p>
      <p className="text-lg font-semibold mt-1">{value}</p>
    </div>
  );
}
