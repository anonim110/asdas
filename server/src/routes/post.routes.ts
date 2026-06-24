import { Router } from 'express';
import * as post from '../controllers/post.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { upload } from '../middleware/upload';
import { writeLimiter } from '../middleware/rateLimit';
import { createPostSchema, updatePostSchema, cursorQuerySchema } from '../validators/schemas';

const router = Router();

// Create a post (optionally with up to 4 media attachments).
router.post(
  '/',
  requireAuth,
  writeLimiter,
  upload.array('media', 4),
  validate({ body: createPostSchema }),
  asyncHandler(post.create),
);

// Static paths must precede the `/:id` matcher.
router.get('/bookmarks', requireAuth, validate({ query: cursorQuerySchema }), asyncHandler(post.listBookmarks));

router.get('/:id', optionalAuth, asyncHandler(post.getOne));
router.get('/:id/thread', optionalAuth, asyncHandler(post.getThread));
router.get('/:id/analytics', requireAuth, asyncHandler(post.analytics));
router.get('/:id/replies', optionalAuth, validate({ query: cursorQuerySchema }), asyncHandler(post.getReplies));
router.delete('/:id', requireAuth, asyncHandler(post.remove));
router.patch('/:id', requireAuth, validate({ body: updatePostSchema }), asyncHandler(post.update));

router.post('/:id/like', requireAuth, asyncHandler(post.like));
router.delete('/:id/like', requireAuth, asyncHandler(post.unlike));

router.post('/:id/repost', requireAuth, writeLimiter, asyncHandler(post.repost));
router.delete('/:id/repost', requireAuth, asyncHandler(post.unrepost));

router.post('/:id/bookmark', requireAuth, asyncHandler(post.bookmark));
router.delete('/:id/bookmark', requireAuth, asyncHandler(post.unbookmark));

router.post('/:id/pin', requireAuth, asyncHandler(post.pin));
router.delete('/:id/pin', requireAuth, asyncHandler(post.unpin));

export default router;
