import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { customFetch } from "@auth/core";
import { prisma } from "./prisma";
import type { NextAuthConfig } from "next-auth";

/**
 * Custom fetch for Strava OAuth provider.
 * Strava's token endpoint returns non-standard fields (athlete object)
 * that cause oauth4webapi strict validation to fail.
 * We intercept the token response and return only standard OAuth2 fields.
 */
async function stravaFetchHandler(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input instanceof Request
          ? input.url
          : "";

  // Intercept the token endpoint request
  if (url.includes("strava.com/oauth/token")) {
    // Auth.js sends client credentials as Basic Auth header, but Strava
    // requires them in the POST body. Extract the authorization code from
    // Auth.js's request body and make our own request with proper format.
    let code = "";
    let grantType = "authorization_code";

    // Parse the body Auth.js is sending (URL-encoded form data)
    if (init?.body) {
      let bodyStr = "";
      if (typeof init.body === "string") {
        bodyStr = init.body;
      } else if (init.body instanceof URLSearchParams) {
        bodyStr = init.body.toString();
      } else if (init.body instanceof ArrayBuffer || ArrayBuffer.isView(init.body)) {
        bodyStr = new TextDecoder().decode(init.body as ArrayBuffer);
      } else if (init.body instanceof ReadableStream) {
        const reader = init.body.getReader();
        const chunks: Uint8Array[] = [];
        let done = false;
        while (!done) {
          const result = await reader.read();
          done = result.done;
          if (result.value) chunks.push(result.value);
        }
        bodyStr = new TextDecoder().decode(
          chunks.length === 1
            ? chunks[0]
            : new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0))
        );
      } else {
        bodyStr = String(init.body);
      }
      const params = new URLSearchParams(bodyStr);
      code = params.get("code") || "";
      grantType = params.get("grant_type") || "authorization_code";
      console.log("[strava] Parsed code from body:", code ? "yes" : "no", "grant_type:", grantType);
    }

    console.log("[strava] Making token request with client_id in body, grant_type:", grantType);

    // Make our own request with credentials in the body (Strava's requirement)
    const response = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.STRAVA_CLIENT_ID || "",
        client_secret: process.env.STRAVA_CLIENT_SECRET || "",
        code,
        grant_type: grantType,
      }).toString(),
    });

    const body = await response.json();

    console.log("[strava] token response status:", response.status);
    console.log("[strava] has access_token:", !!body.access_token);

    if (!body.access_token) {
      console.error("[strava] token error:", JSON.stringify(body));
      return new Response(JSON.stringify(body), {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Return only standard OAuth2 fields (strip athlete object, etc.)
    const conformed = {
      access_token: body.access_token,
      refresh_token: body.refresh_token,
      expires_at: body.expires_at,
      token_type: body.token_type || "Bearer",
    };

    console.log("[strava] Token exchange successful!");

    return new Response(JSON.stringify(conformed), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Pass through all other requests (userinfo, etc.)
  return fetch(input, init);
}

/**
 * Strava OAuth provider config.
 * [customFetch] must be in `options` because Auth.js destructures
 * { options: userOptions, ...defaults } and assigns customFetch from userOptions.
 */
const stravaProvider = {
  id: "strava",
  name: "Strava",
  type: "oauth" as const,
  authorization: {
    url: "https://www.strava.com/oauth/authorize",
    params: {
      scope: "read,activity:read,profile:read_all",
      approval_prompt: "auto",
      response_type: "code",
    },
  },
  token: "https://www.strava.com/oauth/token",
  // Strava requires client_id/secret in the POST body, not Basic Auth header
  clientAuthMethod: "client_secret_post",
  userinfo: "https://www.strava.com/api/v3/athlete",
  profile(profile: any) {
    return {
      id: String(profile.id),
      name: `${profile.firstname} ${profile.lastname}`,
      email: null,
      image: profile.profile,
    };
  },
  options: {
    clientId: process.env.STRAVA_CLIENT_ID,
    clientSecret: process.env.STRAVA_CLIENT_SECRET,
    [customFetch]: stravaFetchHandler,
  },
};

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  providers: [stravaProvider as any],
  callbacks: {
    async jwt({ token, account, profile }) {
      // On initial sign-in, store Strava tokens and athlete ID
      if (account && profile) {
        token.stravaAthleteId = Number(profile.id);
        token.stravaAccessToken = account.access_token;
        token.stravaRefreshToken = account.refresh_token;
        token.stravaTokenExpires = account.expires_at
          ? account.expires_at * 1000
          : 0;
      }

      // Refresh expired Strava token
      if (
        token.stravaTokenExpires &&
        Date.now() > (token.stravaTokenExpires as number)
      ) {
        try {
          const response = await fetch(
            "https://www.strava.com/oauth/token",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                client_id: process.env.STRAVA_CLIENT_ID,
                client_secret: process.env.STRAVA_CLIENT_SECRET,
                grant_type: "refresh_token",
                refresh_token: token.stravaRefreshToken,
              }),
            }
          );

          const refreshed = await response.json();

          if (!response.ok) throw refreshed;

          token.stravaAccessToken = refreshed.access_token;
          token.stravaRefreshToken =
            refreshed.refresh_token ?? token.stravaRefreshToken;
          token.stravaTokenExpires = refreshed.expires_at * 1000;

          // Update tokens in DB
          await prisma.user.update({
            where: {
              stravaAthleteId: token.stravaAthleteId as number,
            },
            data: {
              stravaAccessToken: refreshed.access_token,
              stravaRefreshToken:
                refreshed.refresh_token ?? (token.stravaRefreshToken as string),
              stravaTokenExpires: new Date(refreshed.expires_at * 1000),
            },
          });
        } catch (error) {
          console.error("Error refreshing Strava token:", error);
          token.error = "RefreshTokenError";
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        (session as any).stravaAccessToken = token.stravaAccessToken;
        (session as any).error = token.error;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === "strava" && profile) {
        const stravaProfile = profile as any;
        // Update user with Strava data on every sign-in.
        // Use try/catch because on first sign-in the PrismaAdapter
        // may not have created the user record yet.
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              stravaAthleteId: stravaProfile.id,
              stravaAccessToken: account.access_token,
              stravaRefreshToken: account.refresh_token,
              stravaTokenExpires: account.expires_at
                ? new Date(account.expires_at * 1000)
                : null,
              city: stravaProfile.city,
              state: stravaProfile.state,
              country: stravaProfile.country,
            },
          });
        } catch (err) {
          console.warn("[auth] User update in signIn failed (likely first sign-in, user not yet created):", (err as Error).message);
        }

        // Trigger async data sync on sign-in (don't await — runs in background)
        if (account.access_token) {
          import("@/lib/strava/sync")
            .then(({ syncUserData }) =>
              syncUserData(user.id!, account.access_token!)
            )
            .catch((err) =>
              console.error("[auth] Background sync failed:", err)
            );
        }
      }
      return true;
    },
  },
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
