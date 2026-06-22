import { prisma } from '../config/prisma';
import { ApiError } from '../utils/apiError';
import { hashPassword, verifyPassword } from '../utils/password';
import { env } from '../config/env';
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
} from '../utils/jwt';

function refreshExpiry(): Date {
  return new Date(Date.now() + env.jwt.refreshTtlDays * 24 * 60 * 60 * 1000);
}

const meSelect = {
  id: true,
  email: true,
  username: true,
  displayName: true,
  passwordHash: true,
  googleId: true,
  emailVerified: true,
  bio: true,
  link: true,
  location: true,
  avatarUrl: true,
  bannerUrl: true,
  createdAt: true,
};

function toAuthUser(user: any) {
  const { passwordHash, googleId, ...safe } = user;
  return {
    ...safe,
    hasPassword: Boolean(passwordHash),
    googleLinked: Boolean(googleId),
  };
}

// Issues a short-lived access token plus a persisted, hashed refresh token.
export async function issueTokens(userId: string) {
  const accessToken = signAccessToken(userId);
  const refreshToken = generateRefreshToken();
  await prisma.refreshToken.create({
    data: { tokenHash: hashToken(refreshToken), userId, expiresAt: refreshExpiry() },
  });
  return { accessToken, refreshToken };
}

interface RegisterArgs {
  email: string;
  username: string;
  displayName: string;
  password: string;
}

export async function register({ email, username, displayName, password }: RegisterArgs) {
  const normalisedEmail = email.toLowerCase();
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: normalisedEmail }, { username }] },
    select: { email: true, username: true },
  });
  if (existing) {
    if (existing.email === normalisedEmail) throw ApiError.conflict('Email already in use');
    throw ApiError.conflict('Username already taken');
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email: normalisedEmail, username, displayName, passwordHash, emailVerified: false },
    select: meSelect,
  });
  const tokens = await issueTokens(user.id);
  return { user: toAuthUser(user), ...tokens };
}

export async function login(identifier: string, password: string) {
  const value = identifier.trim();
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: value.toLowerCase() }, { username: value }] },
  });
  if (!user) throw ApiError.unauthorized('Invalid credentials');
  if (!user.passwordHash) throw ApiError.unauthorized('Use Google to sign in to this account');

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw ApiError.unauthorized('Invalid credentials');

  const tokens = await issueTokens(user.id);
  return { user: toAuthUser(user), ...tokens };
}

function assertGoogleConfigured() {
  if (!env.google.clientId || !env.google.clientSecret) {
    throw ApiError.badRequest('Google sign-in is not configured');
  }
}

export function getGoogleAuthUrl(state: string) {
  assertGoogleConfigured();
  const params = new URLSearchParams({
    client_id: env.google.clientId,
    redirect_uri: env.google.callbackUrl,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

interface GoogleProfile {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

async function fetchGoogleProfile(code: string): Promise<GoogleProfile> {
  assertGoogleConfigured();
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.google.clientId,
      client_secret: env.google.clientSecret,
      redirect_uri: env.google.callbackUrl,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) throw ApiError.unauthorized('Google sign-in failed');
  const tokenData = (await tokenRes.json()) as { access_token?: string };
  if (!tokenData.access_token) throw ApiError.unauthorized('Google sign-in failed');

  const profileRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  if (!profileRes.ok) throw ApiError.unauthorized('Could not read Google profile');
  const profile = (await profileRes.json()) as GoogleProfile;
  if (!profile.sub || !profile.email || profile.email_verified === false) {
    throw ApiError.unauthorized('Google account email must be verified');
  }
  return profile;
}

function cleanUsername(value: string) {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 16);
  return cleaned.length >= 3 ? cleaned : `user${cleaned}`.slice(0, 16);
}

async function uniqueUsername(email: string) {
  const localPart = email.split('@')[0] || 'user';
  const base = cleanUsername(localPart);
  for (let i = 0; i < 50; i += 1) {
    const suffix = i === 0 ? '' : String(i + 1);
    const candidate = `${base.slice(0, 20 - suffix.length)}${suffix}`;
    const exists = await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  return `user_${generateRefreshToken().slice(0, 8)}`;
}

export async function loginWithGoogle(code: string) {
  const profile = await fetchGoogleProfile(code);
  const email = profile.email.toLowerCase();
  const displayName = (profile.name || email.split('@')[0] || 'Google user').slice(0, 50);
  const existing = await prisma.user.findFirst({
    where: { OR: [{ googleId: profile.sub }, { email }] },
    select: meSelect,
  });

  if (existing) {
    const user = await prisma.user.update({
      where: { id: existing.id },
      data: {
        googleId: existing.googleId ?? profile.sub,
        emailVerified: true,
        avatarUrl: existing.avatarUrl ?? profile.picture ?? null,
      },
      select: meSelect,
    });
    const tokens = await issueTokens(user.id);
    return { user: toAuthUser(user), isNew: false, ...tokens };
  }

  const username = await uniqueUsername(email);
  const user = await prisma.user.create({
    data: {
      email,
      username,
      displayName,
      googleId: profile.sub,
      emailVerified: true,
      avatarUrl: profile.picture ?? null,
    },
    select: meSelect,
  });
  const tokens = await issueTokens(user.id);
  return { user: toAuthUser(user), isNew: true, ...tokens };
}

// Validates a refresh token, rotates it (delete old, issue new), and returns
// fresh tokens. Rotation limits the blast radius of a stolen refresh token.
export async function rotateRefresh(refreshToken: string) {
  if (!refreshToken) throw ApiError.unauthorized('Missing refresh token');
  const tokenHash = hashToken(refreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!stored || stored.expiresAt < new Date()) {
    if (stored) await prisma.refreshToken.delete({ where: { tokenHash } }).catch(() => {});
    throw ApiError.unauthorized('Invalid or expired session');
  }

  await prisma.refreshToken.delete({ where: { tokenHash } });
  const tokens = await issueTokens(stored.userId);
  return tokens;
}

export async function logout(refreshToken?: string) {
  if (!refreshToken) return;
  await prisma.refreshToken.deleteMany({ where: { tokenHash: hashToken(refreshToken) } });
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: meSelect });
  if (!user) throw ApiError.notFound('User not found');
  return toAuthUser(user);
}

// Generates a single-use password reset token. Without an email provider we
// return the token directly (dev) so the flow is testable; in production this
// would be emailed instead of returned.
export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  // Always behave the same to avoid leaking which emails are registered.
  if (!user) return { token: null };

  const token = generateRefreshToken();
  await prisma.passwordResetToken.create({
    data: {
      tokenHash: hashToken(token),
      userId: user.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    },
  });
  return { token: env.isProd ? null : token };
}

export async function resetPassword(token: string, newPassword: string) {
  const tokenHash = hashToken(token);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw ApiError.badRequest('Invalid or expired reset token');
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { tokenHash }, data: { usedAt: new Date() } }),
    // Invalidate all existing sessions on password change.
    prisma.refreshToken.deleteMany({ where: { userId: record.userId } }),
  ]);
}

export async function changePassword(userId: string, currentPassword: string | undefined, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('User not found');
  if (user.passwordHash) {
    if (!currentPassword) throw ApiError.badRequest('Current password is required');
    const ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok) throw ApiError.badRequest('Current password is incorrect');
  }
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}
