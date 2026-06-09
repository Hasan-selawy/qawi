import { ReactNode } from "react";
import { Redirect } from "wouter";
import { useAuth, Role } from "../hooks/use-auth";
import { Loader2 } from "lucide-react";

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

  // SUPER_ADMIN has access to every page in the system.
  if (user.role === "SUPER_ADMIN") {
    return <>{children}</>;
  }

  const allowedRoles = Array.isArray(role) ? role : [role];

  if (!allowedRoles.includes(user.role)) {
    if (user.role === "GYM_ADMIN") return <Redirect to="/admin/dashboard" />;
    if (user.role === "COACH") return <Redirect to="/coach/dashboard" />;
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}
