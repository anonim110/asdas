import crypto from 'crypto';
import { Router } from 'express';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

function tokenMatches(value: string | undefined) {
  const expected = process.env.ADMIN_RESET_TOKEN;
  if (!expected || !value) return false;

  const actualBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

router.post(
  '/reset-all-data',
  asyncHandler(async (req, res) => {
    const token = req.header('x-admin-reset-token');
    if (!tokenMatches(token)) {
      res.status(404).json({ error: { message: 'Route not found' } });
      return;
    }

    const before = {
      users: await prisma.user.count(),
      posts: await prisma.post.count(),
      conversations: await prisma.conversation.count(),
      communities: await prisma.community.count(),
      uploads: await prisma.storedUpload.count(),
    };

    await prisma.$transaction(
      async (tx) => {
        await tx.storedUpload.deleteMany();
        await tx.user.deleteMany();
        await tx.hashtag.deleteMany();
      },
      { timeout: 60_000 },
    );

    res.json({ deleted: before });
  }),
);

export default router;
