import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Support · corillo",
};

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image
              src="/logo.svg"
              alt="corillo"
              width={100}
              height={33}
              className="h-7 w-auto"
            />
          </Link>
          <div className="flex items-center gap-4 text-sm text-zinc-500">
            <Link href="/privacy" className="hover:text-cyan-500">privacy</Link>
            <Link href="/terms" className="hover:text-cyan-500">terms</Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">support</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-10">
          Need help with corillo? We&apos;re a small team and we read every
          message.
        </p>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">contact</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <span className="text-zinc-500">General questions &amp; bugs:</span>{" "}
              <a href="mailto:hello@corillo.app" className="text-cyan-500 underline">
                hello@corillo.app
              </a>
            </li>
            <li>
              <span className="text-zinc-500">Privacy &amp; data requests:</span>{" "}
              <a href="mailto:privacy@corillo.app" className="text-cyan-500 underline">
                privacy@corillo.app
              </a>
            </li>
            <li>
              <span className="text-zinc-500">Abuse &amp; safety reports:</span>{" "}
              <a href="mailto:safety@corillo.app" className="text-cyan-500 underline">
                safety@corillo.app
              </a>
            </li>
          </ul>
          <p className="text-xs text-zinc-500 mt-4">
            We respond to abuse and safety reports within 24 hours, and to
            general support within 3 business days.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">common questions</h2>

          <Faq q="How do I find training partners?">
            <p>
              Head to <Link href="/discover" className="text-cyan-500 underline">Discover</Link>.
              corillo matches you against nearby athletes based on location,
              training schedule, pace, and distance. Tap any card to see their
              profile and send a connection request.
            </p>
          </Faq>

          <Faq q="Do I need a Strava account?">
            <p>
              No. You can sign in with Apple and create a basic profile with
              self-reported pace and distance. Connecting Strava later enables
              activity-based matching using your real running zones, pace, and
              schedule, which produces more accurate suggestions.
            </p>
          </Faq>

          <Faq q="How do I block or report another user?">
            <p>
              Open their profile, tap the three-dot menu, and choose{" "}
              <strong>block</strong> or <strong>report</strong>. Blocks hide
              you from each other immediately. Reports are reviewed within 24
              hours.
            </p>
          </Faq>

          <Faq q="How do I disconnect Strava?">
            <p>
              Go to <Link href="/profile" className="text-cyan-500 underline">Profile</Link>,
              scroll to &quot;Strava connection&quot;, and click{" "}
              <strong>disconnect strava</strong>. This revokes corillo&apos;s
              access and deletes all imported activities.
            </p>
          </Faq>

          <Faq q="How do I delete my account?">
            <p>
              Go to <Link href="/profile" className="text-cyan-500 underline">Profile</Link>,
              scroll to &quot;Delete account&quot;, and follow the confirmation
              steps. This permanently removes your profile, activities,
              messages, and planned activities. It cannot be undone.
            </p>
          </Faq>

          <Faq q="Is corillo affiliated with Strava?">
            <p>
              No. corillo is an independent product. We use the Strava API
              under Strava&apos;s API Agreement and Brand Guidelines to display
              your own activity data back to you and to power partner matching.
            </p>
          </Faq>

          <Faq q="Is corillo safe for meeting strangers?">
            <p>
              Always follow our{" "}
              <Link href="/profile" className="text-cyan-500 underline">
                safety tips
              </Link>
              : meet in public, tell a friend, share live location, don&apos;t
              share sensitive info, and trust your instincts. corillo is not a
              safety service and cannot intervene in real-time.
            </p>
          </Faq>
        </section>
      </main>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="group border-b border-zinc-200 dark:border-zinc-800 py-4">
      <summary className="flex items-center justify-between cursor-pointer list-none">
        <span className="font-medium">{q}</span>
        <span className="text-zinc-400 group-open:rotate-180 transition-transform">
          ▾
        </span>
      </summary>
      <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-400 prose prose-sm prose-zinc dark:prose-invert max-w-none">
        {children}
      </div>
    </details>
  );
}
