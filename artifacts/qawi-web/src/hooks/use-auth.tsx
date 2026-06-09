import { createContext, useContext, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../services/api";

export type Role = 'MEMBER' | 'COACH' | 'GYM_ADMIN' | 'SUPER_ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  gymId?: string;
  subscriptionStartDate?: string | null;
  subscriptionEndDate?: string | null;
  active?: boolean;
}

interface AuthContextType {
  user: User | null | undefined;
  isLoading: boolean;
  login: (data: any) => Promise<any>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const hasToken = typeof window !== "undefined" && !!localStorage.getItem("qawi_token");
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["auth", "me"],
    queryFn: () => apiFetch("/auth/me"),
    retry: false,
    staleTime: Infinity,
    enabled: hasToken,
  });

  const loginMutation = useMutation({
    mutationFn: (credentials: any) => apiFetch("/auth/login", {
      method: "POST",
      data: { ...credentials, email: credentials.email?.toLowerCase().trim() },
    }),
    onSuccess: (data) => {
      localStorage.setItem("qawi_token", data.token);
      queryClient.setQueryData(["auth", "me"], data.user);
    },
  });

  const logout = () => {
    localStorage.removeItem("qawi_token");
    queryClient.setQueryData(["auth", "me"], null);
    const base = import.meta.env.BASE_URL || "/";
    window.location.href = `${base.replace(/\/$/, "")}/login`;
  };

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading: hasToken ? isLoading : false,
        login: loginMutation.mutateAsync,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}