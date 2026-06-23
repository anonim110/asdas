import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { env } from '../config/env';
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
  storage: env.cloudinary.enabled ? multer.memoryStorage() : diskStorage,
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

  if (!file.filename) throw new Error('Uploaded file is missing its local filename');
  return `${env.apiUrl}${uploadPublicPath}/${file.filename}`;
}
