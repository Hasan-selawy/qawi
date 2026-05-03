import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { useLanguage } from '@/hooks/use-language';
import { Link } from 'wouter';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { GradientAvatar } from '@/components/GradientAvatar';
import { StatusBadge, BadgeStatus } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Flame, Plus, Activity, Trash2, BedDouble, X, CheckCircle2 } from 'lucide-react';
import { format, isToday, parseISO, eachDayOfInterval } from 'date-fns';
import { toast } from 'sonner';
import { WeightChart } from '@/components/charts/WeightChart';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getSubStatus } from '@/lib/sub-status';
import { pickName } from '@/lib/i18n-name';

const DAY_EN_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_AR_FULL = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export default function MemberDetail({ id }: { id: string }) {
  const { lang } = useLanguage();

  const { data: overview, isLoading } = useQuery<any>({
    queryKey: ['coach', 'members', id, 'overview'],
    queryFn: () => apiFetch(`/coach/members/${id}/overview`),
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>;
  }

  const member = overview?.member;
  if (!member) {
    return <div className="text-center py-12 text-muted-foreground glass-card border-dashed">Member not found</div>;
  }
  const status = getSubStatus(member.subscriptionEndDate);
  const totalWorkouts = overview?.currentWorkoutPlan?.scheduleDays?.filter((d: any) => d.isCompleted).length ?? 0;

  return (
    <PageWrapper className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto">
      <div className="w-full lg:w-[320px] flex flex-col gap-6 lg:sticky lg:top-24 h-max">
        <div className="glass-card p-6 flex flex-col items-center text-center border-primary/20">
          <GradientAvatar name={member.name} size="xl" className="mb-4" />
          <h2 className="text-2xl font-bold mb-1">{member.name}</h2>
          <p className="text-muted-foreground mb-4">{member.email}</p>
          <StatusBadge status={status as BadgeStatus} label={status} className="mb-6" />

          <div className="w-full grid grid-cols-2 gap-4">
            <div className="bg-black/20 p-4 rounded-xl flex flex-col items-center">
              <Flame className="text-orange-500 mb-2" size={24} />
              <p className="text-2xl font-bold">{totalWorkouts}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div className="bg-black/20 p-4 rounded-xl flex flex-col items-center">
              <Activity className="text-primary mb-2" size={24} />
              <p className="text-2xl font-bold">{overview?.currentWorkoutPlan?.scheduleDays?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">Total Days</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <Tabs defaultValue="plan" className="w-full">
          <TabsList className="bg-black/20 w-full justify-start overflow-x-auto p-1 h-auto mb-6 flex-wrap">
            <TabsTrigger value="plan" className="py-2">Plan</TabsTrigger>
            <TabsTrigger value="measurements" className="py-2">Measurements</TabsTrigger>
            <TabsTrigger value="photos" className="py-2">Photos</TabsTrigger>
            <TabsTrigger value="attendance" className="py-2">Attendance</TabsTrigger>
            <TabsTrigger value="notes" className="py-2">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="plan" className="m-0"><PlanTab plan={overview?.currentWorkoutPlan} memberId={id} lang={lang} /></TabsContent>
          <TabsContent value="measurements" className="m-0"><MeasurementsTab memberId={id} /></TabsContent>
          <TabsContent value="photos" className="m-0"><PhotosTab memberId={id} /></TabsContent>
          <TabsContent value="attendance" className="m-0"><AttendanceTab memberId={id} /></TabsContent>
          <TabsContent value="notes" className="m-0"><NotesTab memberId={id} /></TabsContent>
        </Tabs>
      </div>
    </PageWrapper>
  );
}

function PlanTab({ plan, memberId, lang }: { plan: any; memberId: string; lang: 'en' | 'ar' }) {
  const queryClient = useQueryClient();
  const [activeDateStr, setActiveDateStr] = useState<string | null>(null);

  const { data: workoutLogs } = useQuery<any[]>({
    queryKey: ['workouts', 'logs', memberId],
    queryFn: () => apiFetch(`/workouts/logs/member/${memberId}`),
    enabled: !!plan,
  });

  const { data: categories } = useQuery<any[]>({
    queryKey: ['exercises', 'categories'],
    queryFn: () => apiFetch('/exercises/categories'),
    enabled: !!plan,
  });

  const { data: libraryExercises } = useQuery<any[]>({
    queryKey: ['exercises', 'library', 'all'],
    queryFn: () => apiFetch('/exercises/library'),
    enabled: !!plan,
  });

  const dayByDateStr = useMemo<Record<string, any>>(() => {
    const map: Record<string, any> = {};
    (plan?.scheduleDays || []).forEach((d: any) => {
      if (d.dayDate) map[String(d.dayDate).slice(0, 10)] = d;
    });
    return map;
  }, [plan]);

  const logsByExerciseId = useMemo<Record<string, any[]>>(() => {
    const map: Record<string, any[]> = {};
    (workoutLogs || []).forEach((l: any) => {
      const k = l.planExerciseId;
      (map[k] ||= []).push(l);
    });
    return map;
  }, [workoutLogs]);

  const dateRange = useMemo(() => {
    if (!plan?.startDate || !plan?.endDate) return [];
    try {
      return eachDayOfInterval({ start: parseISO(String(plan.startDate)), end: parseISO(String(plan.endDate)) });
    } catch { return []; }
  }, [plan]);

  const addDayMut = useMutation({
    mutationFn: ({ dateStr, isRestDay }: { dateStr: string; isRestDay: boolean }) => {
      const dow = parseISO(dateStr).getDay();
      return apiFetch(`/workouts/${plan.id}/days`, {
        method: 'POST',
        data: { dayDate: dateStr, dayName: DAY_EN_FULL[dow], dayNameAr: DAY_AR_FULL[dow], isRestDay },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach', 'members', memberId, 'overview'] });
      toast.success('Day added');
    },
    onError: (err: any) => toast.error(err?.error || 'Failed'),
  });

  const addExMut = useMutation({
    mutationFn: ({ dayId, data }: { dayId: string; data: any }) =>
      apiFetch(`/workouts/days/${dayId}/exercises`, { method: 'POST', data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach', 'members', memberId, 'overview'] });
      toast.success('Exercise added');
    },
    onError: (err: any) => toast.error(err?.error || 'Failed'),
  });

  if (!plan) {
    return (
      <div className="glass-card p-12 text-center border-dashed">
        <p className="text-muted-foreground mb-6">No active workout plan for this member yet.</p>
        <Link href={`/coach/plans/create?memberId=${memberId}`}>
          <Button size="lg" className="glow-hover"><Plus className="mr-2 h-4 w-4" /> Add New Plan</Button>
        </Link>
      </div>
    );
  }

  const activeDay = activeDateStr ? dayByDateStr[activeDateStr] : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 justify-between items-center bg-black/20 p-4 rounded-xl border border-white/5">
        <div>
          <h3 className="text-lg font-semibold">{plan.name}</h3>
          <p className="text-xs text-muted-foreground">
            {plan.startDate ? format(parseISO(String(plan.startDate)), 'PP') : ''} → {plan.endDate ? format(parseISO(String(plan.endDate)), 'PP') : ''}
          </p>
        </div>
        <Link href={`/coach/plans/create?memberId=${memberId}`}>
          <Button variant="outline" size="sm"><Plus className="mr-2 h-4 w-4" /> New Plan</Button>
        </Link>
      </div>

      {dateRange.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground">Plan has no date range.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {dateRange.map(date => {
            const ds = format(date, 'yyyy-MM-dd');
            const day = dayByDateStr[ds];
            const today = isToday(date);
            const dow = date.getDay();
            const exCount = day?.exercises?.length || 0;
            return (
              <button
                key={ds}
                onClick={() => setActiveDateStr(ds)}
                className={cn(
                  'text-left p-3 rounded-xl border transition-all hover:-translate-y-0.5 relative',
                  today ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-background' : '',
                  day?.isCompleted ? 'bg-primary/15 border-primary/40' :
                    day?.isRestDay ? 'bg-orange-500/10 border-orange-500/30' :
                    day && exCount > 0 ? 'bg-blue-500/10 border-blue-500/30' :
                    'bg-black/20 border-white/5 hover:border-white/20',
                )}
              >
                {today && <span className="absolute top-1 right-1 text-[9px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full font-bold">TODAY</span>}
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{lang === 'ar' ? DAY_AR_FULL[dow] : DAY_EN_FULL[dow].slice(0, 3)}</p>
                <p className="font-bold text-lg leading-tight">{format(date, 'd')}</p>
                <p className="text-[10px] text-muted-foreground">{format(date, 'MMM')}</p>
                <div className="mt-2 text-[10px] font-medium flex items-center gap-1">
                  {!day ? <span className="text-muted-foreground/60">+ Add</span> :
                    day.isRestDay ? <span className="text-orange-400">Rest</span> :
                    <span className="text-blue-400">{exCount} ex</span>}
                  {day?.isCompleted && <CheckCircle2 size={10} className="text-primary" />}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Dialog open={!!activeDateStr} onOpenChange={(o) => !o && setActiveDateStr(null)}>
        <DialogContent className="glass-card border-white/10 max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{activeDateStr ? format(parseISO(activeDateStr), 'EEEE, MMMM d') : ''}</span>
              {activeDateStr && isToday(parseISO(activeDateStr)) && (
                <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full font-bold">TODAY</span>
              )}
            </DialogTitle>
          </DialogHeader>

          {!activeDay ? (
            <div className="py-6 space-y-3 text-center">
              <p className="text-muted-foreground text-sm">No day exists yet for this date.</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => activeDateStr && addDayMut.mutate({ dateStr: activeDateStr, isRestDay: false })} disabled={addDayMut.isPending}>
                  <Plus className="mr-2 h-4 w-4" /> Add Workout Day
                </Button>
                <Button variant="outline" onClick={() => activeDateStr && addDayMut.mutate({ dateStr: activeDateStr, isRestDay: true })} disabled={addDayMut.isPending}>
                  <BedDouble className="mr-2 h-4 w-4" /> Mark as Rest Day
                </Button>
              </div>
            </div>
          ) : activeDay.isRestDay ? (
            <div className="py-12 text-center text-muted-foreground">
              <BedDouble className="h-12 w-12 mx-auto mb-3 text-orange-500/60" />
              Rest day. No exercises assigned.
            </div>
          ) : (
            <DayDetail
              day={activeDay}
              lang={lang}
              logsByExerciseId={logsByExerciseId}
              categories={categories || []}
              libraryExercises={libraryExercises || []}
              onAddExercise={(data) => addExMut.mutate({ dayId: activeDay.id, data })}
              addPending={addExMut.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DayDetail({ day, lang, logsByExerciseId, categories, libraryExercises, onAddExercise, addPending }: {
  day: any; lang: 'en' | 'ar'; logsByExerciseId: Record<string, any[]>;
  categories: any[]; libraryExercises: any[];
  onAddExercise: (data: any) => void; addPending: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [catFilter, setCatFilter] = useState('');

  const filtered = libraryExercises.filter(e => !catFilter || e.categoryId === catFilter);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{day.exercises?.length || 0} exercises assigned</p>
        {day.isCompleted && (
          <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full flex items-center gap-1">
            <CheckCircle2 size={12} /> Completed by member
          </span>
        )}
      </div>

      <div className="space-y-2 max-h-[40vh] overflow-y-auto">
        {(day.exercises || []).map((ex: any) => {
          const logs = logsByExerciseId[ex.id] || [];
          const latestLog = logs[0];
          // PlanExercise stores either a custom name OR an exerciseTemplateId — resolve
          // the template name from the library when no custom name is set.
          const template = ex.exerciseTemplateId ? libraryExercises.find((t: any) => t.id === ex.exerciseTemplateId) : null;
          const displayName = pickName(lang, ex) || pickName(lang, template) || '(unnamed exercise)';
          return (
            <div key={ex.id} className="p-3 bg-black/30 rounded-lg border border-white/5">
              <p className="font-medium text-sm">{displayName}</p>
              <p className="text-xs text-muted-foreground mt-1">Target: {ex.sets} × {ex.reps}</p>
              {latestLog ? (
                <div className="mt-2 pt-2 border-t border-white/5 text-xs flex items-center gap-2">
                  <CheckCircle2 size={12} className="text-primary" />
                  <span className="text-primary font-medium">Logged:</span>
                  <span>{latestLog.actualSets} × {latestLog.actualReps} @ {latestLog.actualWeight}kg</span>
                </div>
              ) : (
                <p className="mt-2 pt-2 border-t border-white/5 text-xs text-muted-foreground">Not logged yet</p>
              )}
            </div>
          );
        })}
        {(!day.exercises || day.exercises.length === 0) && (
          <p className="text-center text-xs text-muted-foreground py-6">No exercises yet — add one below.</p>
        )}
      </div>

      {!pickerOpen ? (
        <Button onClick={() => setPickerOpen(true)} className="w-full" variant="outline">
          <Plus className="mr-2 h-4 w-4" /> Add Exercise
        </Button>
      ) : (
        <div className="border-t border-white/5 pt-4 space-y-3">
          <div className="flex justify-between items-center">
            <Select value={catFilter || 'all'} onValueChange={v => setCatFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[200px] bg-black/20 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{pickName(lang, c)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={() => setPickerOpen(false)}><X size={14} /></Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[30vh] overflow-y-auto">
            {filtered.map((ex: any) => (
              <button
                key={ex.id}
                disabled={addPending}
                onClick={() => onAddExercise({ exerciseTemplateId: ex.id, sets: ex.defaultSets || 3, reps: ex.defaultReps || 10, targetWeight: 0, orderIndex: day.exercises?.length || 0 })}
                className="text-left p-3 bg-black/20 rounded-lg border border-white/5 hover:border-primary/40 transition-colors flex items-center justify-between group disabled:opacity-50"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight truncate">{pickName(lang, ex)}</p>
                  <p className="text-[10px] text-muted-foreground">{ex.defaultSets} × {ex.defaultReps}</p>
                </div>
                <Plus size={16} className="text-muted-foreground group-hover:text-primary shrink-0 ml-2" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MeasurementsTab({ memberId }: { memberId: string }) {
  const queryClient = useQueryClient();
  const { data: measurements, isLoading } = useQuery<any[]>({
    queryKey: ['measurements', 'member', memberId],
    queryFn: () => apiFetch(`/measurements/member/${memberId}`),
  });

  const addMeasurement = useMutation({
    mutationFn: (data: any) => apiFetch('/measurements', { method: 'POST', data: { ...data, memberId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['measurements', 'member', memberId] });
      toast.success('Measurement added');
    },
    onError: (err: any) => toast.error(err.error || 'Failed'),
  });

  if (isLoading) return <Loader2 className="animate-spin text-primary" />;

  const latest = measurements?.[0] || null;
  const chartData = measurements
    ? [...measurements].reverse().map((m: any) => ({ date: format(new Date(m.recordedAt), 'MMM d'), weight: m.weight }))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-black/20 p-4 rounded-xl border border-white/5">
        <h3 className="font-medium">Body Measurements</h3>
        <Dialog>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Add Entry</Button></DialogTrigger>
          <DialogContent className="glass-card border-white/10 max-w-2xl">
            <DialogHeader><DialogTitle>New Measurement Entry</DialogTitle></DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const data: any = {};
                fd.forEach((v, k) => { if (v) data[k] = Number(v); });
                addMeasurement.mutate(data);
              }}
              className="grid grid-cols-2 gap-4"
            >
              {[
                { f: 'weight', label: 'Weight (kg)' },
                { f: 'height', label: 'Height (cm)' },
                { f: 'bodyFatPercentage', label: 'Body Fat (%)' },
                { f: 'chest', label: 'Chest (cm)' },
                { f: 'waist', label: 'Waist (cm)' },
                { f: 'hips', label: 'Hips (cm)' },
                { f: 'arms', label: 'Arms (cm)' },
                { f: 'legs', label: 'Legs (cm)' },
              ].map(({ f, label }) => (
                <div key={f}>
                  <label className="text-xs text-muted-foreground ml-1 mb-1 block">{label}</label>
                  <Input name={f} type="number" step="0.1" className="bg-black/20" placeholder="0.0" />
                </div>
              ))}
              <Button type="submit" className="col-span-2 mt-4" disabled={addMeasurement.isPending}>Save Measurements</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Weight', value: latest?.weight, unit: 'kg' },
          { label: 'Body Fat', value: latest?.bodyFatPercentage, unit: '%' },
          { label: 'Chest', value: latest?.chest, unit: 'cm' },
          { label: 'Waist', value: latest?.waist, unit: 'cm' },
          { label: 'Hips', value: latest?.hips, unit: 'cm' },
          { label: 'Arms', value: latest?.arms, unit: 'cm' },
          { label: 'Legs', value: latest?.legs, unit: 'cm' },
          { label: 'Height', value: latest?.height, unit: 'cm' },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-4 text-center border-white/5">
            <p className="text-sm text-muted-foreground mb-2">{stat.label}</p>
            <p className="text-2xl font-bold">{stat.value != null ? `${stat.value}${stat.unit}` : '-'}</p>
          </div>
        ))}
      </div>

      <div className="glass-card p-6 border-white/5">
        <h3 className="font-semibold mb-6">Weight Progress</h3>
        <WeightChart data={chartData} />
      </div>
    </div>
  );
}

function PhotosTab({ memberId }: { memberId: string }) {
  const { data: photos, isLoading } = useQuery<any[]>({
    queryKey: ['photos', 'member', memberId],
    queryFn: () => apiFetch(`/photos/member/${memberId}`),
  });

  if (isLoading) return <Loader2 className="animate-spin text-primary" />;

  return (
    <div className="space-y-6">
      <div className="bg-black/20 p-4 rounded-xl border border-white/5">
        <h3 className="font-medium">Progress Photos</h3>
      </div>
      <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
        {photos?.map((photo: any) => (
          <div key={photo.id} className="break-inside-avoid relative group rounded-xl overflow-hidden border border-white/10">
            <img src={photo.url || photo.imageUrl} alt="Progress" className="w-full h-auto object-cover" loading="lazy" />
          </div>
        ))}
      </div>
      {(!photos || photos.length === 0) && (
        <div className="text-center py-16 text-muted-foreground glass-card border-dashed">No progress photos yet</div>
      )}
    </div>
  );
}

function AttendanceTab({ memberId }: { memberId: string }) {
  const { data: attendance, isLoading } = useQuery<any[]>({
    queryKey: ['attendance', 'member', memberId],
    queryFn: () => apiFetch(`/attendance/member/${memberId}`),
  });

  if (isLoading) return <Loader2 className="animate-spin text-primary" />;

  return (
    <div className="glass-card p-6 border-white/5">
      <h3 className="font-semibold mb-6">Recent Check-ins ({attendance?.length || 0})</h3>
      <div className="space-y-3">
        {attendance?.map((record: any) => (
          <div key={record.id} className="flex justify-between items-center p-3 bg-black/20 rounded-lg border border-white/5">
            <span className="font-medium text-sm">{format(new Date(record.checkedInAt), 'EEEE, MMMM d, yyyy • h:mm a')}</span>
            <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-500 font-medium">Checked In</span>
          </div>
        ))}
        {(!attendance || attendance.length === 0) && (
          <p className="text-center text-muted-foreground text-sm py-4">No check-in records found.</p>
        )}
      </div>
    </div>
  );
}

function NotesTab({ memberId }: { memberId: string }) {
  const queryClient = useQueryClient();
  const { data: notes, isLoading } = useQuery<any[]>({
    queryKey: ['notes', 'member', memberId],
    queryFn: () => apiFetch(`/notes/member/${memberId}`),
  });

  const addNote = useMutation({
    mutationFn: (data: any) => apiFetch('/notes', { method: 'POST', data: { ...data, memberId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', 'member', memberId] });
      toast.success('Note added');
    },
    onError: (err: any) => toast.error(err.error || 'Failed'),
  });

  const deleteNote = useMutation({
    mutationFn: (id: string) => apiFetch(`/notes/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', 'member', memberId] });
      toast.success('Note deleted');
    },
  });

  if (isLoading) return <Loader2 className="animate-spin text-primary" />;

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          addNote.mutate({ note: fd.get('note') });
          (e.target as HTMLFormElement).reset();
        }}
        className="glass-card p-4 space-y-3 border-white/5"
      >
        <Textarea name="note" placeholder="Add a new note..." required className="bg-black/20 resize-none" rows={3} />
        <div className="flex justify-end">
          <Button type="submit" disabled={addNote.isPending}>
            {addNote.isPending ? <Loader2 className="animate-spin" /> : 'Save Note'}
          </Button>
        </div>
      </form>

      <div className="space-y-4">
        {notes?.map((note: any) => (
          <div key={note.id} className="glass-card p-4 border-white/5 group">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs text-muted-foreground">{format(new Date(note.createdAt), 'PPP p')}</p>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                onClick={() => { if (confirm('Delete note?')) deleteNote.mutate(note.id); }}
              >
                <Trash2 size={14} />
              </Button>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{note.note}</p>
          </div>
        ))}
        {(!notes || notes.length === 0) && (
          <div className="text-center py-12 text-muted-foreground glass-card border-dashed">No notes yet for this member.</div>
        )}
      </div>
    </div>
  );
}
