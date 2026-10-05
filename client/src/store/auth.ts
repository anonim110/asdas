import { create } from 'zustand';
import { api, setAccessToken, registerAuthHandlers } from '../lib/api';
import { connectSocket, disconnectSocket } from '../lib/socket';
import { queryClient } from '../lib/queryClient';
import { DRAFT_KEY } from '../lib/draftStorage';
import type { AuthUser } from '../types';

// Clears anything cached on the client that belongs to the just-ended
// session, so the next person using this device/browser never sees the
// previous account's data (React Query cache, unsent post draft).
function clearSessionData() {
  queryClient.clear();
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* storage unavailable — nothing to clean up */
  }
}

type Status = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user: AuthUser | null;
  status: Status;
  bootstrap: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<void>;
  register: (data: { email: string; username: string; displayName: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser) => void;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  status: 'loading',

  // On app load, try to silently restore the session via the refresh cookie.
  bootstrap: async () => {
    try {
      const { data } = await api.post<{ accessToken: string }>('/auth/refresh');
      setAccessToken(data.accessToken);
      const me = await api.get<{ user: AuthUser }>('/auth/me');
      set({ user: me.data.user, status: 'authenticated' });
      connectSocket();
    } catch {
      set({ user: null, status: 'unauthenticated' });
    }
  },

  login: async (identifier, password) => {
    const { data } = await api.post<{ user: AuthUser; accessToken: string }>('/auth/login', {
      identifier,
      password,
    });
    setAccessToken(data.accessToken);
    set({ user: data.user, status: 'authenticated' });
    connectSocket();
  },

  register: async (payload) => {
    const { data } = await api.post<{ user: AuthUser; accessToken: string }>('/auth/register', payload);
    setAccessToken(data.accessToken);
    set({ user: data.user, status: 'authenticated' });
    connectSocket();
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore network errors on logout
    }
    setAccessToken(null);
    disconnectSocket();
    clearSessionData();
    set({ user: null, status: 'unauthenticated' });
  },

  setUser: (user) => set({ user }),
}));

// Keep the socket token fresh after a silent refresh, and force-logout on
// an unrecoverable auth failure.
registerAuthHandlers({
  onTokenRefreshed: () => {
    connectSocket();
  },
  onAuthFailure: () => {
    setAccessToken(null);
    disconnectSocket();
    clearSessionData();
    useAuth.setState({ user: null, status: 'unauthenticated' });
  },
});
