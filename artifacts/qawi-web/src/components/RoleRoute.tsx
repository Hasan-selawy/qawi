import { ReactNode } from "react";
import { Redirect } from "wouter";
import { useAuth, Role } from "../hooks/use-auth";
import { Loader2 } from "lucide-react";

const ROLE_HOME: Partial<Record<Role, string>> = {
  GYM_ADMIN: "/admin/dashboard",
  COACH: "/coach/dashboard",
  SUPER_ADMIN: "/super/dashboard",
  MEMBER: "/member/dashboard",
  RECEPTIONIST: "/reception/dashboard",
  ACCOUNTANT: "/finance/dashboard",
  HR: "/hr/dashboard",
};

export function RoleRoute({ role, children }: { role: Role | Role[], children: ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Redirect to="/login" />;
  }

  if (user.role === "SUPER_ADMIN") {
    return <>{children}</>;
  }

  const allowedRoles = Array.isArray(role) ? role : [role];

  if (!allowedRoles.includes(user.role)) {
    const home = ROLE_HOME[user.role] ?? "/login";
    return <Redirect to={home} />;
  }

  return <>{children}</>;
}
