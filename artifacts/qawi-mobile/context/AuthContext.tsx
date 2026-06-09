import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useSegments } from "expo-router";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { apiFetch, TOKEN_KEY, setUnauthorizedHandler } from "@/services/api";

async function safeSet(key: string, value: unknown): Promise<void> {
  if (typeof value !== "string" || value.length === 0) {
    console.warn(`[auth] Refusing to store ${key}: value is`, value);
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.warn(`[auth] removeItem(${key}) failed`, e);
    }
    return;
  }
  await AsyncStorage.setItem(key, value);
}

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
  const routerRef = useRef<ReturnType<typeof useRouter> | null>(null);

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    setToken(null);
    setUser(null);
  }, []);

  // Register global 401 handler once on mount
  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout().catch(() => {});
    });
  }, [logout]);

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
    const normalizedEmail = email.toLowerCase().trim();
    const res = await apiFetch<{ token?: string; user?: AuthUser }>("/auth/login", {
      method: "POST",
      data: { email: normalizedEmail, password },
    });

    if (!res || typeof res.token !== "string" || !res.token || !res.user) {
      console.warn("[auth] Login response missing token/user:", res);
      throw new Error("Invalid login response from server");
    }

    await safeSet(TOKEN_KEY, res.token);
    await safeSet(USER_KEY, JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
    return res.user;
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

  const firstSegment = segments[0] as string | undefined;

  useEffect(() => {
    if (loading) return;
    const inAuth = firstSegment === "(auth)" || firstSegment === undefined;

    if (!user && !inAuth) {
      router.replace("/(auth)/login");
      return;
    }
    if (user && inAuth) {
      const target = ROLE_ROUTES[user.role] || "/(auth)/login";
      router.replace(target as any);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, firstSegment]);
}
