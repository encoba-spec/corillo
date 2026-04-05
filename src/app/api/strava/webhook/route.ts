import { NextRequest, NextResponse } from "next/server";
import {
  processWebhookEvent,
  type StravaWebhookEvent,
} from "@/lib/strava/webhook";

/**
 * GET: Strava webhook subscription validation.
 * Strava sends a GET request with hub.challenge to verify the endpoint.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const challenge = searchParams.get("hub.challenge");
  const verifyToken = searchParams.get("hub.verify_token");

  // Verify token should match what we set during subscription
  const expectedToken = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN ?? "crew-finder-webhook";

  if (mode === "subscribe" && verifyToken === expectedToken) {
    return NextResponse.json({ "hub.challenge": challenge });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/**
 * POST: Receive webhook events from Strava.
 * Must respond 200 within 2 seconds — process async.
 */
export async function POST(request: NextRequest) {
  const event: StravaWebhookEvent = await request.json();

  // Process asynchronously — don't await
  processWebhookEvent(event).catch((err) => {
    console.error("[webhook] Async processing failed:", err);
  });

  // Respond immediately
  return NextResponse.json({ received: true }, { status: 200 });
}
