import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

function roleDestination(role: string): string {
  if (role === 'GYM_ADMIN') return '/admin/dashboard';
  if (role === 'COACH') return '/coach/dashboard';
  if (role === 'SUPER_ADMIN') return '/super/dashboard';
  return '/';
}

export default function LoginPage() {
  const { login, user, isAuthenticated } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const [location, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const isRTL = lang === 'ar';

  // Redirect as soon as auth state is committed — avoids race where
  // setLocation fires before AuthProvider re-renders with the new user.
  useEffect(() => {
    if (isAuthenticated && user) {
      const dest = roleDestination(user.role);
      if (location !== dest) {
        setLocation(dest);
      }
    }
  }, [isAuthenticated, user, location, setLocation]);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    try {
      await login(data);
      // Navigation is handled by the useEffect above once auth state commits.
    } catch (error: any) {
      toast.error(lang === 'ar' ? error.messageAr : error.error);
      const formEl = document.getElementById("login-card");
      if (formEl) {
        formEl.classList.remove("shake-animation");
        void formEl.offsetWidth; // trigger reflow
        formEl.classList.add("shake-animation");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Language Toggle */}
      <div className="absolute top-4 right-4 rtl:left-4 rtl:right-auto">
        <button
          onClick={() => setLang(lang === "ar" ? "en" : "ar")}
          className="glass-card px-4 py-2 rounded-full text-sm font-semibold tracking-wider hover:bg-white/5 transition-colors"
        >
          {lang === "ar" ? "EN" : "AR"}
        </button>
      </div>

      <div 
        id="login-card"
        className="glass-card w-full max-w-md p-8 page-enter border-primary/20 glow-hover relative z-10"
      >
        <div className="text-center mb-14">
          <h1
            className="text-7xl font-extrabold tracking-tight leading-none mb-3"
            style={{
              color: '#22C55E',
              textShadow: '0 0 24px rgba(34,197,94,0.45), 0 0 48px rgba(34,197,94,0.18)',
              fontFamily: '"Noto Kufi Arabic", "Tajawal", system-ui, sans-serif',
            }}
          >
            قوي
          </h1>
          <p
            className="text-base text-white/70 font-light tracking-[0.35em] uppercase"
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            QAWI
          </p>
          <p className="text-xs text-white/50 mt-3" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            {lang === 'ar' ? 'تدرب بذكاء. كن أقوى.' : 'Train Smarter. Get Stronger.'}
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input 
                      placeholder={t("auth.email_placeholder")} 
                      {...field} 
                      className="bg-black/20 border-white/10 focus-visible:ring-primary focus-visible:border-primary h-12"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        type={showPassword ? "text" : "password"} 
                        placeholder={t("auth.password_placeholder")} 
                        {...field} 
                        className="bg-black/20 border-white/10 focus-visible:ring-primary focus-visible:border-primary h-12 pr-10 rtl:pl-10 rtl:pr-3"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white rtl:left-3 rtl:right-auto"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground text-lg font-semibold glow-hover"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : null}
              {t("auth.login_button")}
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setForgotOpen(true)}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {isRTL ? 'نسيت كلمة المرور؟' : 'Forgot Password?'}
          </button>
        </div>

        <div className="mt-4 text-center">
          <Link href="/register" className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors text-sm">
            {t("auth.register")}
            <ArrowRight size={16} className="ml-2 rtl:rotate-180 rtl:mr-2 rtl:ml-0" />
          </Link>
        </div>

        <div className="mt-3 text-center">
          <Link href="/privacy" className="text-xs text-muted-foreground hover:text-primary transition-colors">
            {isRTL ? "سياسة الخصوصية" : "Privacy Policy"}
          </Link>
        </div>
      </div>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="glass-card border-white/10 sm:max-w-[360px]" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{isRTL ? 'نسيت كلمة المرور؟' : 'Forgot Password?'}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {isRTL
              ? 'تواصل مع مدير الصالة لإعادة تعيين كلمة المرور'
              : 'Please contact your gym admin to reset your password.'}
          </p>
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setForgotOpen(false)}>
              {isRTL ? 'حسناً' : 'OK'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Background gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>
    </div>
  );
}