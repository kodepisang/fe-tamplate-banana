import { create } from 'zustand';

interface AuthUser {
  id: number;
  name: string;
  email: string;
  roles: string[];
}

interface AuthState {
  auth: {
    user: AuthUser | null;
    setUser: (user: AuthUser | null) => void;
    accessToken: string;
    setAccessToken: (accessToken: string) => void;
    reset: () => void;
  };
}

const getStoredUser = (): AuthUser | null => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

const getStoredToken = (): string => {
  return localStorage.getItem('token') || '';
};

export const useAuthStore = create<AuthState>()((set) => ({
  auth: {
    user: getStoredUser(),
    setUser: (user) =>
      set((state) => {
        if (user) {
          localStorage.setItem('user', JSON.stringify(user));
        } else {
          localStorage.removeItem('user');
        }
        return { ...state, auth: { ...state.auth, user } };
      }),
    accessToken: getStoredToken(),
    setAccessToken: (accessToken) =>
      set((state) => {
        if (accessToken) {
          localStorage.setItem('token', accessToken);
        } else {
          localStorage.removeItem('token');
        }
        return { ...state, auth: { ...state.auth, accessToken } };
      }),
    reset: () =>
      set((state) => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return {
          ...state,
          auth: { ...state.auth, user: null, accessToken: '' },
        };
      }),
  },
}));
