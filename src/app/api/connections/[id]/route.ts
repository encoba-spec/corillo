import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * PATCH /api/connections/[id]
 * Body: { action: "accept" | "decline" }
 * Only the addressee of a pending request can accept or decline.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const me = session.user.id;
  const { id } = await params;

  const body = await request.json();
  const { action } = body;
  if (action !== "accept" && action !== "decline") {
    return NextResponse.json(
      { error: "action must be 'accept' or 'decline'" },
      { status: 400 }
    );
  }

  const connection = await prisma.connection.findUnique({ where: { id } });
  if (!connection) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (connection.addresseeId !== me) {
    return NextResponse.json(
      { error: "Only the addressee can respond to a request" },
      { status: 403 }
    );
  }
  if (connection.status !== "pending") {
    return NextResponse.json(
      { error: `Cannot ${action} a ${connection.status} connection` },
      { status: 400 }
    );
  }

  const updated = await prisma.connection.update({
    where: { id },
    data: { status: action === "accept" ? "accepted" : "declined" },
  });

  return NextResponse.json(updated);
}

/**
 * DELETE /api/connections/[id]
 * Removes a connection. Either participant can remove it.
 * Works for accepted, pending, or declined connections.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const me = session.user.id;
  const { id } = await params;

  const connection = await prisma.connection.findUnique({ where: { id } });
  if (!connection) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (connection.requesterId !== me && connection.addresseeId !== me) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.connection.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
