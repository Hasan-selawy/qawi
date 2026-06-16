import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Role = 'MEMBER' | 'COACH' | 'GYM_ADMIN' | 'SUPER_ADMIN' | 'RECEPTIONIST' | 'SALES' | 'NUTRITIONIST' | 'ACCOUNTANT' | 'HR';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  gymId?: string;
  subscriptionStartDate?: string | null;
  subscriptionEndDate?: string | null;
  active?: boolean;
  selfTrainingEnabled?: boolean;
  profileImageUrl?: string | null;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

const storage = {
  getItem: (name: string) => {
    const str = localStorage.getItem(name);
    if (!str) return null;
    try {
      return JSON.parse(str);
    } catch {
      return { state: { token: str }, version: 0 };
    }
  },
  setItem: (name: string, value: any) => {
    localStorage.setItem(name, JSON.stringify(value));
  },
  removeItem: (name: string) => {
    localStorage.removeItem(name);
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),
      login: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
      isAuthenticated: () => !!get().user && !!get().token,
    }),
    {
      name: "qawi_token",
      storage,
      partialize: (state) => ({ token: state.token }),
    }
  )
);
