import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";

export function RoleHome() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Redirect to="/login" />;
  if (user?.role === 'GYM_ADMIN') return <Redirect to="/admin/dashboard" />;
  if (user?.role === 'COACH') return <Redirect to="/coach/dashboard" />;
  if (user?.role === 'SUPER_ADMIN') return <Redirect to="/super/dashboard" />;
  if (user?.role === 'MEMBER') return <Redirect to="/member/dashboard" />;

  return <Redirect to="/login" />;
}
