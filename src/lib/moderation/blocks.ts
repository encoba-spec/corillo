import { prisma } from "@/lib/prisma";

/**
 * Returns true if there is a block in either direction between `a` and `b`.
 * Used to hide users from each other in discovery and reject messaging.
 */
export async function isBlockedBetween(
  a: string,
  b: string
): Promise<boolean> {
  if (a === b) return false;
  const existing = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
    select: { id: true },
  });
  return existing != null;
}

/**
 * Returns the set of user ids that `userId` should not see, and that should
 * not see `userId` — i.e. anyone in a bidirectional block relationship.
 */
export async function getBlockedUserIds(userId: string): Promise<string[]> {
  const rows = await prisma.block.findMany({
    where: {
      OR: [{ blockerId: userId }, { blockedId: userId }],
    },
    select: { blockerId: true, blockedId: true },
  });
  const out = new Set<string>();
  for (const r of rows) {
    if (r.blockerId !== userId) out.add(r.blockerId);
    if (r.blockedId !== userId) out.add(r.blockedId);
  }
  return [...out];
}
