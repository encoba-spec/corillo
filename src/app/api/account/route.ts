import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/account
 *
 * Permanently deletes the authenticated user's corillo account and all
 * associated data. Required by App Store Guideline 5.1.1(v).
 *
 * Steps:
 *  1. Best-effort deauthorize with Strava (if connected) so their token
 *     is revoked on Strava's side too.
 *  2. Delete the User row. All related rows cascade via `onDelete: Cascade`
 *     (activities, running zones, schedule patterns, planned runs,
 *     participants, invitations, notification areas, club memberships,
 *     thread memberships, messages, connections, races, accounts, sessions,
 *     blocks, reports filed by the user).
 *
 * Reports _against_ the user keep `targetUserId = null` via `onDelete: SetNull`
 * so moderation history is preserved.
 */
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { stravaAccessToken: true },
  });

  // Best-effort deauthorize with Strava
  if (user?.stravaAccessToken) {
    try {
      await fetch("https://www.strava.com/oauth/deauthorize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user.stravaAccessToken}`,
        },
      });
    } catch (err) {
      console.error("[account/delete] deauthorize failed", err);
    }
  }

  try {
    await prisma.user.delete({ where: { id: session.user.id } });
  } catch (err) {
    console.error("[account/delete] user delete failed", err);
    return NextResponse.json(
      { error: "failed to delete account" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
