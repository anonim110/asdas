import { Router } from 'express';
import * as feedback from '../controllers/feedback.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { writeLimiter } from '../middleware/rateLimit';
import { siteRatingSchema } from '../validators/schemas';

const router = Router();

router.use(requireAuth);
router.get('/site-rating', asyncHandler(feedback.siteRatingSummary));
router.post(
  '/site-rating',
  writeLimiter,
  validate({ body: siteRatingSchema }),
  asyncHandler(feedback.rateSite),
);

export default router;
