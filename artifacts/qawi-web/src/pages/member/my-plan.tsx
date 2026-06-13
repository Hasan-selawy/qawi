import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { Link } from 'wouter';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { pickName } from '@/lib/i18n-name';
import {
  Dumbbell, Plus, Trash2, BedDouble, X, Loader2,
  ArrowLeft, ChevronDown, ChevronUp, ChevronRight
} from 'lucide-react';

export default function MemberMyPlan() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const qc = useQueryClient();
  const isAr = lang === 'ar';

  const planList = useQuery<any[]>({
    queryKey: ['member', 'plans-list', user?.id],
    queryFn: () => apiFetch(`/workouts/member/${user?.id}`).catch(() => []),
    enabled: !!user?.id,
  });
  const activePlan: any | null = (planList.data ?? [])[0] ?? null;

  const planDetail = useQuery<any>({
    queryKey: ['member', 'plan-detail', activePlan?.id],
    queryFn: () => apiFetch(`/workouts/${activePlan.id}`),
    enabled: !!activePlan?.id,
  });

  const days: any[] = planDetail.data?.scheduleDays ?? planDetail.data?.days ?? [];

  const categories = useQuery<any[]>({
    queryKey: ['exercises', 'categories'],
    queryFn: () => apiFetch('/exercises/categories'),
  });

  const [exSearch, setExSearch] = useState('');
  const [exCategory, setExCategory] = useState('');

  const exercises = useQuery<any[]>({
    queryKey: ['exercises', 'library', exCategory, exSearch],
    queryFn: () => {
      const p = new URLSearchParams();
      if (exCategory) p.append('category', exCategory);
      if (exSearch) p.append('search', exSearch);
      return apiFetch(`/exercises/library${p.toString() ? `?${p.toString()}` : ''}`);
    },
  });

  const [activeDayId, setActiveDayId] = useState<string | null>(null);
  const [showAddDay, setShowAddDay] = useState(false);
  const [dayName, setDayName] = useState('');
  const [dayNameAr, setDayNameAr] = useState('');
  const [dayDate, setDayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isRestDay, setIsRestDay] = useState(false);

  const addDay = useMutation({
    mutationFn: () =>
      apiFetch(`/workouts/${activePlan?.id}/days`, {
        method: 'POST',
        data: {
          dayDate,
          dayName: dayName.trim() || (isRestDay ? 'Rest' : 'Workout Day'),
          dayNameAr: dayNameAr.trim() || (isRestDay ? 'يوم راحة' : 'يوم تمرين'),
          isRestDay,
        },
      }),
    onSuccess: () => {
      toast.success(isAr ? 'تم إضافة اليوم!' : 'Day added!');
      setShowAddDay(false);
      setDayName('');
      setDayNameAr('');
      setDayDate(new Date().toISOString().slice(0, 10));
      setIsRestDay(false);
      qc.invalidateQueries({ queryKey: ['member', 'plan-detail', activePlan?.id] });
    },
    onError: (e: any) => toast.error(e?.body?.error || (isAr ? 'فشل إضافة اليوم' : 'Failed to add day')),
  });

  const deleteDay = useMutation({
    mutationFn: (dayId: string) =>
      apiFetch(`/workouts/days/${dayId}`, { method: 'DELETE' }),
    onSuccess: (_d, dayId) => {
      toast.success(isAr ? 'تم حذف اليوم' : 'Day deleted');
      if (activeDayId === dayId) setActiveDayId(null);
      qc.invalidateQueries({ queryKey: ['member', 'plan-detail', activePlan?.id] });
    },
    onError: (e: any) => toast.error(e?.body?.error || (isAr ? 'فشل الحذف' : 'Failed to delete')),
  });

  const addExercise = useMutation({
    mutationFn: ({ dayId, ex }: { dayId: string; ex: any }) =>
      apiFetch(`/workouts/days/${dayId}/exercises`, {
        method: 'POST',
        data: {
          exerciseTemplateId: ex.id,
          sets: ex.defaultSets ?? 3,
          reps: ex.defaultReps ?? 10,
          targetWeight: 0,
          orderIndex: 0,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['member', 'plan-detail', activePlan?.id] });
    },
    onError: (e: any) => toast.error(e?.body?.error || (isAr ? 'فشل إضافة التمرين' : 'Failed to add exercise')),
  });

  const deleteExercise = useMutation({
    mutationFn: ({ dayId, exId }: { dayId: string; exId: string }) =>
      apiFetch(`/workouts/days/${dayId}/exercises/${exId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['member', 'plan-detail', activePlan?.id] });
    },
    onError: (e: any) => toast.error(e?.body?.error || (isAr ? 'فشل حذف التمرين' : 'Failed to remove exercise')),
  });

  const activeDay = days.find((d: any) => d.id === activeDayId);

  if (planList.isLoading || (!!activePlan?.id && planDetail.isLoading)) {
    return (
      <PageWrapper>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageHeader
        title={isAr ? 'خطتي التدريبية' : 'My Training Plan'}
        subtitle={activePlan
          ? (isAr ? (activePlan.nameAr ?? activePlan.name) : activePlan.name)
          : undefined}
        actions={
          <Link href="/member/workout">
            <Button variant="outline" size="sm" className="gap-2">
              {isAr ? <ChevronRight size={14} /> : <ArrowLeft size={14} />}
              {isAr ? 'التمرين' : 'Back'}
            </Button>
          </Link>
        }
      />

      {!activePlan ? (
        <div className="glass-card p-10 text-center max-w-sm mx-auto">
          <Dumbbell size={32} className="text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-sm text-muted-foreground mb-4">
            {isAr
              ? 'لا توجد خطة تدريب بعد. أنشئ خطة من صفحة التمرين.'
              : 'No plan yet. Create one from the Workout page.'}
          </p>
          <Link href="/member/workout">
            <Button size="sm" variant="outline">
              {isAr ? 'إنشاء خطة' : 'Create Plan'}
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* ── Left: Day list ── */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {isAr ? `${days.length} أيام` : `${days.length} day${days.length !== 1 ? 's' : ''}`}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddDay((v) => !v)}
                className="gap-1 h-7 text-xs border-primary/40 text-primary hover:bg-primary/10"
              >
                <Plus size={12} />
                {isAr ? 'إضافة يوم' : 'Add Day'}
              </Button>
            </div>

            {showAddDay && (
              <div className="glass-card p-4 border-primary/20 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Name (EN)</p>
                    <Input
                      value={dayName}
                      onChange={(e) => setDayName(e.target.value)}
                      placeholder="e.g. Chest Day"
                      className="bg-black/20 h-8 text-xs"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">الاسم (AR)</p>
                    <Input
                      value={dayNameAr}
                      onChange={(e) => setDayNameAr(e.target.value)}
                      placeholder="يوم الصدر"
                      className="bg-black/20 h-8 text-xs"
                      dir="rtl"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">{isAr ? 'التاريخ' : 'Date'}</p>
                    <Input
                      type="date"
                      value={dayDate}
                      onChange={(e) => setDayDate(e.target.value)}
                      className="bg-black/20 h-8 text-xs"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() => setIsRestDay((v) => !v)}
                      className={cn(
                        'w-full h-8 rounded-lg border text-xs font-medium transition-colors',
                        isRestDay
                          ? 'bg-orange-500/20 border-orange-500/40 text-orange-400'
                          : 'bg-black/20 border-white/10 text-muted-foreground hover:border-white/20'
                      )}
                    >
                      <BedDouble size={12} className="inline mr-1" />
                      {isRestDay
                        ? (isAr ? '✓ راحة' : '✓ Rest')
                        : (isAr ? 'يوم راحة؟' : 'Rest Day?')}
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => addDay.mutate()}
                    disabled={addDay.isPending}
                    className="flex-1 h-8"
                  >
                    {addDay.isPending
                      ? <Loader2 size={12} className="animate-spin mr-1" />
                      : <Plus size={12} className="mr-1" />}
                    {isAr ? 'إضافة' : 'Add'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowAddDay(false)} className="h-8 px-3">
                    <X size={12} />
                  </Button>
                </div>
              </div>
            )}

            {days.length === 0 && !showAddDay && (
              <div className="glass-card p-6 text-center text-sm text-muted-foreground">
                {isAr
                  ? 'لا يوجد أيام بعد. ابدأ بإضافة يوم تدريب!'
                  : 'No days yet. Add your first workout day!'}
              </div>
            )}

            {days.map((day: any) => {
              const isActive = activeDayId === day.id;
              const exCount: number = day.exercises?.length ?? 0;
              return (
                <div
                  key={day.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveDayId(isActive ? null : day.id)}
                  onKeyDown={(e) => e.key === 'Enter' && setActiveDayId(isActive ? null : day.id)}
                  className={cn(
                    'glass-card p-4 cursor-pointer transition-all border select-none',
                    isActive ? 'border-primary/50 bg-primary/5' : 'border-white/5 hover:border-white/15'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                        day.isRestDay ? 'bg-orange-500/15' : 'bg-primary/15'
                      )}>
                        {day.isRestDay
                          ? <BedDouble size={15} className="text-orange-400" />
                          : <Dumbbell size={15} className="text-primary" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground leading-tight">
                          {isAr ? (day.dayNameAr ?? day.dayName) : day.dayName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {day.dayDate?.toString().slice(0, 10)}
                          {!day.isRestDay && ` · ${exCount} ${isAr ? 'تمرين' : 'ex'}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteDay.mutate(day.id); }}
                        disabled={deleteDay.isPending}
                        className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                        aria-label="Delete day"
                      >
                        <Trash2 size={13} />
                      </button>
                      {isActive
                        ? <ChevronUp size={14} className="text-muted-foreground ml-0.5" />
                        : <ChevronDown size={14} className="text-muted-foreground ml-0.5" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Right: Exercise panel ── */}
          <div className="lg:col-span-3">
            {!activeDay ? (
              <div className="glass-card p-10 text-center flex items-center justify-center min-h-[280px]">
                <div>
                  <Dumbbell size={36} className="mx-auto mb-3 text-muted-foreground opacity-25" />
                  <p className="text-sm text-muted-foreground">
                    {isAr
                      ? 'اختر يوماً لإضافة التمارين'
                      : 'Select a day to manage its exercises'}
                  </p>
                </div>
              </div>
            ) : activeDay.isRestDay ? (
              <div className="glass-card p-10 text-center min-h-[280px] flex items-center justify-center">
                <div>
                  <BedDouble size={36} className="mx-auto mb-3 text-orange-400/40" />
                  <p className="text-sm text-muted-foreground">
                    {isAr ? 'يوم راحة — لا تمارين' : 'Rest day — no exercises'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="glass-card border-white/5 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                  <Dumbbell size={14} className="text-primary" />
                  <h3 className="text-sm font-semibold">
                    {isAr ? (activeDay.dayNameAr ?? activeDay.dayName) : activeDay.dayName}
                  </h3>
                  <span className="text-xs text-muted-foreground ml-1">
                    · {activeDay.exercises?.length ?? 0} {isAr ? 'تمرين' : 'exercises'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/5">

                  {/* Added exercises */}
                  <div className="p-4" style={{ maxHeight: 460, overflowY: 'auto' }}>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                      {isAr ? 'التمارين المضافة' : 'Added Exercises'}
                    </p>
                    {(!activeDay.exercises || activeDay.exercises.length === 0) ? (
                      <p className="text-xs text-center py-8 text-muted-foreground/60">
                        {isAr
                          ? 'لا تمارين — اختر من المكتبة ←'
                          : 'None yet — pick from the library →'}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {activeDay.exercises.map((ex: any) => (
                          <div
                            key={ex.id}
                            className="p-3 bg-black/30 rounded-xl border border-white/5 flex items-center gap-2"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate">
                                {isAr ? (ex.nameAr ?? ex.name) : ex.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {ex.sets} {isAr ? 'مجموعات' : 'sets'} × {ex.reps} {isAr ? 'تكرار' : 'reps'}
                                {ex.targetWeight ? ` · ${ex.targetWeight}kg` : ''}
                              </p>
                            </div>
                            <button
                              onClick={() => deleteExercise.mutate({ dayId: activeDay.id, exId: ex.id })}
                              className="text-muted-foreground/40 hover:text-red-400 transition-colors shrink-0"
                              aria-label="Remove exercise"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Exercise library */}
                  <div className="p-4" style={{ maxHeight: 460, overflowY: 'auto' }}>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                      {isAr ? 'مكتبة التمارين' : 'Exercise Library'}
                    </p>
                    <div className="flex gap-2 mb-3">
                      <Select
                        value={exCategory || 'all'}
                        onValueChange={(v) => setExCategory(v === 'all' ? '' : v)}
                      >
                        <SelectTrigger className="flex-1 bg-black/20 h-8 text-xs">
                          <SelectValue placeholder={isAr ? 'الفئة' : 'Category'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{isAr ? 'الكل' : 'All'}</SelectItem>
                          {categories.data?.map((c: any) => (
                            <SelectItem key={c.id ?? c.name} value={String(c.id ?? c.name)}>
                              {pickName(lang, c)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder={isAr ? 'بحث…' : 'Search…'}
                        value={exSearch}
                        onChange={(e) => setExSearch(e.target.value)}
                        className="bg-black/20 h-8 text-xs w-[100px]"
                      />
                    </div>

                    {exercises.isLoading ? (
                      <div className="space-y-1.5">
                        {[...Array(4)].map((_, i) => (
                          <Skeleton key={i} className="h-10 rounded-lg" />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {exercises.data?.map((ex: any) => {
                          const alreadyAdded = activeDay.exercises?.some(
                            (e: any) =>
                              e.exerciseTemplateId === ex.id ||
                              e.name?.toLowerCase() === ex.name?.toLowerCase()
                          );
                          return (
                            <button
                              key={ex.id}
                              disabled={alreadyAdded}
                              onClick={() =>
                                !alreadyAdded && addExercise.mutate({ dayId: activeDay.id, ex })
                              }
                              className={cn(
                                'w-full text-left p-2.5 bg-black/20 rounded-lg border border-white/5 flex items-center justify-between transition-colors',
                                alreadyAdded
                                  ? 'opacity-40 cursor-default'
                                  : 'hover:border-primary/40 hover:bg-primary/5 cursor-pointer group'
                              )}
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-medium truncate">
                                  {pickName(lang, ex)}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {ex.defaultSets ?? 3} × {ex.defaultReps ?? 10}
                                </p>
                              </div>
                              {alreadyAdded ? (
                                <span className="text-[10px] text-primary shrink-0 ml-2">✓</span>
                              ) : (
                                <Plus
                                  size={13}
                                  className="text-muted-foreground group-hover:text-primary shrink-0 ml-2 transition-colors"
                                />
                              )}
                            </button>
                          );
                        })}
                        {!exercises.data?.length && (
                          <p className="text-xs text-center py-6 text-muted-foreground">
                            {isAr ? 'لا توجد تمارين.' : 'No exercises found.'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
