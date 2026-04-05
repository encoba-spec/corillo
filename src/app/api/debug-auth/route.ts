import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Check env vars
    const envCheck = {
      hasAuthSecret: !!process.env.AUTH_SECRET,
      authSecretLength: process.env.AUTH_SECRET?.length || 0,
      hasStravaClientId: !!process.env.STRAVA_CLIENT_ID,
      stravaClientIdLength: process.env.STRAVA_CLIENT_ID?.length || 0,
      hasStravaClientSecret: !!process.env.STRAVA_CLIENT_SECRET,
      hasAuthTrustHost: !!process.env.AUTH_TRUST_HOST,
      authTrustHostValue: process.env.AUTH_TRUST_HOST,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      nodeEnv: process.env.NODE_ENV,
      authUrl: process.env.AUTH_URL || "not set",
      nextauthUrl: process.env.NEXTAUTH_URL || "not set",
    };

    // Try importing auth config
    let authImportError = null;
    let authConfigKeys = null;
    try {
      const { authConfig } = await import("@/lib/auth");
      authConfigKeys = {
        hasAdapter: !!authConfig.adapter,
        providerCount: authConfig.providers?.length || 0,
        sessionStrategy: authConfig.session?.strategy,
        hasCallbacks: !!authConfig.callbacks,
        providerIds: authConfig.providers?.map((p: any) => p.id || p.name || "unknown"),
      };
    } catch (e: any) {
      authImportError = { message: e.message, stack: e.stack?.split("\n").slice(0, 5) };
    }

    // Try importing Prisma
    let prismaError = null;
    try {
      const { prisma } = await import("@/lib/prisma");
      await prisma.$queryRaw`SELECT 1`;
    } catch (e: any) {
      prismaError = { message: e.message, stack: e.stack?.split("\n").slice(0, 5) };
    }

    return NextResponse.json({
      envCheck,
      authImportError,
      authConfigKeys,
      prismaError,
    });
  } catch (e: any) {
    return NextResponse.json({
      topLevelError: { message: e.message, stack: e.stack?.split("\n").slice(0, 5) },
    }, { status: 500 });
  }
}
