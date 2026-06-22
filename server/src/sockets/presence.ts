// In-memory presence tracking. Each user may have multiple open tabs/sockets,
// so we ref-count connections and only flip online/offline on the edges.
const counts = new Map<string, number>();

export function isOnline(userId: string): boolean {
  return (counts.get(userId) ?? 0) > 0;
}

export function onlineUserIds(): string[] {
  return [...counts.entries()].filter(([, n]) => n > 0).map(([id]) => id);
}

// Returns true if the user just transitioned offline → online.
export function addConnection(userId: string): boolean {
  const n = (counts.get(userId) ?? 0) + 1;
  counts.set(userId, n);
  return n === 1;
}

// Returns true if the user just transitioned online → offline.
export function removeConnection(userId: string): boolean {
  const n = (counts.get(userId) ?? 1) - 1;
  if (n <= 0) {
    counts.delete(userId);
    return true;
  }
  counts.set(userId, n);
  return false;
}
