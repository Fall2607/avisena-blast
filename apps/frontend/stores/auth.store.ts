import { create } from 'zustand';
import Cookies from 'js-cookie';

interface User {
  id: string;
  name: string;
  email: string;
  roleId: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  initialize: () => void;
}

/**
 * Check if a JWT token is expired without external libraries
 */
const isTokenExpired = (token: string): boolean => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  login: (user, token) => {
    // Set cookie valid for 1 day
    Cookies.set('token', token, { expires: 1, path: '/' });
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    Cookies.remove('token', { path: '/' });
    localStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },

  initialize: () => {
    const token = Cookies.get('token');
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;

    // If no token or token is expired, clean up everything
    if (!token || isTokenExpired(token)) {
      Cookies.remove('token', { path: '/' });
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user');
      }
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      return;
    }

    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ user, token, isAuthenticated: true, isLoading: false });
        return;
      } catch {
        Cookies.remove('token', { path: '/' });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('user');
        }
      }
    }

    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  }
}));
