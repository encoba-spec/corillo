import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_REASONS = new Set([
  "harassment",
  "spam",
  "inappropriate",
  "safety",
  "impersonation",
  "other",
]);

/**
 * POST /api/reports
 * body: {
 *   reason: "harassment" | "spam" | "inappropriate" | "safety" | "impersonation" | "other",
 *   targetUserId?: string,
 *   targetMessageId?: string,
 *   targetRunId?: string,
 *   details?: string,
 * }
 *
 * App Store Guideline 1.2 requires a reporting mechanism with a 24-hour
 * response SLA. Reports land in the DB with status=open; a human reviews.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { reason, targetUserId, targetMessageId, targetRunId, details } = body;

  if (!reason || !VALID_REASONS.has(reason)) {
    return NextResponse.json(
      { error: "invalid reason" },
      { status: 400 }
    );
  }
  if (!targetUserId && !targetMessageId && !targetRunId) {
    return NextResponse.json(
      { error: "must specify a report target" },
      { status: 400 }
    );
  }
  if (details && typeof details === "string" && details.length > 2000) {
    return NextResponse.json(
      { error: "details too long" },
      { status: 400 }
    );
  }
  if (targetUserId === session.user.id) {
    return NextResponse.json(
      { error: "cannot report yourself" },
      { status: 400 }
    );
  }

  const report = await prisma.report.create({
    data: {
      reporterId: session.user.id,
      targetUserId: targetUserId ?? null,
      targetMessageId: targetMessageId ?? null,
      targetRunId: targetRunId ?? null,
      reason,
      details: details ?? null,
    },
    select: { id: true, createdAt: true },
  });

  // TODO: wire up an email/webhook alert here (Resend, Slack, etc.) to
  // meet the 24-hour SLA. For now, reports land in the DB.
  console.log(
    "[moderation] new report",
    JSON.stringify({
      id: report.id,
      reporterId: session.user.id,
      targetUserId,
      reason,
    })
  );

  return NextResponse.json({ id: report.id, createdAt: report.createdAt });
}
