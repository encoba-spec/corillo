import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Strava from "next-auth/providers/strava";
import { prisma } from "./prisma";
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  providers: [
    Strava({
      clientId: process.env.STRAVA_CLIENT_ID,
      clientSecret: process.env.STRAVA_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "read,activity:read,profile:read_all",
          approval_prompt: "auto",
        },
      },
    }),
  ],
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
