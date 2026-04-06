import { signIn, auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Image from "next/image";

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
              className="w-full flex items-center justify-center gap-3 bg-cyan-500 hover:bg-cyan-600 text-white py-3 px-6 rounded-lg font-medium transition-colors"
            >
              <svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
              </svg>
              Sign In with Strava
            </button>
          </form>

          <p className="text-xs text-zinc-500 dark:text-zinc-500 text-center mt-6">
            We only access your public profile and activity data. Your privacy
            settings control what others can see.
          </p>
        </div>
      </div>
    </div>
  );
}
