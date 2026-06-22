import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { env } from '../config/env';
import { ApiError } from '../utils/apiError';

const uploadRoot = path.resolve(process.cwd(), env.upload.dir);
fs.mkdirSync(uploadRoot, { recursive: true });

const ALLOWED = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 10);
    const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, name);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: env.upload.maxBytes },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) cb(null, true);
    else cb(new ApiError(400, `Unsupported file type: ${file.mimetype}`));
  },
});

// Maps a stored filename to a public, absolute URL.
export function publicUrl(filename: string): string {
  return `${env.apiUrl}/${env.upload.dir}/${filename}`;
}
