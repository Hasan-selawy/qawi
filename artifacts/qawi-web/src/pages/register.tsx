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
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2, Check, Star } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const step1Schema = z.object({
  gymName: z.string().min(2, "Gym name must be at least 2 characters"),
  adminName: z.string().min(2, "Admin name must be at least 2 characters"),
});

const step2Schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const contactSchema = z.object({
  fullName: z.string().min(2),
  phoneNumber: z.string().regex(/^(?:\+962|0)7[7-9]\d{7}$/, "Invalid Jordanian phone number"),
  gymName: z.string().min(2),
  city: z.string().min(2),
  message: z.string().optional(),
});

type DurationKey = "1M" | "3M" | "6M" | "12M";

const DURATIONS: { key: DurationKey; labelEn: string; labelAr: string; months: number }[] = [
  { key: "1M", labelEn: "1 Month", labelAr: "شهر", months: 1 },
  { key: "3M", labelEn: "3 Months", labelAr: "3 أشهر", months: 3 },
  { key: "6M", labelEn: "6 Months", labelAr: "6 أشهر", months: 6 },
  { key: "12M", labelEn: "1 Year", labelAr: "سنة", months: 12 },
];

function getPriceForDuration(tier: any, key: DurationKey): number {
  switch (key) {
    case "1M": return tier.price1m;
    case "3M": return tier.price3m;
    case "6M": return tier.price6m;
    case "12M": return tier.price12m;
  }
}

function getSavingBadge(tier: any, key: DurationKey, lang: string): string | null {
  if (key === "6M" && tier.save6mPercent > 0) {
    return lang === "ar" ? `وفر ${tier.save6mPercent}%` : `Save ${tier.save6mPercent}%`;
  }
  if (key === "12M" && tier.save12mPercent > 0) {
    return lang === "ar" ? `وفر ${tier.save12mPercent}%` : `Save ${tier.save12mPercent}%`;
  }
  return null;
}

export default function RegisterPage() {
  const { t, lang, setLang } = useLanguage();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [duration, setDuration] = useState<DurationKey>("1M");
  const [contactOpen, setContactOpen] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);

  const form1 = useForm<z.infer<typeof step1Schema>>({ resolver: zodResolver(step1Schema), defaultValues: { gymName: "", adminName: "" } });
  const form2 = useForm<z.infer<typeof step2Schema>>({ resolver: zodResolver(step2Schema), defaultValues: { email: "", password: "", confirmPassword: "" } });
  const contactForm = useForm<z.infer<typeof contactSchema>>({ resolver: zodResolver(contactSchema), defaultValues: { fullName: "", phoneNumber: "", gymName: "", city: "", message: "" } });

  const { data: tiers = [], isLoading: loadingTiers } = useQuery<any[]>({
    queryKey: ["public", "platform-tiers"],
    queryFn: () => apiFetch("/public/platform-tiers"),
  });

  const { data: pageContent } = useQuery<any>({
    queryKey: ["public", "platform-page"],
    queryFn: () => apiFetch("/public/platform-page"),
  });

  const registerMutation = useMutation({
    mutationFn: (data: any) => apiFetch("/public/register-gym", { method: "POST", data }),
    onSuccess: (data: any) => {
      localStorage.setItem("qawi_token", data.token);
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      toast.success(lang === "ar" ? "مرحباً بك في قوي! بدأت تجربتك المجانية 🎉" : "Welcome to Qawi! Your 14-day trial has started 🎉", { duration: 5000 });
      setLocation("/admin/dashboard");
    },
    onError: (error: any) => toast.error(lang === "ar" ? error.messageAr : error.error),
  });

  const contactMutation = useMutation({
    mutationFn: (data: any) => apiFetch("/public/contact", { method: "POST", data }),
    onSuccess: (data: any) => {
      setContactSuccess(true);
      toast.success(lang === "ar" ? data.messageAr : data.message);
      setTimeout(() => { setContactOpen(false); setContactSuccess(false); contactForm.reset(); }, 3000);
    },
    onError: (error: any) => toast.error(lang === "ar" ? error.messageAr : error.error),
  });

  const onStep1Submit = (data: z.infer<typeof step1Schema>) => { setFormData((prev: any) => ({ ...prev, ...data })); setStep(2); };
  const onStep2Submit = (data: z.infer<typeof step2Schema>) => { setFormData((prev: any) => ({ ...prev, ...data })); setStep(3); };
  const onPlanSelect = (plan: string) => {
    registerMutation.mutate({ gymName: formData.gymName, adminName: formData.adminName, adminEmail: formData.email, adminPassword: formData.password, subscriptionPlan: plan });
  };
  const submitContact = (data: z.infer<typeof contactSchema>) => contactMutation.mutate(data);

  const pageTitle = lang === "ar" ? pageContent?.titleAr : pageContent?.title;
  const pageSubtitle = lang === "ar" ? pageContent?.subtitleAr : pageContent?.subtitle;
  const pageFooter = lang === "ar" ? pageContent?.footerTextAr : pageContent?.footerText;

  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-4 right-4 rtl:left-4 rtl:right-auto">
        <button onClick={() => setLang(lang === "ar" ? "en" : "ar")} className="glass-card px-4 py-2 rounded-full text-sm font-semibold tracking-wider hover:bg-white/5 transition-colors">{lang === "ar" ? "EN" : "AR"}</button>
      </div>

      <div className={cn("glass-card w-full p-8 border-primary/20 relative z-10", step === 3 ? "max-w-5xl" : "max-w-md")}>
        <div className="text-center mb-8">
          {lang === "ar"
            ? <h1 className="text-4xl font-bold text-primary mb-2 tracking-tight" style={{ textShadow: '0 0 20px rgba(34,197,94,0.3)', fontFamily: '"Noto Kufi Arabic", "Tajawal", system-ui, sans-serif' }}>قوي</h1>
            : <h1 className="text-4xl font-bold text-primary mb-2 tracking-tight" style={{ textShadow: '0 0 20px rgba(34,197,94,0.3)', letterSpacing: '0.08em' }}>Qawi</h1>}
          <p className="text-muted-foreground">{t("auth.register")}</p>
          <div className="flex justify-center items-center gap-2 mt-6">
            {[1, 2, 3].map(i => <div key={i} className={cn("h-2 rounded-full transition-all duration-300", step >= i ? "w-8 bg-primary" : "w-2 bg-white/10")} />)}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Form {...form1}>
                <form onSubmit={form1.handleSubmit(onStep1Submit)} className="space-y-4">
                  <FormField control={form1.control} name="gymName" render={({ field }) => <FormItem><FormLabel>{t("common.gymName")}</FormLabel><FormControl><Input {...field} className="bg-black/20" /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form1.control} name="adminName" render={({ field }) => <FormItem><FormLabel>{t("common.adminName")}</FormLabel><FormControl><Input {...field} className="bg-black/20" /></FormControl><FormMessage /></FormItem>} />
                  <Button type="submit" className="w-full h-12 mt-6">{t("common.next")}</Button>
                </form>
              </Form>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Form {...form2}>
                <form onSubmit={form2.handleSubmit(onStep2Submit)} className="space-y-4">
                  <FormField control={form2.control} name="email" render={({ field }) => <FormItem><FormLabel>{t("common.email")}</FormLabel><FormControl><Input {...field} type="email" className="bg-black/20" /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form2.control} name="password" render={({ field }) => (
                    <FormItem><FormLabel>{t("common.password")}</FormLabel><FormControl>
                      <div className="relative">
                        <Input {...field} type={showPassword ? "text" : "password"} className="bg-black/20 pr-10 rtl:pl-10 rtl:pr-3" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-muted-foreground rtl:left-3 rtl:right-auto">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                      </div>
                    </FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form2.control} name="confirmPassword" render={({ field }) => <FormItem><FormLabel>{t("common.confirmPassword")}</FormLabel><FormControl><Input {...field} type={showPassword ? "text" : "password"} className="bg-black/20" /></FormControl><FormMessage /></FormItem>} />
                  <div className="flex gap-3 mt-6">
                    <Button type="button" variant="outline" onClick={() => setStep(1)} className="h-12 w-full">{t("common.back")}</Button>
                    <Button type="submit" className="w-full h-12">{t("common.next")}</Button>
                  </div>
                </form>
              </Form>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              {/* Header */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-1">{pageTitle || (lang === "ar" ? "اختر خطتك" : "Choose Your Plan")}</h2>
                <p className="text-muted-foreground text-sm">{pageSubtitle || (lang === "ar" ? "جميع الخطط تشمل تجربة مجانية 14 يوماً" : "All plans include a 14-day free trial")}</p>
              </div>

              {/* Trial badge */}
              <div className="flex justify-center mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
                  <CheckCircle2 size={16} />
                  {lang === "ar" ? "تجربة مجانية لمدة 14 يوماً — بدون بطاقة ائتمان" : "14-day free trial — no credit card required"}
                </div>
              </div>

              {/* Duration Toggle */}
              <div className="flex justify-center mb-8">
                <div className="inline-flex items-center gap-1 bg-white/5 rounded-full p-1 border border-white/10">
                  {DURATIONS.map((d) => {
                    const saving = tiers[0] ? getSavingBadge(tiers[0], d.key, lang) : null;
                    return (
                      <button
                        key={d.key}
                        onClick={() => setDuration(d.key)}
                        className={cn(
                          "relative px-4 py-2 rounded-full text-sm font-semibold transition-all",
                          duration === d.key
                            ? "bg-primary text-black shadow-[0_0_12px_rgba(34,197,94,0.4)]"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {lang === "ar" ? d.labelAr : d.labelEn}
                        {saving && (
                          <span className={cn(
                            "absolute -top-2 -right-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold",
                            duration === d.key ? "bg-black text-primary" : "bg-primary text-black"
                          )}>
                            {saving}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Plan cards */}
              {loadingTiers ? (
                <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                  {tiers.map((tier: any) => {
                    const price = getPriceForDuration(tier, duration);
                    const saving = getSavingBadge(tier, duration, lang);
                    const name = lang === "ar" ? (tier.nameAr || tier.name) : tier.name;
                    const features: string[] = lang === "ar" ? (tier.featuresAr ?? []) : (tier.features ?? []);

                    return (
                      <div key={tier.id} className={cn(
                        "relative glass-card p-6 flex flex-col border transition-all",
                        tier.highlighted
                          ? "border-primary scale-[1.03] shadow-[0_0_30px_rgba(34,197,94,0.15)]"
                          : "border-white/5 hover:border-primary/50"
                      )}>
                        {tier.highlighted && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary text-black px-3 py-1 text-xs font-bold flex items-center gap-1">
                            <Star size={10} fill="black" />
                            {lang === "ar" ? "الأكثر شيوعاً" : "Most Popular"}
                          </div>
                        )}
                        {saving && (
                          <div className="absolute top-4 right-4 rounded-full bg-green-500/15 text-green-400 border border-green-500/30 px-2 py-0.5 text-xs font-bold">
                            {saving}
                          </div>
                        )}

                        <h3 className="text-lg font-bold mb-1">{name}</h3>
                        <div className="flex items-baseline gap-1 mb-1">
                          <span className="text-4xl font-extrabold text-primary">{price}</span>
                          <span className="text-muted-foreground text-sm">JOD</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-4">
                          {lang === "ar" ? `لـ ${DURATIONS.find(d => d.key === duration)?.labelAr}` : `for ${DURATIONS.find(d => d.key === duration)?.labelEn}`}
                        </p>

                        <ul className="space-y-2 mb-6 flex-1">
                          {features.map((f, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <Check size={14} className="text-primary shrink-0 mt-0.5" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>

                        <Button
                          onClick={() => onPlanSelect(tier.subscriptionPlan)}
                          disabled={registerMutation.isPending}
                          className={cn("w-full", tier.highlighted ? "glow-hover" : "")}
                          variant={tier.highlighted ? "default" : "outline"}
                        >
                          {registerMutation.isPending
                            ? <Loader2 className="animate-spin h-4 w-4" />
                            : (lang === "ar" ? "ابدأ تجربتك المجانية" : "Start Free Trial")}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Footer */}
              {pageFooter && (
                <p className="text-center text-xs text-muted-foreground mt-6">{pageFooter}</p>
              )}

              <div className="mt-4 text-center">
                <button
                  onClick={() => setContactOpen(true)}
                  className="text-primary text-sm hover:underline"
                >
                  {lang === "ar" ? "هل تحتاج خطة مخصصة؟ تواصل معنا" : "Need a custom plan? Contact us"}
                </button>
              </div>

              <div className="mt-4 text-center">
                <button onClick={() => setStep(2)} className="text-muted-foreground text-sm hover:text-foreground flex items-center gap-1 mx-auto">
                  <ArrowLeft size={14} className="rtl:rotate-180" />
                  {t("common.back")}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {step !== 3 && (
          <div className="mt-8 text-center">
            <Link href="/login" className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors text-sm">
              <ArrowLeft size={16} className="mr-2 rtl:rotate-180 rtl:ml-2 rtl:mr-0" />
              {t("auth.login")}
            </Link>
          </div>
        )}
      </div>

      {/* Contact Dialog */}
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="glass-card border-white/10 sm:max-w-lg">
          <DialogHeader><DialogTitle>{lang === "ar" ? "تواصل معنا" : "Get in Touch"}</DialogTitle></DialogHeader>
          {contactSuccess ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-4 h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center text-primary"><CheckCircle2 size={34} /></div>
              <div className="text-lg font-semibold">{lang === "ar" ? "شكراً! سنتصل بك قريباً 📞" : "Thank you! We will call you soon 📞"}</div>
            </div>
          ) : (
            <Form {...contactForm}>
              <form onSubmit={contactForm.handleSubmit(submitContact)} className="space-y-4">
                <FormField control={contactForm.control} name="fullName" render={({ field }) => <FormItem><FormLabel>{lang === "ar" ? "الاسم الكامل" : "Full Name"}</FormLabel><FormControl><Input {...field} className="bg-black/20" /></FormControl><FormMessage /></FormItem>} />
                <FormField control={contactForm.control} name="phoneNumber" render={({ field }) => <FormItem><FormLabel>{lang === "ar" ? "رقم الهاتف" : "Phone Number"}</FormLabel><FormControl><Input {...field} className="bg-black/20" placeholder="+9627XXXXXXXX" /></FormControl><FormMessage /></FormItem>} />
                <FormField control={contactForm.control} name="gymName" render={({ field }) => <FormItem><FormLabel>{lang === "ar" ? "اسم الصالة" : "Gym Name"}</FormLabel><FormControl><Input {...field} className="bg-black/20" /></FormControl><FormMessage /></FormItem>} />
                <FormField control={contactForm.control} name="city" render={({ field }) => <FormItem><FormLabel>{lang === "ar" ? "المدينة" : "City"}</FormLabel><FormControl><Input {...field} className="bg-black/20" /></FormControl><FormMessage /></FormItem>} />
                <FormField control={contactForm.control} name="message" render={({ field }) => <FormItem><FormLabel>{lang === "ar" ? "رسالة" : "Message"}</FormLabel><FormControl><Textarea {...field} className="bg-black/20 min-h-24" placeholder={lang === "ar" ? "رسالتك..." : "Your message..."} /></FormControl><FormMessage /></FormItem>} />
                <Button type="submit" className="w-full" disabled={contactMutation.isPending}>
                  {contactMutation.isPending ? <Loader2 className="animate-spin h-4 w-4" /> : (lang === "ar" ? "إرسال" : "Send")}
                </Button>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
    </div>
  );
}
