import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/discover");
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Image
            src="/logo.svg"
            alt="corillo"
            width={120}
            height={40}
            className="h-8 w-auto"
            priority
          />
          <Link
            href="/login"
            className="bg-cyan-500 hover:bg-cyan-600 text-white px-5 py-2 rounded-lg font-medium transition-colors"
          >
            Sign In with Strava
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-4 py-24 text-center">
          <Image
            src="/logo.svg"
            alt="corillo"
            width={400}
            height={130}
            className="h-24 w-auto mx-auto mb-4"
            priority
          />
          <h1 className="text-5xl font-bold tracking-tight mb-6">
            Find Your Running Crew
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto mb-10">
            Connect with runners near you who share your pace, schedule, and
            favorite routes. Plan group runs and never train alone again.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white px-8 py-3 rounded-lg text-lg font-medium transition-colors"
          >
            <svg
              className="w-6 h-6"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
            </svg>
            Connect with Strava
          </Link>
        </section>

        {/* Features */}
        <section className="bg-white dark:bg-zinc-900 border-y border-zinc-200 dark:border-zinc-800">
          <div className="max-w-6xl mx-auto px-4 py-20 grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-14 h-14 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-7 h-7 text-cyan-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Discover Nearby Runners
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Find runners who train in your area. Set your preferred distance
                range to discover the perfect training partners.
              </p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-7 h-7 text-cyan-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Match by Schedule
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Filter by days and time slots that work for you. Find runners
                whose schedules align with yours.
              </p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-7 h-7 text-cyan-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Plan Group Runs</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Create or join planned runs. Set the pace, distance, and meeting
                point so everyone is on the same page.
              </p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="max-w-6xl mx-auto px-4 py-20">
          <h2 className="text-3xl font-bold text-center mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                step: "1",
                title: "Connect Strava",
                desc: "Sign in with your Strava account to import your running data.",
              },
              {
                step: "2",
                title: "Set Preferences",
                desc: "Choose your preferred distance range, pace, schedule, and privacy settings.",
              },
              {
                step: "3",
                title: "Discover Runners",
                desc: "Browse compatible runners on the map or as a ranked list.",
              },
              {
                step: "4",
                title: "Run Together",
                desc: "Message matches and join planned group runs in your area.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-10 h-10 bg-cyan-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold">
                  {item.step}
                </div>
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-sm text-zinc-500">
          corillo is not affiliated with Strava, Inc.
        </div>
      </footer>
    </div>
  );
}
