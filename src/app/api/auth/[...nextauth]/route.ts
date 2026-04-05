import { handlers } from "@/lib/auth";
import { NextRequest } from "next/server";

/**
 * Next.js 16 changed how requests are passed to route handlers.
 * next-auth@5.0.0-beta.30 expects req.nextUrl to exist (via NextRequest),
 * but Next.js 16 may pass a plain Request. We wrap it to ensure compatibility.
 */
function ensureNextRequest(req: Request): NextRequest {
  if (req instanceof NextRequest) return req;
  return new NextRequest(req.url, req);
}

export async function GET(req: Request) {
  return handlers.GET(ensureNextRequest(req) as any);
}

export async function POST(req: Request) {
  return handlers.POST(ensureNextRequest(req) as any);
}
