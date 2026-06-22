import dotenv from 'dotenv';

dotenv.config();

const clientUrls = required('CLIENT_URL', 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const apiUrl = required('API_URL', 'http://localhost:4000');

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT ?? 4000),
  apiUrl,
  clientUrls,

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', 'dev-access-secret'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
    accessTtl: process.env.ACCESS_TOKEN_TTL ?? '15m',
    refreshTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30),
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL ?? `${apiUrl}/api/auth/google/callback`,
    clientRedirectBase: clientUrls[0] ?? 'http://localhost:5173',
  },

  upload: {
    dir: process.env.UPLOAD_DIR ?? 'uploads',
    maxBytes: Number(process.env.MAX_UPLOAD_MB ?? 25) * 1024 * 1024,
  },
} as const;
