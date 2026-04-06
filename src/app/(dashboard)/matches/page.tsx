import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { MatchesClient } from "./matches-client";

export default async function YourCorilloPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { units: true },
  });

  return <MatchesClient units={user?.units ?? "metric"} />;
}
