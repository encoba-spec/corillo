import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Terms of Service · corillo",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image src="/logo.svg" alt="corillo" width={100} height={33} className="h-7 w-auto" />
          </Link>
          <Link href="/privacy" className="text-sm text-zinc-500 hover:text-cyan-500">privacy</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 prose prose-zinc dark:prose-invert">
        <h1>Terms of Service</h1>
        <p className="text-sm text-zinc-500">Last updated: April 8, 2026</p>

        <h2>1. Acceptance</h2>
        <p>
          By connecting your Strava account and using corillo, you agree to
          these terms and our <Link href="/privacy">Privacy Policy</Link>.
        </p>

        <h2>2. Account &amp; Eligibility</h2>
        <p>
          You must be at least 16 years old and have a valid Strava account.
          You are responsible for the activity your account performs on the
          service.
        </p>

        <h2>3. Acceptable Use</h2>
        <ul>
          <li>Do not impersonate others or misrepresent your identity.</li>
          <li>Do not harass, stalk, or contact other users for unsolicited commercial purposes.</li>
          <li>Do not scrape, resell, or redistribute other users&apos; Strava-derived data.</li>
          <li>Meet in-person at your own risk; exercise common-sense safety when running or cycling with strangers.</li>
        </ul>

        <h2>4. Strava Relationship</h2>
        <p>
          corillo uses the Strava API under Strava&apos;s API Agreement and
          Brand Guidelines. corillo is not affiliated with, endorsed by, or
          sponsored by Strava, Inc. Strava data displayed on corillo belongs
          to Strava and its athletes, and is governed additionally by
          Strava&apos;s own terms and privacy policy.
        </p>
        <p>
          You can revoke corillo&apos;s access to your Strava data at any time
          from your <Link href="/profile">profile</Link> or from
          <a href="https://www.strava.com/settings/apps" target="_blank" rel="noopener noreferrer"> Strava&apos;s connected apps page</a>.
        </p>

        <h2>5. No Warranty</h2>
        <p>
          The service is provided &quot;as is&quot; without warranty. We do
          not guarantee the accuracy of matching, availability of the service,
          or the suitability of any partner you meet via corillo.
        </p>

        <h2>6. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, corillo is not liable for
          any indirect, incidental, or consequential damages arising from use
          of the service, including injury or loss arising from meeting other
          users.
        </p>

        <h2>7. Changes</h2>
        <p>
          We may update these terms; we will update the &quot;Last updated&quot; date above.
          Continued use after changes constitutes acceptance.
        </p>

        <h2>8. Contact</h2>
        <p>
          Questions: <a href="mailto:hello@corillo.app">hello@corillo.app</a>
        </p>
      </main>
    </div>
  );
}
