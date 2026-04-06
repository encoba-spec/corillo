import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const results: Record<string, any> = {};

  // Check env vars
  results.envCheck = {
    authSecretLength: process.env.AUTH_SECRET?.length || 0,
    stravaClientIdLength: process.env.STRAVA_CLIENT_ID?.length || 0,
    stravaClientSecretLength: process.env.STRAVA_CLIENT_SECRET?.length || 0,
    authTrustHostValue: process.env.AUTH_TRUST_HOST,
    authUrl: process.env.AUTH_URL || "not set",
    vercelEnv: process.env.VERCEL || "not set",
  };

  // Test 1: Can we import auth?
  try {
    const { authConfig } = await import("@/lib/auth");
    results.providerCount = authConfig.providers?.length;
  } catch (e: any) {
    results.importError = e.message;
    return NextResponse.json(results);
  }

  // Test 2: Call the handler directly and capture errors
  try {
    const { handlers } = await import("@/lib/auth");
    const url = new URL("/api/auth/signin/strava", request.url);
    const mockReq = new NextRequest(url.toString());

    // Monkey-patch console.error to capture Auth.js error logging
    const originalError = console.error;
    const capturedErrors: string[] = [];
    console.error = (...args: any[]) => {
      capturedErrors.push(args.map(a => {
        if (a instanceof Error) return `${a.name}: ${a.message}\n${a.stack?.split("\n").slice(0, 3).join("\n")}`;
        if (typeof a === "object") return JSON.stringify(a).slice(0, 500);
        return String(a).slice(0, 500);
      }).join(" "));
      originalError(...args);
    };

    const response = await handlers.GET(mockReq as any);
    console.error = originalError;

    results.handlerResult = {
      status: response.status,
      location: response.headers.get("location"),
    };
    results.capturedErrors = capturedErrors;
  } catch (e: any) {
    results.handlerException = {
      name: e.name,
      message: e.message,
      stack: e.stack?.split("\n").slice(0, 5),
    };
  }

  // Test 3: Try to manually test the OAuth authorization URL construction
  try {
    const { authConfig } = await import("@/lib/auth");
    const provider = authConfig.providers[0] as any;
    results.providerDetails = {
      id: provider.id,
      type: provider.type,
      hasAuthorization: !!provider.authorization,
      authorizationType: typeof provider.authorization,
      authorizationUrl: typeof provider.authorization === "string"
        ? provider.authorization
        : provider.authorization?.url,
      hasToken: !!provider.token,
      tokenType: typeof provider.token,
      tokenUrl: typeof provider.token === "string"
        ? provider.token
        : provider.token?.url,
      hasUserinfo: !!provider.userinfo,
      hasClient: !!provider.client,
      clientMethod: provider.client?.token_endpoint_auth_method,
      hasOptions: !!provider.options,
      optionsKeys: provider.options ? Object.keys(provider.options) : [],
      checks: provider.checks,
    };
  } catch (e: any) {
    results.providerInspectError = e.message;
  }

  return NextResponse.json(results);
}
