import Image from "next/image";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-gradient-to-br from-cyan-50 via-white to-zinc-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <div className="mb-8">
        <Image src="/logo.svg" alt="corillo" width={140} height={46} className="h-10 w-auto" />
      </div>
      <div className="w-full max-w-xl">{children}</div>
    </div>
  );
}
