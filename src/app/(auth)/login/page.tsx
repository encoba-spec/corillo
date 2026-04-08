import { signIn, auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ConnectWithStravaButton } from "@/components/strava/ConnectWithStravaButton";
import { SignInWithAppleButton } from "@/components/apple/SignInWithAppleButton";

const appleEnabled = Boolean(
  process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET
);

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/discover");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-zinc-200 dark:border-zinc-800 p-8">
          <div className="text-center mb-8">
            <Image
              src="/logo.svg"
              alt="corillo"
              width={200}
              height={65}
              className="h-14 w-auto mx-auto mb-2"
              priority
            />
            <h1 className="text-2xl font-bold">Welcome to <span className="text-cyan-500">corillo</span></h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-2">
              Connect your Strava account to find your running crew.
            </p>
          </div>

          <form
            action={async () => {
              "use server";
              await signIn("strava", { redirectTo: "/discover" });
            }}
          >
            <button
              type="submit"
              className="w-full flex items-center justify-center"
              aria-label="Connect with Strava"
            >
              <ConnectWithStravaButton />
            </button>
          </form>

          {appleEnabled && (
            <>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
                <span className="text-xs text-zinc-500">or</span>
                <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
              </div>
              <form
                action={async () => {
                  "use server";
                  await signIn("apple", { redirectTo: "/discover" });
                }}
              >
                <SignInWithAppleButton />
              </form>
              <p className="text-[11px] text-zinc-500 text-center mt-3">
                Sign in with Apple gives you a basic profile. Connect Strava
                later for activity-based matching.
              </p>
            </>
          )}

          <p className="text-xs text-zinc-500 dark:text-zinc-500 text-center mt-6">
            We only access your public profile and activity data. Your privacy
            settings control what others can see. By continuing you agree to
            our{" "}
            <Link href="/terms" className="underline hover:text-cyan-500">
              terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline hover:text-cyan-500">
              privacy policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
