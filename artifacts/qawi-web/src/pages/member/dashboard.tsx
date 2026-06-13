import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { useGymConfig } from '@/hooks/use-gym-config';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Zap, Calendar, Award, CheckCircle2, LogIn, LogOut, Moon,
  Play, ChevronDown, ChevronUp, Dumbbell, UtensilsCrossed,
  TrendingUp, Bell, Clock, Plus, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

function StatCard({ icon: Icon, value, label, color = 'text-primary' }: {
  icon: any; value: number | string; label: string; color?: string;
}) {
  return (
    <div className="glass-card p-4 sm:p-5 flex flex-col items-center gap-2 text-center">
      <Icon size={20} className={color} />
      <span className="text-2xl sm:text-3xl font-extrabold text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function WorkoutDayRow({ day, lang }: { day: any; lang: string }) {
  const [open, setOpen] = useState(false);
  const exercises: any[] = day.exercises ?? [];
  const canExpand = !day.restDay && exercises.length > 0;
  const label = lang === 'ar' ? (day.dayNameAr ?? day.dayName) : day.dayName;
  const dateStr = (day.date ?? '').slice(0, 10);

  return (
    <div className="border border-white/5 rounded-xl overflow-hidden">
      <button
        onClick={() => canExpand && setOpen(o => !o)}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3 transition-colors',
          canExpand ? 'hover:bg-white/5 cursor-pointer' : 'cursor-default'
        )}
      >
        <div className="flex flex-col items-start gap-0.5">
          <span className="font-semibold text-foreground text-sm">{label || dateStr}</span>
          <span className="text-xs text-muted-foreground">{dateStr}</span>
        </div>
        <div className="flex items-center gap-2">
          {day.restDay ? (
            <span className="text-xs bg-white/10 text-muted-foreground px-2 py-0.5 rounded-full">Rest</span>
          ) : (
            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-semibold">
              {exercises.length} ex
            </span>
          )}
          {canExpand && (open ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />)}
        </div>
      </button>
      {open && canExpand && (
        <div className="border-t border-white/5 px-4 py-3 flex flex-col gap-2">
          {exercises.map((ex: any, idx: number) => {
            const name = (lang === 'ar' ? ex.nameAr : ex.name) || ex.name || '—';
            const detail = [
              ex.sets != null && ex.reps != null ? `${ex.sets} × ${ex.reps}` : null,
              ex.weight != null ? `${ex.weight} kg` : null,
            ].filter(Boolean).join('  •  ');
            return (
              <div key={ex.id ?? idx} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-primary text-[10px] font-bold">{idx + 1}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{name}</p>
                  {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <PageWrapper>
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-36" />
          <div className="grid grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-36" />)}
          </div>
        </div>
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    </PageWrapper>
  );
}

export default function MemberDashboard() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const { features } = useGymConfig();
  const qc = useQueryClient();
  const isAr = lang === 'ar';
  const [planName, setPlanName] = useState('');

  const stats = useQuery<any>({
    queryKey: ['member', 'stats'],
    queryFn: () => apiFetch('/attendance/me/stats').catch(() => null),
  });
  const today = useQuery<any>({
    queryKey: ['member', 'today'],
    queryFn: () => apiFetch('/member/workouts/today').catch(() => null),
  });
  const upcoming = useQuery<any[]>({
    queryKey: ['member', 'upcoming'],
    queryFn: () => apiFetch<any[]>('/member/workouts/upcoming').catch(() => []),
  });
  const nutritionToday = useQuery<any>({
    queryKey: ['member', 'nutrition-today'],
    queryFn: () => features.nutritionEnabled
      ? apiFetch(`/nutrition/v3/log/today/${user?.id}`).catch(() => null)
      : Promise.resolve(null),
    enabled: features.nutritionEnabled && !!user?.id,
  });

  const completeDay = useMutation({
    mutationFn: (dayId: string) =>
      apiFetch(`/workouts/days/${dayId}/complete`, { method: 'PUT' }),
    onSuccess: () => {
      toast.success(isAr ? '💪 أحسنت! تم حفظ التمرين.' : '💪 Workout marked complete!');
      qc.invalidateQueries({ queryKey: ['member'] });
    },
    onError: (e: any) => {
      toast.error(e?.body?.error ?? (isAr ? 'حدث خطأ' : 'Something went wrong'));
    },
  });

  const createPlan = useMutation({
    mutationFn: () => {
      const start = new Date().toISOString().slice(0, 10);
      const end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      return apiFetch('/workouts', {
        method: 'POST',
        data: {
          name: planName.trim() || (isAr ? 'خطتي التدريبية' : 'My Training Plan'),
          memberId: user?.id,
          startDate: start,
          endDate: end,
        },
      });
    },
    onSuccess: () => {
      toast.success(isAr ? '✅ تم إنشاء الخطة بنجاح!' : '✅ Plan created!');
      setPlanName('');
      qc.invalidateQueries({ queryKey: ['member'] });
    },
    onError: (e: any) => {
      toast.error(e?.body?.error ?? (isAr ? 'فشل في إنشاء الخطة' : 'Failed to create plan'));
    },
  });

  const checkinMut = useMutation({
    mutationFn: (type: 'checkin' | 'checkout') =>
      apiFetch(`/attendance/me/${type}`, { method: 'POST' }),
    onSuccess: (_, type) => {
      toast.success(type === 'checkin'
        ? (isAr ? '✅ تم تسجيل الدخول!' : '✅ Checked in!')
        : (isAr ? '👋 تم تسجيل الخروج!' : '👋 Checked out!'));
      qc.invalidateQueries({ queryKey: ['member'] });
    },
    onError: (e: any) => {
      toast.error(e?.body?.error ?? (isAr ? 'حدث خطأ' : 'Something went wrong'));
    },
  });

  const checkedIn = !!stats.data?.checkedInToday;
  const checkedOut = !!stats.data?.checkedOutToday;
  const checkedOutAt: string | undefined = stats.data?.checkedOutAt;
  const firstName = user?.name?.split(' ')[0] ?? '';
  const { gymName } = useGymConfig();

  const formatTime = (iso?: string) => {
    if (!iso) return '';
    try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
  };

  const hour = new Date().getHours();
  const greeting = isAr
    ? (hour < 12 ? 'صباح الخير' : hour < 18 ? 'مساء الخير' : 'مساء النور')
    : (hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening');

  if (stats.isLoading && today.isLoading) return <DashboardSkeleton />;

  const caloriesLeft = features.nutritionEnabled && nutritionToday.data
    ? Math.max(0, (nutritionToday.data.targets?.calories ?? 0) - (nutritionToday.data.totals?.calories ?? 0))
    : null;

  return (
    <PageWrapper>
      {/* Header */}
      <div className="mb-8">
        <p className="text-muted-foreground text-sm mb-1">{greeting} 👋</p>
        <h1 className="text-3xl font-extrabold text-foreground">{firstName}</h1>
        {gymName && <p className="text-primary text-sm font-medium mt-1">{gymName}</p>}
      </div>

      {/* Check-in + Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Check-in card */}
        <div className="glass-card p-6 flex flex-col items-center justify-center gap-4 text-center">
          <div className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center',
            checkedOut ? 'bg-muted/30' : checkedIn ? 'bg-primary/20' : 'bg-white/10'
          )}>
            {checkedOut
              ? <LogOut size={30} className="text-muted-foreground" />
              : checkedIn
              ? <CheckCircle2 size={30} className="text-primary" />
              : <LogIn size={30} className="text-foreground" />}
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">
              {checkedOut
                ? (isAr ? `خرجت الساعة ${formatTime(checkedOutAt)}` : `Checked out at ${formatTime(checkedOutAt)}`)
                : checkedIn
                ? (isAr ? 'أنت داخل الصالة 💪' : "You're in the gym 💪")
                : (isAr ? 'سجّل دخولك اليوم' : 'Check in today')}
            </p>
            {!!stats.data?.streak && !checkedOut && (
              <p className="text-xs text-muted-foreground mt-1">
                🔥 {stats.data.streak} {isAr ? 'يوم متواصل' : 'day streak'}
              </p>
            )}
          </div>
          {!checkedIn && (
            <Button
              className="w-full max-w-xs"
              onClick={() => checkinMut.mutate('checkin')}
              disabled={checkinMut.isPending}
            >
              <LogIn size={16} className="mr-2 rtl:ml-2 rtl:mr-0" />
              {isAr ? 'تسجيل الدخول' : 'Check In'}
            </Button>
          )}
          {checkedIn && !checkedOut && (
            <Button
              variant="outline"
              className="w-full max-w-xs"
              onClick={() => checkinMut.mutate('checkout')}
              disabled={checkinMut.isPending}
            >
              <LogOut size={16} className="mr-2 rtl:ml-2 rtl:mr-0" />
              {isAr ? 'إنهاء اليوم' : 'End Session'}
            </Button>
          )}
        </div>

        {/* Stats mini grid */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={Zap}
            value={stats.data?.streak ?? 0}
            label={isAr ? 'التسلسل' : 'Streak'}
          />
          <StatCard
            icon={Calendar}
            value={stats.data?.thisWeek ?? 0}
            label={isAr ? 'هذا الأسبوع' : 'This Week'}
          />
          <StatCard
            icon={Award}
            value={stats.data?.totalDays ?? 0}
            label={isAr ? 'إجمالي' : 'Total'}
          />
        </div>
      </div>

      {/* Quick summary cards row */}
      {features.nutritionEnabled && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {caloriesLeft !== null && (
            <div className="glass-card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                <UtensilsCrossed size={20} className="text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{isAr ? 'سعرات متبقية' : 'Calories Left'}</p>
                <p className="text-xl font-bold text-foreground">{caloriesLeft} kcal</p>
              </div>
            </div>
          )}
          {nutritionToday.data?.totals && (
            <div className="glass-card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                <TrendingUp size={20} className="text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{isAr ? 'بروتين اليوم' : "Today's Protein"}</p>
                <p className="text-xl font-bold text-foreground">{Math.round(nutritionToday.data.totals.protein ?? 0)}g</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Today's Workout */}
      <div className="glass-card p-4 sm:p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Dumbbell size={18} className="text-primary" />
          <h2 className="font-bold text-lg text-foreground">
            {isAr ? 'تمرين اليوم' : "Today's Workout"}
          </h2>
        </div>

        {today.isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : !today.data ? (
          <div className="text-center py-6 text-muted-foreground">
            <Moon size={36} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">{isAr ? 'لا يوجد برنامج تدريبي' : 'No workout plan assigned'}</p>
            {user?.selfTrainingEnabled ? (
              <div className="mt-4 flex flex-col items-center gap-3 max-w-xs mx-auto">
                <p className="text-xs">{isAr ? 'أنت في وضع التدريب الذاتي — أنشئ خطتك الآن' : 'You\'re in self-training mode — create your plan'}</p>
                <input
                  value={planName}
                  onChange={e => setPlanName(e.target.value)}
                  placeholder={isAr ? 'اسم الخطة (اختياري)' : 'Plan name (optional)'}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
                  onKeyDown={e => e.key === 'Enter' && !createPlan.isPending && createPlan.mutate()}
                />
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => createPlan.mutate()}
                  disabled={createPlan.isPending}
                >
                  {createPlan.isPending
                    ? <Loader2 size={14} className="animate-spin mr-2" />
                    : <Plus size={14} className="mr-2 rtl:ml-2 rtl:mr-0" />}
                  {isAr ? 'إنشاء خطة تدريبية' : 'Create Training Plan'}
                </Button>
              </div>
            ) : (
              <p className="text-xs mt-1">{isAr ? 'تواصل مع مدربك لإنشاء برنامج' : 'Contact your coach to set up a plan'}</p>
            )}
          </div>
        ) : today.data.restDay ? (
          <div className="text-center py-8">
            <Moon size={36} className="mx-auto mb-3 text-primary opacity-60" />
            <p className="font-bold text-foreground text-lg">{isAr ? 'يوم راحة 😴' : 'Rest Day 😴'}</p>
            <p className="text-muted-foreground text-sm mt-1">{isAr ? 'استرح واسترجع طاقتك!' : 'Rest up and recover!'}</p>
          </div>
        ) : today.data.isCompleted ? (
          <div className="text-center py-8">
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={32} className="text-primary" />
            </div>
            <p className="font-bold text-foreground text-lg">{isAr ? 'أنهيت تمرين اليوم 💪' : "You crushed today's workout 💪"}</p>
            <p className="text-muted-foreground text-sm mt-1">{isAr ? 'أحسنت! نراك في التمرين القادم.' : 'Great job! See you next session.'}</p>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-semibold text-foreground">
                  {(lang === 'ar' ? today.data.dayNameAr : today.data.dayName) || `Day ${today.data.dayNumber ?? ''}`}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {(today.data.exercises?.length ?? 0)} {isAr ? 'تمرين' : 'exercises'}
                </p>
              </div>
              <span className="text-xs bg-primary/20 text-primary px-3 py-1 rounded-full font-semibold">
                {isAr ? 'اليوم' : 'Today'}
              </span>
            </div>
            <div className="flex flex-col gap-2 mb-4">
              {(today.data.exercises ?? []).slice(0, 4).map((ex: any, idx: number) => {
                const name = (lang === 'ar' ? ex.nameAr : ex.name) || ex.name || '—';
                const detail = [
                  ex.sets != null && ex.reps != null ? `${ex.sets} × ${ex.reps}` : null,
                  ex.weight != null ? `${ex.weight} kg` : null,
                ].filter(Boolean).join('  •  ');
                return (
                  <div key={ex.id ?? idx} className="flex items-center gap-3 py-1">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-primary text-[10px] font-bold">{idx + 1}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{name}</p>
                      {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
                    </div>
                  </div>
                );
              })}
              {(today.data.exercises ?? []).length > 4 && (
                <p className="text-xs text-muted-foreground pl-9">
                  +{(today.data.exercises ?? []).length - 4} {isAr ? 'تمارين أخرى' : 'more exercises'}
                </p>
              )}
            </div>
            <div className="h-px bg-white/5 mb-4" />
            <Button
              className="w-full"
              onClick={() => today.data?.dayId && completeDay.mutate(today.data.dayId)}
              disabled={completeDay.isPending || !today.data?.dayId}
            >
              {completeDay.isPending
                ? <Loader2 size={16} className="mr-2 animate-spin rtl:ml-2 rtl:mr-0" />
                : <Play size={16} className="mr-2 rtl:ml-2 rtl:mr-0" />}
              {isAr ? 'إنهاء التمرين ✓' : 'Finish Workout ✓'}
            </Button>
          </div>
        )}
      </div>

      {/* Upcoming Training */}
      <div className="glass-card p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={18} className="text-primary" />
          <h2 className="font-bold text-lg text-foreground">
            {isAr ? 'التدريب القادم' : 'Upcoming Training'}
          </h2>
        </div>

        {upcoming.isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : !upcoming.data?.length ? (
          <div className="text-center py-6 text-muted-foreground">
            <Calendar size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">{isAr ? 'لا توجد تمارين قادمة' : 'No upcoming workouts'}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {(upcoming.data ?? []).slice(0, 6).map((d: any) => (
              <WorkoutDayRow key={d.dayId} day={d} lang={lang} />
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
