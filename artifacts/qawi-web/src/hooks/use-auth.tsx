import { ReactNode, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore, type User, type Role } from "@/stores/authStore";
import { apiFetch } from "../services/api";

export type { User, Role };

export function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useAuth() {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);

  const { data: queryUser, isLoading } = useQuery<User | null>({
    queryKey: ["auth", "me"],
    queryFn: () => apiFetch("/auth/me"),
    retry: false,
    staleTime: Infinity,
    enabled: !!token,
  });

  useEffect(() => {
    setUser(queryUser ?? null);
  }, [queryUser, setUser]);

  const loginMutation = useMutation({
    mutationFn: (credentials: any) =>
      apiFetch("/auth/login", {
        method: "POST",
        data: { ...credentials, email: credentials.email?.toLowerCase().trim() },
      }),
    onSuccess: (data) => {
      login(data.token, data.user);
      queryClient.setQueryData(["auth", "me"], data.user);
    },
  });

  const handleLogout = () => {
    logout();
    queryClient.setQueryData(["auth", "me"], null);
    const base = import.meta.env.BASE_URL || "/";
    window.location.href = `${base.replace(/\/$/, "")}/login`;
  };

  return {
    user,
    isLoading: !!token ? isLoading : false,
    login: loginMutation.mutateAsync,
    logout: handleLogout,
    isAuthenticated: !!user,
  };
}
