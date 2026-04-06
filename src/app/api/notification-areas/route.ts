import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/notification-areas - get user's notification areas
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const areas = await prisma.notificationArea.findMany({
    where: { userId: session.user.id },
    orderBy: { label: "asc" },
  });

  return NextResponse.json(areas);
}

// POST /api/notification-areas - add a notification area
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { label, latitude, longitude, radiusKm, polygon } = body;

  // Polygon-based area
  if (polygon && Array.isArray(polygon)) {
    const areaLabel = label?.trim() || "Drawn area";

    // Compute centroid of polygon for map centering
    let centLat = 0,
      centLng = 0;
    for (const [lng, lat] of polygon) {
      centLat += lat;
      centLng += lng;
    }
    centLat /= polygon.length;
    centLng /= polygon.length;

    const area = await prisma.notificationArea.create({
      data: {
        userId: session.user.id,
        label: areaLabel,
        latitude: centLat,
        longitude: centLng,
        radiusKm: 0,
        polygon: polygon,
        isPolygon: true,
      },
    });

    return NextResponse.json(area, { status: 201 });
  }

  // Named area (geocoded)
  if (!label?.trim()) {
    return NextResponse.json(
      { error: "Location name is required" },
      { status: 400 }
    );
  }

  // Geocode the label if no coordinates provided
  let lat = latitude ? parseFloat(latitude) : null;
  let lng = longitude ? parseFloat(longitude) : null;

  if (!lat || !lng) {
    // Use OpenStreetMap Nominatim for free geocoding
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(label.trim())}&format=json&limit=1`,
        { headers: { "User-Agent": "corillo/1.0" } }
      );
      const results = await res.json();
      if (results.length > 0) {
        lat = parseFloat(results[0].lat);
        lng = parseFloat(results[0].lon);
      }
    } catch (err) {
      console.error("[notification-areas] Geocoding failed:", err);
    }
  }

  const area = await prisma.notificationArea.create({
    data: {
      userId: session.user.id,
      label: label.trim(),
      latitude: lat,
      longitude: lng,
      radiusKm: radiusKm ? parseFloat(radiusKm) : 10,
      isPolygon: false,
    },
  });

  return NextResponse.json(area, { status: 201 });
}

// DELETE /api/notification-areas - delete a notification area
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: "Area ID required" }, { status: 400 });
  }

  await prisma.notificationArea.deleteMany({
    where: { id, userId: session.user.id },
  });

  return NextResponse.json({ deleted: true });
}
