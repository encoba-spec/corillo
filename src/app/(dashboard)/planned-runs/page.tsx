import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PlannedRunsClient } from "./planned-runs-client";

export default async function PlannedRunsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id! },
    select: { units: true },
  });

  return (
    <PlannedRunsClient
      userId={session.user.id!}
      units={user?.units ?? "metric"}
    />
  );
}
