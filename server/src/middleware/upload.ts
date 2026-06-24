import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/apiError';

export const uploadRoot = path.resolve(process.cwd(), env.upload.dir);
export const uploadPublicPath = '/uploads';
fs.mkdirSync(uploadRoot, { recursive: true });

const ALLOWED = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  // Voice messages & round video notes recorded by the browser.
  'audio/webm',
  'audio/ogg',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/x-m4a',
]);

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 10);
    const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, name);
  },
});

if (env.cloudinary.enabled) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true,
  });
}

export const upload = multer({
  storage:
    env.cloudinary.enabled || env.isProd
      ? multer.memoryStorage()
      : diskStorage,
  limits: { fileSize: env.upload.maxBytes },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) cb(null, true);
    else cb(new ApiError(400, `Unsupported file type: ${file.mimetype}`));
  },
});

function uploadToCloudinary(file: Express.Multer.File): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: env.cloudinary.folder,
        resource_type: 'auto',
        use_filename: false,
        unique_filename: true,
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error('Cloudinary did not return an upload result'));
          return;
        }
        resolve(result);
      },
    );

    stream.end(file.buffer);
  });
}

// Stores an uploaded file permanently when Cloudinary is configured and
// otherwise returns the URL of the local disk copy created by Multer.
export async function storeUploadedFile(file: Express.Multer.File): Promise<string> {
  if (env.cloudinary.enabled) {
    const result = await uploadToCloudinary(file);
    return result.secure_url;
  }

  if (env.isProd) {
    if (!file.buffer) throw new Error('Uploaded file is missing its memory buffer');
    const stored = await prisma.storedUpload.create({
      data: {
        data: file.buffer,
        mimeType: file.mimetype,
        originalName: file.originalname.slice(0, 255),
        size: file.size,
      },
      select: { id: true },
    });
    return `${env.apiUrl}${uploadPublicPath}/${stored.id}`;
  }

  if (!file.filename) throw new Error('Uploaded file is missing its local filename');
  return `${env.apiUrl}${uploadPublicPath}/${file.filename}`;
}

export async function serveStoredUpload(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const stored = await prisma.storedUpload.findUnique({
    where: { id: req.params.id },
    select: { data: true, mimeType: true, size: true },
  });
  if (!stored) {
    next();
    return;
  }

  res.set({
    'Content-Type': stored.mimeType,
    'Content-Length': String(stored.size),
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
  });
  res.send(Buffer.from(stored.data));
}
