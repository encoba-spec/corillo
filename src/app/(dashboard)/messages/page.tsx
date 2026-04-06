import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MessagesClient } from "./messages-client";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ thread?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;

  return (
    <MessagesClient
      userId={session.user.id!}
      initialThreadId={params.thread}
    />
  );
}
