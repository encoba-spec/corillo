import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Revokes corillo's access to the user's Strava account and deletes all
 * Strava-derived data (activities, tokens, athlete id). Required by
 * Strava's API Agreement: users must be able to revoke access and have
 * their data deleted from the app.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { stravaAccessToken: true },
  });

  // Best-effort deauthorize with Strava. Even if this fails (token expired,
  // network), we still wipe local data.
  if (user?.stravaAccessToken) {
    try {
      await fetch("https://www.strava.com/oauth/deauthorize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user.stravaAccessToken}`,
        },
      });
    } catch (err) {
      console.error("[strava/disconnect] deauthorize failed", err);
    }
  }

  await prisma.$transaction([
    prisma.activity.deleteMany({ where: { userId: session.user.id } }),
    prisma.account.deleteMany({
      where: { userId: session.user.id, provider: "strava" },
    }),
    prisma.user.update({
      where: { id: session.user.id },
      data: {
        stravaAthleteId: null,
        stravaAccessToken: null,
        stravaRefreshToken: null,
        stravaTokenExpires: null,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
