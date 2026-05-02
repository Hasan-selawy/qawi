import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";

export function RoleHome() {
  const { user, isAuthenticated, logout } = useAuth();
  const { t, lang } = useLanguage();

  if (!isAuthenticated) return <Redirect to="/login" />;
  if (user?.role === 'GYM_ADMIN') return <Redirect to="/admin/dashboard" />;
  if (user?.role === 'COACH') return <Redirect to="/coach/dashboard" />;
  if (user?.role === 'SUPER_ADMIN') return <Redirect to="/super/dashboard" />;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="glass-card max-w-md w-full p-8 text-center space-y-6">
        <h1 className="text-3xl font-bold text-primary">قوي</h1>
        <h2 className="text-xl font-semibold">
          {lang === 'ar' ? 'بوابة الأعضاء قريباً' : 'Member portal coming soon'}
        </h2>
        <p className="text-muted-foreground">
          {lang === 'ar' 
            ? 'نحن نعمل على شيء مميز لك. يرجى العودة لاحقاً.' 
            : 'We are working on something special for you. Please check back later.'}
        </p>
        <Button onClick={logout} variant="outline" className="w-full">
          {t("common.logout")}
        </Button>
      </div>
    </div>
  );
}