import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const results: Record<string, any> = {};

  results.envCheck = {
    authSecretLength: process.env.AUTH_SECRET?.length || 0,
    stravaClientIdLength: process.env.STRAVA_CLIENT_ID?.length || 0,
    stravaClientSecretLength: process.env.STRAVA_CLIENT_SECRET?.length || 0,
    authTrustHostValue: process.env.AUTH_TRUST_HOST,
    authUrl: process.env.AUTH_URL || "not set",
    vercelEnv: process.env.VERCEL || "not set",
  };

  // Test: simulate what the signIn server action does (POST to /api/auth/signin/strava)
  try {
    const { handlers } = await import("@/lib/auth");
    const url = new URL("/api/auth/signin/strava", request.url);

    // The signIn server action makes a POST request with form data
    const body = new URLSearchParams({ callbackUrl: "/discover" });
    const mockReq = new NextRequest(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const originalError = console.error;
    const capturedErrors: string[] = [];
    console.error = (...args: any[]) => {
      capturedErrors.push(args.map(a => {
        if (a instanceof Error) return `${a.name}: ${a.message}`;
        if (typeof a === "object") return JSON.stringify(a).slice(0, 500);
        return String(a).slice(0, 500);
      }).join(" "));
      originalError(...args);
    };

    const response = await handlers.POST(mockReq as any);
    console.error = originalError;

    results.postSigninResult = {
      status: response.status,
      location: response.headers.get("location"),
      isRedirectToStrava: response.headers.get("location")?.includes("strava.com") || false,
    };
    if (capturedErrors.length > 0) {
      results.capturedErrors = capturedErrors;
    }
  } catch (e: any) {
    results.postSigninError = {
      name: e.name,
      message: e.message,
      stack: e.stack?.split("\n").slice(0, 5),
    };
  }

  // Also test that GET /api/auth/providers still works
  try {
    const { handlers } = await import("@/lib/auth");
    const url = new URL("/api/auth/providers", request.url);
    const mockReq = new NextRequest(url.toString());
    const response = await handlers.GET(mockReq as any);
    const data = await response.json();
    results.providersCheck = { status: response.status, providers: Object.keys(data) };
  } catch (e: any) {
    results.providersError = e.message;
  }

  return NextResponse.json(results);
}
