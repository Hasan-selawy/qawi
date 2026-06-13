import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Dumbbell, ChevronDown, ChevronUp, CheckCircle2,
  Moon, Calendar, Plus, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

function WorkoutDayCard({ day, lang, onComplete }: { day: any; lang: string; onComplete?: () => void }) {
  const [open, setOpen] = useState(false);
  const exercises: any[] = day.exercises ?? [];
  const isAr = lang === 'ar';
  const label = isAr ? (day.dayNameAr ?? day.dayName) : day.dayName;
  const dateStr = (day.date ?? '').slice(0, 10);
  const isDone = day.completed;
  const isRest = day.restDay;
  const canExpand = !isRest && exercises.length > 0;

  return (
    <div className={cn(
      'rounded-xl overflow-hidden border transition-colors',
      isDone ? 'border-primary/30 bg-primary/5' : 'border-white/5 bg-white/2'
    )}>
      <button
        onClick={() => canExpand && setOpen(o => !o)}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3 text-left rtl:text-right',
          canExpand ? 'hover:bg-white/5 cursor-pointer' : 'cursor-default'
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
            isDone ? 'bg-primary/20' : isRest ? 'bg-muted/20' : 'bg-white/10'
          )}>
            {isDone
              ? <CheckCircle2 size={18} className="text-primary" />
              : isRest
              ? <Moon size={18} className="text-muted-foreground" />
              : <Dumbbell size={18} className="text-foreground" />}
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">{label || dateStr}</p>
            <p className="text-xs text-muted-foreground">{dateStr}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isDone && (
            <span className="text-[10px] font-semibold text-primary bg-primary/15 px-2 py-0.5 rounded-full">
              {isAr ? 'مكتمل' : 'Done'}
            </span>
          )}
          {!isRest && !isDone && exercises.length > 0 && (
            <span className="text-[10px] font-medium text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full">
              {exercises.length} {isAr ? 'تمرين' : 'ex'}
            </span>
          )}
          {!isRest && !isDone && onComplete && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 px-2 border-primary/40 text-primary hover:bg-primary/10"
              onClick={e => { e.stopPropagation(); onComplete(); }}
            >
              {isAr ? 'إنهاء ✓' : 'Finish ✓'}
            </Button>
          )}
          {canExpand && (open
            ? <ChevronUp size={16} className="text-muted-foreground" />
            : <ChevronDown size={16} className="text-muted-foreground" />)}
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

function WorkoutSkeleton() {
  return (
    <PageWrapper>
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-6 w-72" />
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}
      </div>
    </PageWrapper>
  );
}

export default function MemberWorkout() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const qc = useQueryClient();
  const isAr = lang === 'ar';
  const [planName, setPlanName] = useState('');

  const plan = useQuery<any>({
    queryKey: ['member', 'workout-plan', user?.id],
    queryFn: () => user?.id ? apiFetch(`/workouts/member/${user.id}`).catch(() => null) : null,
    enabled: !!user?.id,
  });

  const upcoming = useQuery<any[]>({
    queryKey: ['member', 'upcoming'],
    queryFn: () => apiFetch<any[]>('/member/workouts/upcoming').catch(() => []),
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
      toast.success(isAr ? '✅ تم إنشاء الخطة!' : '✅ Plan created!');
      setPlanName('');
      qc.invalidateQueries({ queryKey: ['member'] });
    },
    onError: (e: any) => {
      toast.error(e?.body?.error ?? (isAr ? 'فشل في إنشاء الخطة' : 'Failed to create plan'));
    },
  });

  if (plan.isLoading) return <WorkoutSkeleton />;

  const currentPlan = plan.data;
  const scheduleDays: any[] = currentPlan?.scheduleDays ?? [];
  const upcomingDays: any[] = upcoming.data ?? [];

  return (
    <PageWrapper>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <Dumbbell size={26} className="text-primary" />
          <h1 className="text-3xl font-extrabold text-foreground">
            {isAr ? 'خطة التدريب' : 'My Workout'}
          </h1>
        </div>
        {currentPlan && (
          <p className="text-muted-foreground text-sm">
            {isAr ? (currentPlan.nameAr ?? currentPlan.name) : currentPlan.name}
          </p>
        )}
      </div>

      {!currentPlan ? (
        /* No plan — create one */
        <div className="glass-card p-8 flex flex-col items-center gap-5 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center">
            <Dumbbell size={28} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground mb-1">
              {isAr ? 'لا توجد خطة تدريبية بعد' : 'No workout plan yet'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isAr
                ? 'أنشئ خطة تدريبية لتتبع تمارينك اليومية'
                : 'Create a training plan to track your daily workouts'}
            </p>
          </div>
          <div className="flex gap-2 w-full max-w-xs">
            <input
              className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder={isAr ? 'اسم الخطة (اختياري)' : 'Plan name (optional)'}
              value={planName}
              onChange={e => setPlanName(e.target.value)}
            />
            <Button
              onClick={() => createPlan.mutate()}
              disabled={createPlan.isPending}
            >
              {createPlan.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            </Button>
          </div>
        </div>
      ) : scheduleDays.length === 0 ? (
        /* Plan exists but no schedule days */
        <div className="space-y-6">
          <div className="glass-card p-6 text-center">
            <Calendar size={32} className="text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {isAr
                ? 'لم يتم جدولة أيام تدريب بعد. تواصل مع مدربك.'
                : 'No workout days scheduled yet. Contact your coach.'}
            </p>
          </div>

          {upcomingDays.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-foreground mb-3">
                {isAr ? 'التدريبات القادمة' : 'Upcoming Training'}
              </h2>
              <div className="flex flex-col gap-2">
                {upcomingDays.map((day: any) => (
                  <WorkoutDayCard
                    key={day.id}
                    day={day}
                    lang={lang}
                    onComplete={!day.completed ? () => completeDay.mutate(day.id) : undefined}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Full plan schedule */
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="glass-card p-4 text-center">
              <p className="text-2xl font-extrabold text-primary">{scheduleDays.length}</p>
              <p className="text-xs text-muted-foreground mt-1">{isAr ? 'أيام مجدولة' : 'Scheduled Days'}</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-2xl font-extrabold text-green-400">
                {scheduleDays.filter((d: any) => d.completed).length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{isAr ? 'مكتمل' : 'Completed'}</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-2xl font-extrabold text-foreground">
                {scheduleDays.filter((d: any) => !d.restDay && !d.completed).length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{isAr ? 'متبقي' : 'Remaining'}</p>
            </div>
          </div>

          <h2 className="text-base font-semibold text-foreground">
            {isAr ? 'جدول التدريب' : 'Training Schedule'}
          </h2>
          <div className="flex flex-col gap-2">
            {scheduleDays.map((day: any) => (
              <WorkoutDayCard
                key={day.id}
                day={day}
                lang={lang}
                onComplete={!day.completed && !day.restDay ? () => completeDay.mutate(day.id) : undefined}
              />
            ))}
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
