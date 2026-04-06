import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const VALID_DISTANCES = [
  "5K",
  "10K",
  "Half Marathon",
  "Marathon",
  "Ultra",
  "Other",
];

/**
 * GET /api/races
 * Returns the authenticated user's races, ordered by raceDate asc (nulls last).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const races = await prisma.userRace.findMany({
    where: { userId: session.user.id },
    orderBy: [{ raceDate: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(races);
}

/**
 * POST /api/races
 * Body: { name, distance?, raceDate?, targetTime?, city? }
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, distance, raceDate, targetTime, city } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json(
      { error: "Race name is required" },
      { status: 400 }
    );
  }
  if (distance && !VALID_DISTANCES.includes(distance)) {
    return NextResponse.json({ error: "Invalid distance" }, { status: 400 });
  }

  let parsedDate: Date | null = null;
  if (raceDate) {
    const d = new Date(raceDate);
    if (isNaN(d.getTime())) {
      return NextResponse.json(
        { error: "Invalid raceDate" },
        { status: 400 }
      );
    }
    parsedDate = d;
  }

  const race = await prisma.userRace.create({
    data: {
      userId: session.user.id,
      name: name.trim(),
      distance: distance || null,
      raceDate: parsedDate,
      targetTime: targetTime || null,
      city: city || null,
    },
  });

  return NextResponse.json(race, { status: 201 });
}

/**
 * DELETE /api/races?id=...
 */
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const race = await prisma.userRace.findUnique({ where: { id } });
  if (!race || race.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.userRace.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
