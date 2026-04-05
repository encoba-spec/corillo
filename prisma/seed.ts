/**
 * Seed script: generates synthetic runners for development.
 * These users have realistic running profiles near San Juan, PR
 * (based on the developer's Strava location).
 *
 * Usage: npx tsx prisma/seed.ts
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

// San Juan, PR area coordinates
const AREA_CENTER = { lat: 18.4655, lng: -66.1057 };
const AREA_RADIUS_DEG = 0.05; // ~5km

const FIRST_NAMES = [
  "Carlos", "Maria", "Jose", "Ana", "Luis", "Carmen", "Miguel", "Rosa",
  "Pedro", "Laura", "Rafael", "Sofia", "Fernando", "Isabella", "Diego",
  "Valentina", "Andres", "Camila", "Jorge", "Paula", "Roberto", "Elena",
  "Daniel", "Lucia", "Oscar", "Gabriela", "Marco", "Natalia", "Alex", "Diana",
  "Santiago", "Alejandra", "Victor", "Monica", "Eduardo", "Patricia",
  "Ricardo", "Claudia", "Felipe", "Andrea", "Sergio", "Mariana", "Ivan",
  "Teresa", "Martin", "Adriana", "Hector", "Daniela", "Manuel", "Alicia",
];

const LAST_NAMES = [
  "Rivera", "Torres", "Rodriguez", "Martinez", "Lopez", "Gonzalez",
  "Hernandez", "Garcia", "Cruz", "Morales", "Diaz", "Santos", "Reyes",
  "Ortiz", "Ramos", "Vega", "Colon", "Flores", "Ruiz", "Perez",
];

const TIME_SLOTS = [
  "early_morning", "morning", "midday", "afternoon", "evening", "night",
] as const;

const LOCATION_NAMES = [
  "Condado Beach", "Parque Central", "Calle Loiza", "Old San Juan",
  "Isla Verde", "Miramar", "Santurce", "Ocean Park", "Puerta de Tierra",
  "Parque Luis Munoz Rivera",
];

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRunnerProfile() {
  // Pace: 4.0-8.0 min/km (covers casual to competitive)
  const averagePace = randomBetween(4.0, 8.0);
  // Distance: 3-20 km average
  const averageDistance = randomBetween(3, 20);
  // Frequency: 1-6 runs per week
  const weeklyFrequency = randomBetween(1, 6);

  // Preferred days: pick 2-5 random days
  const numDays = Math.floor(randomBetween(2, 6));
  const allDays = [0, 1, 2, 3, 4, 5, 6];
  const preferredDays: number[] = [];
  for (let i = 0; i < numDays; i++) {
    const idx = Math.floor(Math.random() * allDays.length);
    preferredDays.push(allDays.splice(idx, 1)[0]);
  }
  preferredDays.sort();

  // Preferred time slot
  const preferredTimeSlot = randomItem([...TIME_SLOTS]);

  return {
    averagePace,
    averageDistance,
    weeklyFrequency,
    preferredDays,
    preferredTimeSlot,
  };
}

function generateRunningZones(userId: string) {
  // 1-3 running zones per user
  const numZones = Math.floor(randomBetween(1, 4));
  const zones = [];

  for (let i = 0; i < numZones; i++) {
    // Round to ~500m grid for privacy
    const GRID = 0.005;
    const lat =
      Math.round(
        (AREA_CENTER.lat + randomBetween(-AREA_RADIUS_DEG, AREA_RADIUS_DEG)) /
          GRID
      ) * GRID;
    const lng =
      Math.round(
        (AREA_CENTER.lng + randomBetween(-AREA_RADIUS_DEG, AREA_RADIUS_DEG)) /
          GRID
      ) * GRID;

    zones.push({
      userId,
      latitude: lat,
      longitude: lng,
      activityCount: Math.floor(randomBetween(3, 30)),
      radius: Math.floor(randomBetween(200, 1500)),
      label: randomItem(LOCATION_NAMES),
    });
  }

  return zones;
}

function generateSchedulePatterns(
  userId: string,
  preferredDays: number[],
  preferredTimeSlot: string
) {
  const patterns = [];

  for (const day of preferredDays) {
    // High frequency on preferred time slot
    patterns.push({
      userId,
      dayOfWeek: day,
      timeSlot: preferredTimeSlot,
      frequency: randomBetween(0.5, 1.0),
    });

    // Sometimes an alternate time slot
    if (Math.random() > 0.6) {
      const altSlot = randomItem(
        TIME_SLOTS.filter((s) => s !== preferredTimeSlot)
      );
      patterns.push({
        userId,
        dayOfWeek: day,
        timeSlot: altSlot,
        frequency: randomBetween(0.1, 0.4),
      });
    }
  }

  return patterns;
}

async function seed() {
  console.log("Seeding synthetic runners...\n");

  const NUM_USERS = 50;

  for (let i = 0; i < NUM_USERS; i++) {
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = randomItem(LAST_NAMES);
    const profile = generateRunnerProfile();

    // Create user
    const user = await prisma.user.create({
      data: {
        name: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${i}@seed.local`,
        city: "San Juan",
        state: "PR",
        country: "Puerto Rico",
        isDiscoverable: true,
        locationPrecision: "neighborhood",
        shareSchedule: true,
        sharePace: true,
        ...profile,
      },
    });

    // Create running zones
    const zones = generateRunningZones(user.id);
    for (const zone of zones) {
      await prisma.runningZone.create({ data: zone });
    }

    // Create schedule patterns
    const patterns = generateSchedulePatterns(
      user.id,
      profile.preferredDays,
      profile.preferredTimeSlot
    );
    for (const pattern of patterns) {
      await prisma.schedulePattern.create({ data: pattern });
    }

    // Create search preferences with default ranges
    await prisma.searchPreferences.create({
      data: {
        userId: user.id,
        maxDistanceKm: randomBetween(5, 20),
        minPace: Math.max(3, profile.averagePace - 2),
        maxPace: Math.min(10, profile.averagePace + 2),
        minDistance: Math.max(1, profile.averageDistance - 5),
        maxDistance: Math.min(50, profile.averageDistance + 10),
      },
    });

    process.stdout.write(`\r  Created ${i + 1}/${NUM_USERS} users`);
  }

  // Update PostGIS geometry columns
  await prisma.$queryRawUnsafe(`
    UPDATE "RunningZone"
    SET center = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
    WHERE center IS NULL
  `);

  console.log("\n\nSeed complete! Created:");
  const userCount = await prisma.user.count();
  const zoneCount = await prisma.runningZone.count();
  const patternCount = await prisma.schedulePattern.count();
  console.log(`  ${userCount} users`);
  console.log(`  ${zoneCount} running zones`);
  console.log(`  ${patternCount} schedule patterns`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
