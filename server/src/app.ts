import path from 'path';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import routes from './routes';
import { globalLimiter } from './middleware/rateLimit';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

export function createApp() {
  const app = express();

  // Behind a hosting proxy (e.g. Render) so secure cookies and protocol
  // detection work correctly.
  if (env.isProd) app.set('trust proxy', 1);

  // Security headers. Allow media served from this origin to be embedded
  // cross-origin by the frontend dev server.
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(
    cors({
      origin: env.clientUrls,
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Serve uploaded media as static files.
  app.use(`/${env.upload.dir}`, express.static(path.resolve(process.cwd(), env.upload.dir)));

  // Apply the global rate limiter to the API surface.
  app.use('/api', globalLimiter, routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
