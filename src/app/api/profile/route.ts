import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const VALID_GENDERS = ["man", "woman", "non_binary", "prefer_not_to_say"];
const VALID_GENDER_MATCH = ["man", "woman", "non_binary"];
const VALID_DISTANCES = ["5K", "10K", "Half Marathon", "Marathon", "Ultra"];

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    sportRunning,
    sportCycling,
    longRunPace,
    longRunDistance,
    raceDistance,
    raceTargetTime,
    cyclingRoad,
    cyclingMountain,
    units,
    gender,
    genderMatchWith,
    runNotifications,
    notifyTimeStart,
    notifyTimeEnd,
  } = body;

  // Validate units
  if (units && !["metric", "imperial"].includes(units)) {
    return NextResponse.json({ error: "Invalid units" }, { status: 400 });
  }

  // Validate gender
  if (gender && !VALID_GENDERS.includes(gender)) {
    return NextResponse.json({ error: "Invalid gender" }, { status: 400 });
  }

  // Validate gender match preferences
  if (genderMatchWith && Array.isArray(genderMatchWith)) {
    for (const g of genderMatchWith) {
      if (!VALID_GENDER_MATCH.includes(g)) {
        return NextResponse.json(
          { error: "Invalid gender match preference" },
          { status: 400 }
        );
      }
    }
  }

  // Validate race distance
  if (raceDistance && !VALID_DISTANCES.includes(raceDistance)) {
    return NextResponse.json(
      { error: "Invalid race distance" },
      { status: 400 }
    );
  }

  // Validate run notifications
  if (
    runNotifications &&
    !["all_nearby", "my_zones", "custom_areas", "none"].includes(runNotifications)
  ) {
    return NextResponse.json(
      { error: "Invalid notification preference" },
      { status: 400 }
    );
  }

  // Build update data
  const updateData: any = {};

  // Units
  if (units) updateData.units = units;

  // Gender
  if (gender !== undefined) updateData.gender = gender || null;

  // Gender match preferences
  if (genderMatchWith && Array.isArray(genderMatchWith)) {
    updateData.genderMatchWith = genderMatchWith;
  }

  // Notifications
  if (runNotifications) updateData.runNotifications = runNotifications;
  if (notifyTimeStart !== undefined)
    updateData.notifyTimeStart = notifyTimeStart || null;
  if (notifyTimeEnd !== undefined)
    updateData.notifyTimeEnd = notifyTimeEnd || null;

  // Sports (independent booleans)
  if (sportRunning !== undefined) updateData.sportRunning = !!sportRunning;
  if (sportCycling !== undefined) updateData.sportCycling = !!sportCycling;

  // Running fields
  updateData.longRunPace =
    sportRunning && longRunPace ? parseFloat(longRunPace) : null;
  updateData.longRunDistance =
    sportRunning && longRunDistance ? parseFloat(longRunDistance) : null;
  updateData.raceDistance =
    sportRunning && raceDistance ? raceDistance : null;
  updateData.raceTargetTime =
    sportRunning && raceTargetTime ? raceTargetTime : null;

  // Cycling fields (independent booleans)
  updateData.cyclingRoad = sportCycling ? !!cyclingRoad : false;
  updateData.cyclingMountain = sportCycling ? !!cyclingMountain : false;

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
    select: {
      sportRunning: true,
      sportCycling: true,
      longRunPace: true,
      longRunDistance: true,
      raceDistance: true,
      raceTargetTime: true,
      cyclingRoad: true,
      cyclingMountain: true,
      units: true,
      gender: true,
      genderMatchWith: true,
      runNotifications: true,
      notifyTimeStart: true,
      notifyTimeEnd: true,
    },
  });

  return NextResponse.json(user);
}
