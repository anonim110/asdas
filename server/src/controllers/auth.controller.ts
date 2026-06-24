import { Request, Response } from 'express';
import crypto from 'crypto';
import * as authService from '../services/auth.service';
import { env } from '../config/env';

const REFRESH_COOKIE = 'refreshToken';
const GOOGLE_STATE_COOKIE = 'googleOAuthState';

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    // In production the frontend and API are on different origins,
    // sites, so the cookie must be SameSite=None + Secure to be sent on
    // cross-site credentialed requests. Locally we keep Lax.
    secure: env.isProd,
    sameSite: env.isProd ? 'none' : 'lax',
    path: '/api/auth',
    maxAge: env.jwt.refreshTtlDays * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
}

function clientRedirect(path: string) {
  return new URL(path, env.google.clientRedirectBase).toString();
}

function setGoogleStateCookie(res: Response, state: string) {
  res.cookie(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'lax',
    path: '/api/auth/google',
    maxAge: 10 * 60 * 1000,
  });
}

function clearGoogleStateCookie(res: Response) {
  res.clearCookie(GOOGLE_STATE_COOKIE, { path: '/api/auth/google' });
}

export async function register(req: Request, res: Response) {
  const { user, accessToken, refreshToken } = await authService.register(req.body);
  setRefreshCookie(res, refreshToken);
  res.status(201).json({ user, accessToken });
}

export async function login(req: Request, res: Response) {
  const { identifier, password } = req.body;
  const { user, accessToken, refreshToken } = await authService.login(identifier, password);
  setRefreshCookie(res, refreshToken);
  res.json({ user, accessToken });
}

export async function googleStart(_req: Request, res: Response) {
  try {
    const state = crypto.randomBytes(24).toString('hex');
    setGoogleStateCookie(res, state);
    res.redirect(authService.getGoogleAuthUrl(state));
  } catch {
    res.redirect(clientRedirect('/login?google=not-configured'));
  }
}

export async function googleCallback(req: Request, res: Response) {
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const savedState = req.cookies?.[GOOGLE_STATE_COOKIE];
  clearGoogleStateCookie(res);

  if (!state || !code || !savedState || state !== savedState) {
    res.redirect(clientRedirect('/login?google=failed'));
    return;
  }

  try {
    const { refreshToken, isNew } = await authService.loginWithGoogle(code);
    setRefreshCookie(res, refreshToken);
    res.redirect(clientRedirect(isNew ? '/settings?welcome=google' : '/home?google=success'));
  } catch {
    res.redirect(clientRedirect('/login?google=failed'));
  }
}

export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.[REFRESH_COOKIE];
  const { accessToken, refreshToken } = await authService.rotateRefresh(token);
  setRefreshCookie(res, refreshToken);
  res.json({ accessToken });
}

export async function logout(req: Request, res: Response) {
  await authService.logout(req.cookies?.[REFRESH_COOKIE]);
  clearRefreshCookie(res);
  res.status(204).end();
}

export async function me(req: Request, res: Response) {
  const user = await authService.getMe(req.userId!);
  res.json({ user });
}

export async function forgotPassword(req: Request, res: Response) {
  const { code } = await authService.requestPasswordReset(req.body.identifier);
  // `code` is only present outside production so the flow remains testable.
  res.json({ message: 'If that account exists, a code has been sent to its email.', code });
}

export async function resetPassword(req: Request, res: Response) {
  await authService.resetPassword(req.body.identifier, req.body.code, req.body.password);
  res.json({ message: 'Password updated. Please sign in again.' });
}

export async function changePassword(req: Request, res: Response) {
  await authService.changePassword(req.userId!, req.body.currentPassword, req.body.newPassword);
  res.json({ message: 'Password changed.' });
}
