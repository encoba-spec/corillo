import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Privacy Policy · corillo",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image src="/logo.svg" alt="corillo" width={100} height={33} className="h-7 w-auto" />
          </Link>
          <Link href="/terms" className="text-sm text-zinc-500 hover:text-cyan-500">terms</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 prose prose-zinc dark:prose-invert">
        <h1>Privacy Policy</h1>
        <p className="text-sm text-zinc-500">Last updated: April 8, 2026</p>

        <p>
          corillo (&quot;we&quot;, &quot;us&quot;) helps runners and cyclists
          find compatible training partners. This policy explains what data we
          collect, how we use it, and your rights.
        </p>

        <h2>1. Data We Collect from Strava</h2>
        <p>
          When you connect your Strava account, we request the{" "}
          <code>read</code> and <code>activity:read</code> scopes and store the
          following from Strava&apos;s API:
        </p>
        <ul>
          <li>Athlete profile: name, profile photo, city, state, country, sex, Strava athlete ID.</li>
          <li>Activity metadata for the last ~200 activities: sport type, distance, moving time, start date, summary polyline, start/end coordinates.</li>
          <li>Club memberships (name, id, profile image).</li>
        </ul>
        <p>
          We do <strong>not</strong> upload, modify, or delete anything in your
          Strava account. We do not request write scopes.
        </p>

        <h2>2. How We Use It</h2>
        <ul>
          <li>Compute pace, distance, weekly frequency, and typical training zones to match you with compatible nearby athletes.</li>
          <li>Display your profile to other corillo users who are potential matches, subject to your privacy settings.</li>
          <li>Power planned-activity discovery and chat with athletes who join your planned activities.</li>
        </ul>
        <p>
          We do not sell your data, show third-party advertising, or share
          Strava-derived data with anyone outside of the corillo product.
        </p>

        <h2>3. Privacy Controls</h2>
        <p>From your <Link href="/profile">profile</Link> you can:</p>
        <ul>
          <li>Toggle discoverability on/off.</li>
          <li>Set location precision (fuzzed radius).</li>
          <li>Choose whether your schedule and pace are visible to others.</li>
          <li>Control notifications.</li>
          <li>Disconnect Strava and delete all imported activities at any time.</li>
        </ul>

        <h2>4. Data Retention &amp; Deletion</h2>
        <p>
          Strava-derived data is retained only while your account is active. If
          you click <strong>Disconnect Strava</strong> on your profile, we:
        </p>
        <ol>
          <li>Call Strava&apos;s <code>/oauth/deauthorize</code> endpoint to revoke our access.</li>
          <li>Delete all imported activity rows tied to your account.</li>
          <li>Clear tokens and Strava identifiers from your corillo record.</li>
        </ol>
        <p>
          To delete your entire corillo account, disconnect Strava and email
          us at the address below; we will remove your profile within 30 days.
        </p>

        <h2>5. Third-Party Processors</h2>
        <ul>
          <li><strong>Neon</strong> — PostgreSQL database hosting (data stored in the EU/US).</li>
          <li><strong>Vercel</strong> — application hosting and edge delivery.</li>
          <li><strong>Strava</strong> — OAuth provider and source of activity data.</li>
        </ul>

        <h2>6. Cookies</h2>
        <p>
          We use a single session cookie to keep you logged in. No analytics or
          advertising cookies.
        </p>

        <h2>7. Your Rights</h2>
        <p>
          You can request access to, correction of, or deletion of your
          personal data at any time. For EU/UK users, we process data under
          legitimate interest and consent (Strava connection) bases per GDPR.
        </p>

        <h2>8. Contact</h2>
        <p>
          Questions or requests: <a href="mailto:privacy@corillo.app">privacy@corillo.app</a>
        </p>

        <hr />
        <p className="text-xs text-zinc-500">
          corillo is an independent product and is not affiliated with,
          endorsed by, or sponsored by Strava, Inc. Strava-derived data is
          displayed under Strava&apos;s API Agreement and Brand Guidelines.
        </p>
      </main>
    </div>
  );
}
