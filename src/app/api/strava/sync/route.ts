import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncUserData } from "@/lib/strava/sync";

/**
 * POST: Trigger a manual sync of the authenticated user's Strava data.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { stravaAccessToken: true },
  });

  if (!user?.stravaAccessToken) {
    return NextResponse.json(
      { error: "No Strava connection found" },
      { status: 400 }
    );
  }

  try {
    await syncUserData(session.user.id, user.stravaAccessToken);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[sync] Manual sync failed:", error);
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500 }
    );
  }
}
