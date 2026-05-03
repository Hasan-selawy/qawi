import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/services/api";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Eye, EyeOff, Loader2, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const step1Schema = z.object({
  gymName: z.string().min(2),
  gymNameAr: z.string().optional(),
  adminName: z.string().min(2),
  adminNameAr: z.string().optional(),
});

const step2Schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

export default function RegisterPage() {
  const { t, lang, setLang } = useLanguage();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<any>({});

  const form1 = useForm<z.infer<typeof step1Schema>>({
    resolver: zodResolver(step1Schema),
    defaultValues: { gymName: "", gymNameAr: "", adminName: "", adminNameAr: "" },
  });

  const form2 = useForm<z.infer<typeof step2Schema>>({
    resolver: zodResolver(step2Schema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const { data: plans, isLoading: loadingPlans } = useQuery({
    queryKey: ["public", "plans"],
    queryFn: () => apiFetch("/public/plans"),
  });

  const registerMutation = useMutation({
    mutationFn: (data: any) => apiFetch("/public/register-gym", { method: "POST", data }),
    onSuccess: (data: any) => {
      localStorage.setItem("qawi_token", data.token);
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      toast.success(lang === 'ar' ? 'تم التسجيل بنجاح' : 'Registered successfully');
      setLocation("/admin/dashboard");
    },
    onError: (error: any) => {
      toast.error(lang === 'ar' ? error.messageAr : error.error);
    }
  });

  const onStep1Submit = (data: z.infer<typeof step1Schema>) => {
    setFormData({ ...formData, ...data });
    setStep(2);
  };

  const onStep2Submit = (data: z.infer<typeof step2Schema>) => {
    setFormData({ ...formData, ...data });
    setStep(3);
  };

  const onPlanSelect = (plan: string) => {
    registerMutation.mutate({
      gymName: formData.gymName,
      ownerName: formData.adminName,
      ownerEmail: formData.email,
      ownerPassword: formData.password,
      subscriptionPlan: plan,
    });
  };

  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-4 right-4 rtl:left-4 rtl:right-auto">
        <button
          onClick={() => setLang(lang === "ar" ? "en" : "ar")}
          className="glass-card px-4 py-2 rounded-full text-sm font-semibold tracking-wider hover:bg-white/5 transition-colors"
        >
          {lang === "ar" ? "EN" : "AR"}
        </button>
      </div>

      <div className={cn("glass-card w-full p-8 border-primary/20 relative z-10", step === 3 ? "max-w-4xl" : "max-w-md")}>
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2 tracking-tight" style={{ textShadow: '0 0 20px rgba(34,197,94,0.3)' }} dir={lang === 'ar' ? 'rtl' : 'ltr'}>{lang === 'ar' ? 'قوي' : 'Qawi'}</h1>
          <p className="text-muted-foreground">{t("auth.register")}</p>
          
          <div className="flex justify-center items-center gap-2 mt-6">
            {[1, 2, 3].map(i => (
              <div key={i} className={cn(
                "h-2 rounded-full transition-all duration-300",
                step >= i ? "w-8 bg-primary" : "w-2 bg-white/10"
              )} />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Form {...form1}>
                <form onSubmit={form1.handleSubmit(onStep1Submit)} className="space-y-4">
                  <FormField control={form1.control} name="gymName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{lang === 'ar' ? 'اسم الصالة الرياضية' : 'Gym Name'}</FormLabel>
                      <FormControl><Input {...field} className="bg-black/20" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form1.control} name="gymNameAr" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{lang === 'ar' ? 'اسم الصالة الرياضية (بالعربية)' : 'Gym Name (Arabic)'}</FormLabel>
                      <FormControl><Input {...field} className="bg-black/20" dir="rtl" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form1.control} name="adminName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{lang === 'ar' ? 'اسم المدير' : 'Admin Name'}</FormLabel>
                      <FormControl><Input {...field} className="bg-black/20" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form1.control} name="adminNameAr" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{lang === 'ar' ? 'اسم المدير (بالعربية)' : 'Admin Name (Arabic)'}</FormLabel>
                      <FormControl><Input {...field} className="bg-black/20" dir="rtl" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" className="w-full h-12 mt-6">{t('common.next') || 'Next'}</Button>
                </form>
              </Form>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Form {...form2}>
                <form onSubmit={form2.handleSubmit(onStep2Submit)} className="space-y-4">
                  <FormField control={form2.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('common.email')}</FormLabel>
                      <FormControl><Input {...field} type="email" className="bg-black/20" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form2.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('common.password')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input {...field} type={showPassword ? "text" : "password"} className="bg-black/20" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-muted-foreground rtl:left-3 rtl:right-auto">
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form2.control} name="confirmPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{lang === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}</FormLabel>
                      <FormControl><Input {...field} type={showPassword ? "text" : "password"} className="bg-black/20" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="flex gap-3 mt-6">
                    <Button type="button" variant="outline" onClick={() => setStep(1)} className="h-12 w-full">{t('common.back') || 'Back'}</Button>
                    <Button type="submit" className="w-full h-12">{t('common.next') || 'Next'}</Button>
                  </div>
                </form>
              </Form>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4 border border-primary/20">
                  <CheckCircle2 size={16} />
                  {lang === 'ar' ? 'تجربة مجانية لمدة 14 يوماً - بدون بطاقة ائتمان' : '14-day free trial — no credit card'}
                </div>
              </div>
              
              {loadingPlans ? (
                <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {plans?.map((plan: any) => (
                    <div key={plan.plan} className="glass-card p-6 flex flex-col border border-white/5 hover:border-primary/50 transition-colors">
                      <h3 className="text-xl font-bold mb-2">{plan.plan}</h3>
                      <div className="text-3xl font-bold text-primary mb-6">${plan.price}<span className="text-sm text-muted-foreground font-normal">/mo</span></div>

                      <ul className="space-y-3 mb-8 flex-1 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 size={16} className="text-primary shrink-0 mt-0.5" />
                          <span>Up to {plan.maxMembers} members</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 size={16} className="text-primary shrink-0 mt-0.5" />
                          <span>Up to {plan.maxCoaches} coaches</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 size={16} className="text-primary shrink-0 mt-0.5" />
                          <span>Bilingual EN / AR dashboard</span>
                        </li>
                      </ul>

                      <Button
                        onClick={() => onPlanSelect(plan.plan)}
                        disabled={registerMutation.isPending}
                        className="w-full h-12 glow-hover"
                      >
                        {registerMutation.isPending ? <Loader2 className="animate-spin" /> : (lang === 'ar' ? 'اختيار هذه الخطة' : 'Select Plan')}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-8 flex justify-center">
                 <Button type="button" variant="outline" onClick={() => setStep(2)} className="h-12 w-full max-w-xs">{t('common.back') || 'Back'}</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 text-center">
          <Link href="/login" className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors text-sm">
            <ArrowLeft size={16} className="mr-2 rtl:rotate-180 rtl:ml-2 rtl:mr-0" />
            {t("auth.login")}
          </Link>
        </div>
      </div>
      
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>
    </div>
  );
}