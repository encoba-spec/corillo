import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { Auth, raw, skipCSRFCheck, createActionURL } from "@auth/core";

export async function GET(request: NextRequest) {
  const results: Record<string, any> = {};

  try {
    // Import the config
    const { authConfig } = await import("@/lib/auth");

    // Simulate what the signIn server action does
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    const signInURL = createActionURL(
      "signin",
      protocol,
      request.headers,
      process.env,
      authConfig
    );
    const url = `${signInURL}/strava`;

    const body = new URLSearchParams({ callbackUrl: "/discover" });
    const req = new Request(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    // Capture console.error output
    const originalError = console.error;
    const capturedErrors: string[] = [];
    console.error = (...args: any[]) => {
      capturedErrors.push(args.map(a => {
        if (a instanceof Error) return `${a.constructor.name}: ${a.message}\n${a.stack?.split("\n").slice(0, 3).join("\n")}`;
        if (typeof a === "object") return JSON.stringify(a).slice(0, 500);
        return String(a).slice(0, 500);
      }).join(" "));
      originalError(...args);
    };

    const res = await Auth(req, { ...authConfig, raw, skipCSRFCheck } as any);
    console.error = originalError;

    if (res instanceof Response) {
      results.responseType = "Response";
      results.status = res.status;
      results.location = res.headers.get("location");
      results.isStravaRedirect = res.headers.get("location")?.includes("strava.com") || false;
    } else {
      // Raw internal response
      const rawRes = res as any;
      results.responseType = "InternalResponse";
      results.redirect = rawRes?.redirect;
      results.isStravaRedirect = rawRes?.redirect?.includes("strava.com") || false;
      results.hasCookies = Array.isArray(rawRes?.cookies) && rawRes.cookies.length > 0;
    }

    results.signInURL = signInURL.toString();
    results.fullURL = url;
    if (capturedErrors.length > 0) {
      results.capturedErrors = capturedErrors;
    }
  } catch (e: any) {
    results.error = {
      name: e.constructor?.name || e.name,
      type: e.type,
      message: e.message,
      stack: e.stack?.split("\n").slice(0, 5),
    };
  }

  return NextResponse.json(results);
}
