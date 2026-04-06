import { prisma } from "@/lib/prisma";

export type ConnectionStatus =
  | "none"
  | "pending_outgoing"
  | "pending_incoming"
  | "accepted"
  | "declined";

/**
 * Return the current connection status between two users from the perspective
 * of `viewerId` looking at `otherId`.
 */
export async function getConnectionStatus(
  viewerId: string,
  otherId: string
): Promise<{ status: ConnectionStatus; connectionId: string | null }> {
  if (viewerId === otherId) return { status: "none", connectionId: null };

  const conn = await prisma.connection.findFirst({
    where: {
      OR: [
        { requesterId: viewerId, addresseeId: otherId },
        { requesterId: otherId, addresseeId: viewerId },
      ],
    },
  });

  if (!conn) return { status: "none", connectionId: null };
  if (conn.status === "accepted")
    return { status: "accepted", connectionId: conn.id };
  if (conn.status === "declined")
    return { status: "declined", connectionId: conn.id };

  // pending
  if (conn.requesterId === viewerId)
    return { status: "pending_outgoing", connectionId: conn.id };
  return { status: "pending_incoming", connectionId: conn.id };
}

/**
 * Returns the set of user IDs that are mutually connected (accepted) with `userId`.
 */
export async function getAcceptedConnectionIds(
  userId: string
): Promise<Set<string>> {
  const connections = await prisma.connection.findMany({
    where: {
      status: "accepted",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    select: { requesterId: true, addresseeId: true },
  });
  const ids = new Set<string>();
  for (const c of connections) {
    ids.add(c.requesterId === userId ? c.addresseeId : c.requesterId);
  }
  return ids;
}

/**
 * Quick check whether two users are accepted connections (in each other's corillo).
 */
export async function areConnected(
  userIdA: string,
  userIdB: string
): Promise<boolean> {
  if (userIdA === userIdB) return false;
  const conn = await prisma.connection.findFirst({
    where: {
      status: "accepted",
      OR: [
        { requesterId: userIdA, addresseeId: userIdB },
        { requesterId: userIdB, addresseeId: userIdA },
      ],
    },
    select: { id: true },
  });
  return conn != null;
}
