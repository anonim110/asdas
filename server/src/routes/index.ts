import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import postRoutes from './post.routes';
import feedRoutes from './feed.routes';
import notificationRoutes from './notification.routes';
import messageRoutes from './message.routes';
import discoverRoutes from './discover.routes';

const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'ok' }));

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/posts', postRoutes);
router.use('/feed', feedRoutes);
router.use('/notifications', notificationRoutes);
router.use('/conversations', messageRoutes);
router.use('/', discoverRoutes);

export default router;
