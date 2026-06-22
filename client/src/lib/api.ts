import axios, { AxiosError, AxiosRequestConfig } from 'axios';

const API_ORIGIN = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export const api = axios.create({
  baseURL: `${API_ORIGIN}/api`,
  withCredentials: true, // send the refresh-token cookie
});

// Access token is kept in memory only (never localStorage) to reduce XSS risk.
let accessToken: string | null = null;
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};
export const getAccessToken = () => accessToken;

// Callbacks wired up by the auth store so api.ts stays decoupled from it.
let onTokenRefreshed: (token: string) => void = () => {};
let onAuthFailure: () => void = () => {};
export function registerAuthHandlers(handlers: {
  onTokenRefreshed: (token: string) => void;
  onAuthFailure: () => void;
}) {
  onTokenRefreshed = handlers.onTokenRefreshed;
  onAuthFailure = handlers.onAuthFailure;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// --- Single-flight refresh: queue requests while a refresh is in progress ---
let refreshing: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (!refreshing) {
    refreshing = axios
      .post<{ accessToken: string }>(`${API_ORIGIN}/api/auth/refresh`, null, { withCredentials: true })
      .then((res) => {
        const token = res.data.accessToken;
        setAccessToken(token);
        onTokenRefreshed(token);
        return token;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    const url = original?.url ?? '';

    const isAuthRoute = url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/register');

    if (error.response?.status === 401 && !original._retry && !isAuthRoute) {
      original._retry = true;
      try {
        const token = await refreshAccessToken();
        original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
        return api(original);
      } catch {
        onAuthFailure();
      }
    }
    return Promise.reject(error);
  },
);

// Normalises an API error into a human-readable message. When the backend
// returns field-level validation details, surface the first specific message
// (e.g. "Password must be at least 8 characters") instead of the generic one.
export function errorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as
      | { error?: { message?: string; details?: Array<{ path?: string; message?: string }> } }
      | undefined;
    const detail = data?.error?.details?.[0]?.message;
    if (detail) return detail;
    return data?.error?.message ?? err.message ?? fallback;
  }
  return fallback;
}

export { API_ORIGIN };
