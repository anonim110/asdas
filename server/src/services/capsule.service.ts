import { prisma } from '../config/prisma';
import { createNotification } from './notification.service';
import { syncHashtagsAndMentions } from './post.service';
import { emitToPost } from '../sockets/io';

// Time-capsule opening worker: capsule content is hidden at serialization
// time, so posts "open" with no help. This handles the side-effects —
// notifying the author, running the hashtag/mention indexing that was
// deferred while the text was secret, and poking post subscribers.

const POLL_INTERVAL_MS = 30_000;

export async function processDueCapsules() {
  const due = await prisma.post.findMany({
    where: { unlockAt: { lte: new Date() }, unlockNotified: false },
    select: { id: true, authorId: true, content: true },
    take: 100,
  });

  for (const capsule of due) {
    // Claim the capsule first so a concurrent worker never double-notifies.
    const claimed = await prisma.post.updateMany({
      where: { id: capsule.id, unlockNotified: false },
      data: { unlockNotified: true },
    });
    if (claimed.count === 0) continue;

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
