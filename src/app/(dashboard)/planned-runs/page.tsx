import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PlannedRunsClient } from "./planned-runs-client";

export default async function PlannedRunsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return <PlannedRunsClient userId={session.user.id!} />;
}
