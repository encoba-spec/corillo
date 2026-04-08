import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { OnboardingWizard } from "./onboarding-wizard";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id! },
    select: {
      onboardedAt: true,
      name: true,
      gender: true,
      sportRunning: true,
      sportCycling: true,
      averagePace: true,
      averageDistance: true,
      raceDistance: true,
      raceTargetTime: true,
      isDiscoverable: true,
      sharePace: true,
      shareSchedule: true,
      units: true,
    },
  });

  // Already onboarded -> bounce to discover
  if (user?.onboardedAt) {
    redirect("/discover");
  }

  return <OnboardingWizard initial={user} />;
}
