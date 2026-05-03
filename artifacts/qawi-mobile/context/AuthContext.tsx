import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useSegments } from "expo-router";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import { apiFetch, TOKEN_KEY } from "@/services/api";

export type Role = "MEMBER" | "COACH" | "GYM_ADMIN" | "SUPER_ADMIN";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  gymId?: string | null;
  gymName?: string | null;
  subscriptionExpiresAt?: string | null;
};

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

const USER_KEY = "qawi_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [t, u] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);
        if (t) setToken(t);
        if (u) setUser(JSON.parse(u));
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<AuthUser> => {
    const res = await apiFetch<{ token: string; user: AuthUser }>("/auth/login", {
      method: "POST",
      data: { email, password },
    });
    await AsyncStorage.setItem(TOKEN_KEY, res.token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    setToken(null);
    setUser(null);
  }, []);

  return <Ctx.Provider value={{ user, token, loading, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}

const ROLE_ROUTES: Record<Role, string> = {
  MEMBER: "/(member)",
  COACH: "/(coach)",
  GYM_ADMIN: "/(admin)",
  SUPER_ADMIN: "/(auth)/login",
};

export function useProtectedRoute() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const first = segments[0] as string | undefined;
    const inAuth = first === "(auth)" || first === undefined;

    if (!user && !inAuth) {
      router.replace("/(auth)/login");
      return;
    }
    if (user && inAuth) {
      const target = ROLE_ROUTES[user.role] || "/(auth)/login";
      router.replace(target as any);
    }
  }, [user, loading, segments, router]);
}
