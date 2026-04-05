/**
 * Strava API client with rate limiting.
 * Rate limits: 200 req/15min, 2000/day.
 * Tracks usage via X-RateLimit-Usage response headers.
 */

const STRAVA_API_BASE = "https://www.strava.com/api/v3";

interface RateLimitState {
  shortTermUsage: number; // requests in current 15-min window
  shortTermLimit: number;
  dailyUsage: number;
  dailyLimit: number;
  lastUpdated: number;
}

const rateLimitState: RateLimitState = {
  shortTermUsage: 0,
  shortTermLimit: 200,
  dailyUsage: 0,
  dailyLimit: 2000,
  lastUpdated: Date.now(),
};

function updateRateLimits(headers: Headers) {
  const usage = headers.get("X-RateLimit-Usage");
  const limit = headers.get("X-RateLimit-Limit");

  if (usage) {
    const [shortTerm, daily] = usage.split(",").map(Number);
    rateLimitState.shortTermUsage = shortTerm;
    rateLimitState.dailyUsage = daily;
  }
  if (limit) {
    const [shortTerm, daily] = limit.split(",").map(Number);
    rateLimitState.shortTermLimit = shortTerm;
    rateLimitState.dailyLimit = daily;
  }
  rateLimitState.lastUpdated = Date.now();
}

function canMakeRequest(): boolean {
  return (
    rateLimitState.shortTermUsage < rateLimitState.shortTermLimit - 5 &&
    rateLimitState.dailyUsage < rateLimitState.dailyLimit - 10
  );
}

export async function stravaFetch<T>(
  endpoint: string,
  accessToken: string,
  options?: {
    method?: string;
    params?: Record<string, string | number>;
    body?: unknown;
  }
): Promise<T> {
  if (!canMakeRequest()) {
    throw new Error(
      `Strava rate limit approaching: ${rateLimitState.shortTermUsage}/${rateLimitState.shortTermLimit} (15min), ${rateLimitState.dailyUsage}/${rateLimitState.dailyLimit} (daily)`
    );
  }

  const url = new URL(`${STRAVA_API_BASE}${endpoint}`);
  if (options?.params) {
    for (const [key, value] of Object.entries(options.params)) {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString(), {
    method: options?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  updateRateLimits(response.headers);

  if (response.status === 429) {
    throw new Error("Strava rate limit exceeded. Try again later.");
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Strava API error ${response.status}: ${error}`);
  }

  return response.json();
}

export function getRateLimitState() {
  return { ...rateLimitState };
}

// Strava API types
export interface StravaAthlete {
  id: number;
  firstname: string;
  lastname: string;
  profile: string;
  city: string | null;
  state: string | null;
  country: string | null;
}

export interface StravaActivity {
  id: number;
  name: string;
  sport_type: string;
  type: string;
  start_date: string;
  start_date_local: string;
  elapsed_time: number;
  moving_time: number;
  distance: number;
  average_speed: number;
  start_latlng: [number, number] | null;
  end_latlng: [number, number] | null;
  visibility: string;
}

/**
 * Fetch athlete profile
 */
export async function getAthlete(
  accessToken: string
): Promise<StravaAthlete> {
  return stravaFetch<StravaAthlete>("/athlete", accessToken);
}

/**
 * Fetch activities with pagination.
 * Returns activities after the given epoch timestamp.
 */
export async function getActivities(
  accessToken: string,
  after?: number,
  page = 1,
  perPage = 50
): Promise<StravaActivity[]> {
  const params: Record<string, string | number> = {
    page,
    per_page: perPage,
  };
  if (after) params.after = after;

  return stravaFetch<StravaActivity[]>(
    "/athlete/activities",
    accessToken,
    { params }
  );
}

/**
 * Fetch all activities since a given date, handling pagination.
 */
export async function getAllActivitiesSince(
  accessToken: string,
  sinceDate: Date
): Promise<StravaActivity[]> {
  const after = Math.floor(sinceDate.getTime() / 1000);
  const allActivities: StravaActivity[] = [];
  let page = 1;

  while (true) {
    const activities = await getActivities(accessToken, after, page, 50);
    allActivities.push(...activities);

    if (activities.length < 50) break; // last page
    page++;

    // Safety: max 10 pages (500 activities)
    if (page > 10) break;
  }

  return allActivities;
}
