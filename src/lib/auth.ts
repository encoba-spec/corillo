import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { customFetch } from "@auth/core";
import Apple from "next-auth/providers/apple";
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
  if (url.includes("strava.com") && url.includes("oauth/token")) {
    const response = await fetch(input, init);
    const body = await response.json();

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

    return new Response(JSON.stringify(conformed), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Pass through all other requests (userinfo, etc.)
  return fetch(input, init);
}

/**
 * Strava OAuth provider config using the built-in provider shape
 * with customFetch for non-standard token response handling.
 *
 * Key configs:
 * - checks: ["state"] → Strava doesn't support PKCE
 * - client.token_endpoint_auth_method: "client_secret_post" → Strava requires creds in POST body
 * - [customFetch] → strips non-standard fields from token response
 */
function createStravaProvider() {
  const provider: any = {
    id: "strava",
    name: "Strava",
    type: "oauth",
    checks: ["state"],
    authorization: {
      url: "https://www.strava.com/api/v3/oauth/authorize",
      params: {
        scope: "read,activity:read,profile:read_all",
        approval_prompt: "auto",
        response_type: "code",
      },
    },
    token: {
      url: "https://www.strava.com/api/v3/oauth/token",
    },
    userinfo: "https://www.strava.com/api/v3/athlete",
    client: {
      token_endpoint_auth_method: "client_secret_post",
    },
    profile(profile: any) {
      return {
        id: String(profile.id),
        name: `${profile.firstname} ${profile.lastname}`,
        email: null,
        image: profile.profile,
      };
    },
    clientId: process.env.STRAVA_CLIENT_ID,
    clientSecret: process.env.STRAVA_CLIENT_SECRET,
  };
  // Assign customFetch using Symbol (computed property syntax not supported by Turbopack)
  provider[customFetch] = stravaFetchHandler;
  return provider;
}

/**
 * Apple provider — required by App Store Guideline 4.8 as an alternative
 * to third-party login (Strava). Users who sign in with Apple land on a
 * bare profile; they can optionally connect Strava later for matching
 * based on real activity data.
 *
 * Requires APPLE_CLIENT_ID (Services ID) and APPLE_CLIENT_SECRET (a JWT
 * generated from your Apple private key). See /README for setup.
 */
const appleProviders =
  process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET
    ? [
        Apple({
          clientId: process.env.APPLE_CLIENT_ID,
          clientSecret: process.env.APPLE_CLIENT_SECRET,
        }),
      ]
    : [];

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  providers: [createStravaProvider(), ...appleProviders],
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
              gender: stravaProfile.sex === "M" ? "man" : stravaProfile.sex === "F" ? "woman" : null,
              hasStrava: true,
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

      // Apple sign-in: nothing special to record — name/email are handled
      // by the adapter. hasStrava defaults to false and the user goes
      // through the onboarding wizard to set up their profile manually.

      return true;
    },
  },
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
