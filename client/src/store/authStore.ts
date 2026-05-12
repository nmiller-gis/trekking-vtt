import { create } from 'zustand';

interface AuthStore {
  token: string | null;
  userId: string | null;
  username: string | null;
  isAuthenticated: boolean;

  setAuth: (token: string, userId: string, username: string) => void;
  clearAuth: () => void;
}

const stored = localStorage.getItem('lcars-auth');
let initial: Pick<AuthStore, 'token' | 'userId' | 'username' | 'isAuthenticated'> = {
  token: null, userId: null, username: null, isAuthenticated: false,
};
if (stored) {
  try {
    const parsed = JSON.parse(stored);
    if (parsed.token && parsed.userId && parsed.username) {
      initial = { ...parsed, isAuthenticated: true };
    }
  } catch { /* ignore */ }
}

export const useAuthStore = create<AuthStore>((set) => ({
  ...initial,

  setAuth: (token, userId, username) => {
    localStorage.setItem('lcars-auth', JSON.stringify({ token, userId, username }));
    set({ token, userId, username, isAuthenticated: true });
  },

  clearAuth: () => {
    localStorage.removeItem('lcars-auth');
    set({ token: null, userId: null, username: null, isAuthenticated: false });
  },
}));
