import Link from "next/link";
import { ConnectWithStravaButton } from "@/components/strava/ConnectWithStravaButton";

/**
 * Shown on /profile for users who signed in with Apple and haven't
 * yet connected Strava. A click sends them through the Strava OAuth
 * flow which will upgrade their account with activity data + matching.
 */
export function ConnectStravaLink() {
  return (
    <Link
      href="/api/auth/signin/strava?callbackUrl=/discover"
      aria-label="Connect with Strava"
      className="inline-flex"
    >
      <ConnectWithStravaButton width={200} />
    </Link>
  );
}
