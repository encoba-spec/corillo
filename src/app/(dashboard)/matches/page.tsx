import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { MatchesClient } from "./matches-client";

export default async function MatchesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [prefs, user] = await Promise.all([
    prisma.searchPreferences.findUnique({
      where: { userId: session.user.id },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { units: true },
    }),
  ]);

  const initialFilters = {
    maxDistanceKm: prefs?.maxDistanceKm ?? 10,
    minPace: prefs?.minPace ?? 3.0,
    maxPace: prefs?.maxPace ?? 10.0,
    minDistance: prefs?.minDistance ?? 1.0,
    maxDistance: prefs?.maxDistance ?? 50.0,
    preferredDays: prefs?.preferredDays ?? [],
    preferredTimeSlots: prefs?.preferredTimeSlots ?? [],
    // Training filters default to null (off)
    raceDistance: null as string | null,
    raceTargetTime: null as string | null,
    raceTargetTimeTolerance: 15,
    longRunDistance: null as number | null,
    longRunDistanceTolerance: 5,
    longRunPace: null as number | null,
    longRunPaceTolerance: 1,
    corilloOnly: false,
  };

  return (
    <MatchesClient
      initialFilters={initialFilters}
      units={user?.units ?? "metric"}
    />
  );
}
