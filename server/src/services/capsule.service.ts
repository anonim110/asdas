import { prisma } from '../config/prisma';
import { createNotification } from './notification.service';
import { syncHashtagsAndMentions } from './post.service';
import { postInclude, serializePosts } from './serializers';
import { emitToPost } from '../sockets/io';

// ──────────────────── Time-capsule opening worker ────────────────────
// Capsule content is hidden at serialization time, so posts "open" with no
// help. This worker handles the side-effects of opening: it notifies the
// author (and everyone who bookmarked the capsule), runs the hashtag /
// mention indexing that was deferred while the text was secret, and pokes
// post subscribers over the socket so open feeds refresh live.

const POLL_INTERVAL_MS = 30_000;

export async function processDueCapsules() {
  const due = await prisma.post.findMany({
    where: { unlockAt: { lte: new Date() }, unlockNotified: false },
    select: {
      id: true,
      authorId: true,
      content: true,
      bookmarks: { select: { userId: true } },
    },
    take: 100,
  });

  for (const capsule of due) {
    // Claim the capsule first so a concurrent worker never double-notifies.
    const claimed = await prisma.post.updateMany({
      where: { id: capsule.id, unlockNotified: false },
      data: { unlockNotified: true },
    });
    if (claimed.count === 0) continue;

    // Deferred indexing: hashtags/mentions were skipped while sealed so the
    // text couldn't leak; index (and notify mentions) now that it's public.
    if (capsule.content) {
      await syncHashtagsAndMentions(capsule.id, capsule.content, capsule.authorId);
    }

    await createNotification({
      type: 'CAPSULE_OPENED',
      recipientId: capsule.authorId,
      actorId: capsule.authorId,
      postId: capsule.id,
      allowSelf: true,
    });
    for (const { userId } of capsule.bookmarks) {
      if (userId === capsule.authorId) continue;
      await createNotification({
        type: 'CAPSULE_OPENED',
        recipientId: userId,
        actorId: capsule.authorId,
        postId: capsule.id,
      });
    }

    emitToPost(capsule.id, 'capsule:opened', { postId: capsule.id });
  }
}

export function startCapsuleWorker() {
  const tick = () =>
    processDueCapsules().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Capsule worker error:', err);
    });
  tick(); // catch up on anything that opened while the server was down
  const timer = setInterval(tick, POLL_INTERVAL_MS);
  timer.unref?.();
  return timer;
}

// ──────────────────── Capsule listings ────────────────────

// The viewer's own capsules (sealed and already opened), soonest-opening
// first, plus sealed capsules by others that the viewer bookmarked ("watching").
export async function listCapsules(userId: string) {
  const [mine, watching] = await Promise.all([
    prisma.post.findMany({
      where: { authorId: userId, unlockAt: { not: null } },
      include: postInclude(userId),
      orderBy: { unlockAt: 'desc' },
      take: 100,
    }),
    prisma.post.findMany({
      where: {
        unlockAt: { gt: new Date() },
        authorId: { not: userId },
        bookmarks: { some: { userId } },
      },
      include: postInclude(userId),
      orderBy: { unlockAt: 'asc' },
      take: 100,
    }),
  ]);
  return { mine: serializePosts(mine), watching: serializePosts(watching) };
}
