import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";

export function RoleHome() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Redirect to="/login" />;
  if (user?.role === 'GYM_ADMIN') return <Redirect to="/admin/dashboard" />;
  if (user?.role === 'COACH') return <Redirect to="/coach/dashboard" />;
  if (user?.role === 'SUPER_ADMIN') return <Redirect to="/super/dashboard" />;
  if (user?.role === 'MEMBER') return <Redirect to="/member/dashboard" />;
  if (user?.role === 'RECEPTIONIST') return <Redirect to="/reception/dashboard" />;
  if (user?.role === 'SALES') return <Redirect to="/admin/sales" />;
  if (user?.role === 'NUTRITIONIST') return <Redirect to="/nutrition/dashboard" />;
  if (user?.role === 'ACCOUNTANT') return <Redirect to="/finance/dashboard" />;
  if (user?.role === 'HR') return <Redirect to="/hr/dashboard" />;

  return <Redirect to="/login" />;
}
