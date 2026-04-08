import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PoweredByStrava } from "@/components/strava/PoweredByStrava";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // Onboarding gate: send first-time users through the wizard.
  const flags = await prisma.user.findUnique({
    where: { id: session.user.id! },
    select: { onboardedAt: true },
  });
  if (flags && flags.onboardedAt == null) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top nav */}
      <header className="sticky top-0 z-50 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/discover" className="flex items-center">
              <Image
                src="/logo.svg"
                alt="corillo"
                width={100}
                height={33}
                className="h-7 w-auto"
              />
            </Link>
            <nav className="flex items-center gap-1">
              <NavLink href="/discover">discover</NavLink>
              <NavLink href="/matches">
                your <span className="text-cyan-500">corillo</span>
              </NavLink>
              <NavLink href="/messages">messages</NavLink>
              <NavLink href="/planned-runs">activities</NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="flex items-center gap-2 text-sm hover:text-cyan-500 transition-colors"
            >
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt=""
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 bg-zinc-200 dark:bg-zinc-700 rounded-full flex items-center justify-center text-xs font-medium">
                  {session.user.name?.[0] ?? "?"}
                </div>
              )}
              <span className="hidden sm:inline">{session.user.name}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 mt-8">
        <div className="max-w-7xl mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
          <PoweredByStrava width={110} />
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-cyan-500">privacy</Link>
            <Link href="/terms" className="hover:text-cyan-500">terms</Link>
            <Link href="/support" className="hover:text-cyan-500">support</Link>
            <span>not affiliated with Strava, Inc.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
    >
      {children}
    </Link>
  );
}
