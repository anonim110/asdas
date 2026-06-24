import { z } from 'zod';

const username = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be at most 20 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers and underscore are allowed');

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password is too long');

// ───────────────────────── Auth ─────────────────────────

export const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  username,
  displayName: z.string().min(1, 'Display name is required').max(50),
  password,
});

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  identifier: z.string().trim().min(1, 'Email or username is required').max(100),
});

export const resetPasswordSchema = z.object({
  identifier: z.string().trim().min(1, 'Email or username is required').max(100),
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
  password,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: password,
});

// ──────────────────────── Profile ────────────────────────

const emptyToNull = (v: unknown) => (v === '' ? null : v);

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  bio: z.preprocess(emptyToNull, z.string().max(160).nullable().optional()),
  link: z.preprocess(emptyToNull, z.string().url('Must be a valid URL').max(200).nullable().optional()),
  location: z.preprocess(emptyToNull, z.string().max(50).nullable().optional()),
});

// ───────────────────────── Posts ─────────────────────────

export const createPostSchema = z.object({
  // Content is optional because a post may be media-only.
  content: z.string().max(280, 'Posts are limited to 280 characters').optional(),
  parentId: z.string().cuid().optional(),
  quotedPostId: z.string().cuid().optional(),
  // When set, the post is published into a community (group) feed.
  communityId: z.string().cuid().optional(),
});

export const quoteSchema = z.object({
  content: z.string().max(280).optional(),
});

export const updatePostSchema = z.object({
  content: z.string().max(280, 'Posts are limited to 280 characters').optional(),
});

// ─────────────────────── Messages ───────────────────────

export const startConversationSchema = z.object({
  username: z.string().min(1),
});

export const sendMessageSchema = z.object({
  // Optional because a message may be an image with no text.
  content: z.string().max(2000).optional(),
});

// ────────────────────── Communities ──────────────────────

export const createCommunitySchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(50),
  slug: z
    .string()
    .max(30)
    .regex(/^[a-zA-Z0-9-]+$/, 'Only letters, numbers and hyphens are allowed')
    .optional(),
  description: z.preprocess(emptyToNull, z.string().max(280).nullable().optional()),
  isPrivate: z.coerce.boolean().optional(),
});

export const communityMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(2000),
});

// ───────────────── Pagination / queries ─────────────────

export const cursorQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const searchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  type: z.enum(['top', 'users', 'posts']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const profileTabQuerySchema = z.object({
  tab: z.enum(['posts', 'replies', 'media', 'likes']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});
