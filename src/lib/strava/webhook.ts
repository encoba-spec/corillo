/**
 * Strava webhook event processing.
 *
 * Strava sends events for:
 * - activity create/update/delete
 * - athlete deauthorize
 *
 * We must respond 200 within 2 seconds,
 * so heavy processing happens asynchronously.
 */

import { prisma } from "@/lib/prisma";
import { processNewActivity } from "./sync";

export interface StravaWebhookEvent {
  object_type: "activity" | "athlete";
  object_id: number;
  aspect_type: "create" | "update" | "delete";
  owner_id: number; // Strava athlete ID
  subscription_id: number;
  event_time: number;
  updates?: Record<string, unknown>;
}

/**
 * Process a webhook event asynchronously.
 * Call this after responding 200 to Strava.
 */
export async function processWebhookEvent(event: StravaWebhookEvent) {
  console.log(
    `[webhook] ${event.object_type}:${event.aspect_type} for athlete ${event.owner_id}`
  );

  // Find user by Strava athlete ID
  const user = await prisma.user.findUnique({
    where: { stravaAthleteId: event.owner_id },
    select: {
      id: true,
      stravaAccessToken: true,
    },
  });

  if (!user || !user.stravaAccessToken) {
    console.log(`[webhook] No user found for athlete ${event.owner_id}`);
    return;
  }

  switch (event.object_type) {
    case "activity":
      await handleActivityEvent(user.id, user.stravaAccessToken, event);
      break;
    case "athlete":
      await handleAthleteEvent(user.id, event);
      break;
  }
}

async function handleActivityEvent(
  userId: string,
  accessToken: string,
  event: StravaWebhookEvent
) {
  switch (event.aspect_type) {
    case "create":
    case "update":
      try {
        await processNewActivity(userId, accessToken, event.object_id);
      } catch (err) {
        console.error("[webhook] Failed to process activity:", err);
      }
      break;
    case "delete":
      await prisma.activity.deleteMany({
        where: {
          userId,
          stravaActivityId: BigInt(event.object_id),
        },
      });
      break;
  }
}

async function handleAthleteEvent(
  userId: string,
  event: StravaWebhookEvent
) {
  if (event.aspect_type === "update" && event.updates?.["authorized"] === "false") {
    // Athlete revoked access
    console.log(`[webhook] Athlete ${event.owner_id} deauthorized`);
    await prisma.user.update({
      where: { id: userId },
      data: {
        stravaAccessToken: null,
        stravaRefreshToken: null,
        isDiscoverable: false,
      },
    });
  }
}
