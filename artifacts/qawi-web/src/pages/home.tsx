import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { LogIn, Smartphone } from "lucide-react";

export function RoleHome() {
  const { user, isAuthenticated, logout } = useAuth();
  const { lang } = useLanguage();

  if (!isAuthenticated) return <Redirect to="/login" />;
  if (user?.role === 'GYM_ADMIN') return <Redirect to="/admin/dashboard" />;
  if (user?.role === 'COACH') return <Redirect to="/coach/dashboard" />;
  if (user?.role === 'SUPER_ADMIN') return <Redirect to="/super/dashboard" />;

  // MEMBER: web dashboard is for admins/coaches only
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="glass-card max-w-md w-full p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Smartphone size={32} className="text-primary" />
        </div>
        <h2 className="text-xl font-bold">
          {lang === 'ar' ? 'المستخدمين يستخدمون تطبيق الجوال' : 'Members use the Mobile App'}
        </h2>
        <p className="text-muted-foreground text-sm">
          {lang === 'ar'
            ? 'لوحة التحكم على الويب مخصصة للمسؤولين والمدربين. الرجاء استخدام تطبيق Qawi على الجوال.'
            : 'The web dashboard is for admins and coaches. Please use the Qawi mobile app to manage your workouts.'}
        </p>
        <Button onClick={logout} variant="outline" className="w-full">
          <LogIn size={16} className="mr-2 rtl:ml-2 rtl:mr-0" />
          {lang === 'ar' ? 'تسجيل الخروج' : 'Logout'}
        </Button>
      </div>
    </div>
  );
}