import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { MatchesClient } from "./matches-client";

export default async function MatchesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const prefs = await prisma.searchPreferences.findUnique({
    where: { userId: session.user.id },
  });

  const initialFilters = {
    maxDistanceKm: prefs?.maxDistanceKm ?? 10,
    minPace: prefs?.minPace ?? 3.0,
    maxPace: prefs?.maxPace ?? 10.0,
    minDistance: prefs?.minDistance ?? 1.0,
    maxDistance: prefs?.maxDistance ?? 50.0,
    preferredDays: prefs?.preferredDays ?? [],
    preferredTimeSlots: prefs?.preferredTimeSlots ?? [],
  };

  return <MatchesClient initialFilters={initialFilters} />;
}
