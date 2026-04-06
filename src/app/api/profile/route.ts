import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { sport, longRunPace, raceDistance, raceTargetTime, cyclingType } = body;

  // Validate sport type
  if (sport && !["running", "cycling"].includes(sport)) {
    return NextResponse.json({ error: "Invalid sport type" }, { status: 400 });
  }

  // Validate cycling type
  if (cyclingType && !["road", "mountain", "both"].includes(cyclingType)) {
    return NextResponse.json(
      { error: "Invalid cycling type" },
      { status: 400 }
    );
  }

  // Validate race distance
  const validDistances = [
    "5K",
    "10K",
    "Half Marathon",
    "Marathon",
    "Ultra",
    "",
  ];
  if (raceDistance && !validDistances.includes(raceDistance)) {
    return NextResponse.json(
      { error: "Invalid race distance" },
      { status: 400 }
    );
  }

  // Build update data based on sport
  const updateData: any = { sport: sport || null };

  if (sport === "running") {
    updateData.longRunPace = longRunPace ? parseFloat(longRunPace) : null;
    updateData.raceDistance = raceDistance || null;
    updateData.raceTargetTime = raceTargetTime || null;
    updateData.cyclingType = null; // clear cycling fields
  } else if (sport === "cycling") {
    updateData.cyclingType = cyclingType || null;
    updateData.longRunPace = null; // clear running fields
    updateData.raceDistance = null;
    updateData.raceTargetTime = null;
  } else {
    // No sport selected, clear all
    updateData.longRunPace = null;
    updateData.raceDistance = null;
    updateData.raceTargetTime = null;
    updateData.cyclingType = null;
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
    select: {
      sport: true,
      longRunPace: true,
      raceDistance: true,
      raceTargetTime: true,
      cyclingType: true,
    },
  });

  return NextResponse.json(user);
}
