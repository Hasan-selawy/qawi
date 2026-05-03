import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { useLanguage } from '@/hooks/use-language';
import { useLocation } from 'wouter';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Save, Plus, Trash2, BedDouble, Dumbbell, X } from 'lucide-react';
import { format, eachDayOfInterval, parseISO, isToday } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { pickName } from '@/lib/i18n-name';

type DraftExercise = {
  exerciseTemplateId: string;
  name: string;
  nameAr?: string;
  sets: number;
  reps: number;
};

type DraftDay = {
  dateStr: string;
  isRestDay: boolean;
  exercises: DraftExercise[];
};

const DAY_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export default function CreatePlan() {
  const { lang } = useLanguage();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const searchParams = new URLSearchParams(window.location.search);
  const initialMemberId = searchParams.get('memberId') || '';

  const [name, setName] = useState('');
  const [memberId, setMemberId] = useState(initialMemberId);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(Date.now() + 6 * 86400000), 'yyyy-MM-dd'));
  const [draft, setDraft] = useState<Record<string, DraftDay>>({});
  const [activeDateStr, setActiveDateStr] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: members } = useQuery<any[]>({ queryKey: ['coach', 'members'], queryFn: () => apiFetch('/coach/members') });
  const { data: categories } = useQuery<any[]>({ queryKey: ['exercises', 'categories'], queryFn: () => apiFetch('/exercises/categories') });
  const { data: exercises } = useQuery<any[]>({
    queryKey: ['exercises', 'library', categoryFilter, searchQuery],
    queryFn: () => {
      const params = new URLSearchParams();
      if (categoryFilter) params.append('category', categoryFilter);
      if (searchQuery) params.append('search', searchQuery);
      const url = params.toString() ? `/exercises/library?${params.toString()}` : '/exercises/library';
      return apiFetch(url);
    },
  });

  const dateList = useMemo(() => {
    try {
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      if (end < start) return [];
      return eachDayOfInterval({ start, end });
    } catch {
      return [];
    }
  }, [startDate, endDate]);

  const setDayRest = (dateStr: string, isRest: boolean) => {
    setDraft(prev => ({
      ...prev,
      [dateStr]: { dateStr, isRestDay: isRest, exercises: isRest ? [] : (prev[dateStr]?.exercises || []) },
    }));
  };

  const addExerciseToActive = (ex: any) => {
    if (!activeDateStr) return;
    setDraft(prev => {
      const cur = prev[activeDateStr] || { dateStr: activeDateStr, isRestDay: false, exercises: [] };
      if (cur.exercises.find(e => e.exerciseTemplateId === ex.id)) {
        toast.info('Already added');
        return prev;
      }
      return {
        ...prev,
        [activeDateStr]: {
          ...cur,
          isRestDay: false,
          exercises: [...cur.exercises, { exerciseTemplateId: ex.id, name: ex.name, nameAr: ex.nameAr, sets: ex.defaultSets || 3, reps: ex.defaultReps || 10 }],
        },
      };
    });
  };

  const updateActiveExercise = (idx: number, patch: Partial<DraftExercise>) => {
    if (!activeDateStr) return;
    setDraft(prev => {
      const cur = prev[activeDateStr];
      if (!cur) return prev;
      const next = [...cur.exercises];
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, [activeDateStr]: { ...cur, exercises: next } };
    });
  };

  const removeActiveExercise = (idx: number) => {
    if (!activeDateStr) return;
    setDraft(prev => {
      const cur = prev[activeDateStr];
      if (!cur) return prev;
      return { ...prev, [activeDateStr]: { ...cur, exercises: cur.exercises.filter((_, i) => i !== idx) } };
    });
  };

  const totalActiveDays = Object.values(draft).filter(d => !d.isRestDay && d.exercises.length > 0).length;
  const totalRestDays = Object.values(draft).filter(d => d.isRestDay).length;
  const totalExercises = Object.values(draft).reduce((sum, d) => sum + d.exercises.length, 0);

  const savePlan = async () => {
    if (!name.trim()) { toast.error('Plan name required'); return; }
    if (!memberId) { toast.error('Select a member'); return; }
    if (totalActiveDays === 0 && totalRestDays === 0) { toast.error('Add at least one day to the schedule'); return; }

    setSaving(true);
    try {
      const plan = await apiFetch('/workouts', {
        method: 'POST',
        data: { name: name.trim(), memberId, startDate, endDate },
      });

      const ordered = Object.values(draft).sort((a, b) => a.dateStr.localeCompare(b.dateStr));
      for (const d of ordered) {
        const dt = parseISO(d.dateStr);
        const dow = dt.getDay();
        const day: any = await apiFetch(`/workouts/${plan.id}/days`, {
          method: 'POST',
          data: { dayDate: d.dateStr, dayName: DAY_EN[dow], dayNameAr: DAY_AR[dow], isRestDay: d.isRestDay },
        });
        if (!d.isRestDay) {
          for (let i = 0; i < d.exercises.length; i++) {
            const ex = d.exercises[i];
            await apiFetch(`/workouts/days/${day.id}/exercises`, {
              method: 'POST',
              data: {
                exerciseTemplateId: ex.exerciseTemplateId,
                sets: ex.sets,
                reps: ex.reps,
                targetWeight: 0,
                orderIndex: i,
              },
            });
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ['coach', 'members', memberId, 'overview'] });
      toast.success('Plan saved');
      setLocation(`/coach/members/${memberId}`);
    } catch (err: any) {
      toast.error(err?.error || err?.message || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const activeDay = activeDateStr ? draft[activeDateStr] : null;

  return (
    <PageWrapper className="max-w-7xl mx-auto">
      <PageHeader
        title="Create Workout Plan"
        actions={
          <Button onClick={savePlan} disabled={saving} className="glow-hover">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Plan
          </Button>
        }
      />

      <div className="glass-card p-6 mb-6 border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Plan Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. May Strength" className="bg-black/20" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Member</label>
            <Select value={memberId} onValueChange={setMemberId}>
              <SelectTrigger className="bg-black/20"><SelectValue placeholder="Select Member" /></SelectTrigger>
              <SelectContent>
                {members?.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Start Date</label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-black/20" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">End Date</label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-black/20" />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-4 text-xs">
          <span className="px-3 py-1 rounded-full bg-primary/15 text-primary border border-primary/20">{dateList.length} total days</span>
          <span className="px-3 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20">{totalActiveDays} workout days</span>
          <span className="px-3 py-1 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/20">{totalRestDays} rest days</span>
          <span className="px-3 py-1 rounded-full bg-white/5 text-muted-foreground border border-white/10">{totalExercises} exercises</span>
        </div>
      </div>

      <div className="glass-card p-6 border-white/5">
        <h3 className="font-semibold mb-4">Schedule — click any date to add exercises or mark as rest</h3>
        {dateList.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">Pick a valid date range above.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {dateList.map(date => {
              const ds = format(date, 'yyyy-MM-dd');
              const d = draft[ds];
              const today = isToday(date);
              const dow = date.getDay();
              return (
                <button
                  key={ds}
                  onClick={() => setActiveDateStr(ds)}
                  className={cn(
                    'text-left p-3 rounded-xl border transition-all hover:-translate-y-0.5',
                    today ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-background' : '',
                    d?.isRestDay ? 'bg-white/5 border-white/10 opacity-70' :
                      d && d.exercises.length > 0 ? 'bg-primary/15 border-primary/40' :
                      'bg-black/20 border-white/5 hover:border-white/20',
                  )}
                >
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{lang === 'ar' ? DAY_AR[dow] : DAY_EN[dow].slice(0, 3)}</p>
                  <p className="font-bold text-lg leading-tight">{format(date, 'd')}</p>
                  <p className="text-[10px] text-muted-foreground">{format(date, 'MMM')}</p>
                  <div className="mt-2 text-[10px] font-medium">
                    {d?.isRestDay ? <span className="text-muted-foreground">😴 Rest</span> :
                      d?.exercises.length ? <span className="text-primary">{d.exercises.length} ex</span> :
                      <span className="text-muted-foreground/60">—</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!activeDateStr} onOpenChange={(o) => !o && setActiveDateStr(null)}>
        <DialogContent className="glass-card border-white/10 max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="flex items-center justify-between">
              <span>{activeDateStr ? format(parseISO(activeDateStr), 'EEEE, MMMM d') : ''}</span>
              <Button
                variant={activeDay?.isRestDay ? 'default' : 'outline'}
                size="sm"
                onClick={() => activeDateStr && setDayRest(activeDateStr, !activeDay?.isRestDay)}
                className={activeDay?.isRestDay ? 'bg-orange-500 hover:bg-orange-600' : ''}
              >
                <BedDouble className="mr-2 h-4 w-4" /> {activeDay?.isRestDay ? 'Rest Day ✓' : 'Mark as Rest Day'}
              </Button>
            </DialogTitle>
          </DialogHeader>

          {activeDay?.isRestDay ? (
            <div className="px-6 py-12 text-center text-muted-foreground">
              <BedDouble className="h-12 w-12 mx-auto mb-3 text-orange-500/60" />
              This day is marked as a rest day. No exercises will be assigned.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
              <div className="lg:col-span-2 border-r border-white/5 p-6 max-h-[70vh] overflow-y-auto">
                <h4 className="font-semibold mb-3 text-sm">Selected exercises ({activeDay?.exercises.length || 0})</h4>
                {!activeDay?.exercises.length ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">No exercises yet. Pick from the library →</p>
                ) : (
                  <div className="space-y-2">
                    {activeDay.exercises.map((ex, idx) => (
                      <div key={idx} className="p-3 bg-black/30 rounded-lg border border-white/5">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-sm font-medium leading-tight">{lang === 'ar' ? (ex.nameAr || ex.name) : ex.name}</p>
                          <button onClick={() => removeActiveExercise(idx)} className="text-muted-foreground hover:text-destructive">
                            <X size={14} />
                          </button>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <Input type="number" value={ex.sets} onChange={e => updateActiveExercise(idx, { sets: Number(e.target.value) })} className="h-7 w-14 bg-black/40 text-center text-xs" />
                          <span className="text-muted-foreground">×</span>
                          <Input type="number" value={ex.reps} onChange={e => updateActiveExercise(idx, { reps: Number(e.target.value) })} className="h-7 w-14 bg-black/40 text-center text-xs" />
                          <span className="text-muted-foreground">reps</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="lg:col-span-3 p-6 max-h-[70vh] overflow-y-auto">
                <div className="flex gap-2 mb-3">
                  <Select value={categoryFilter || 'all'} onValueChange={v => setCategoryFilter(v === 'all' ? '' : v)}>
                    <SelectTrigger className="w-[180px] bg-black/20 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories?.map((c: any) => <SelectItem key={c.id} value={c.id}>{pickName(lang, c)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Search…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-black/20 h-9" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {exercises?.map((ex: any) => (
                    <button
                      key={ex.id}
                      onClick={() => addExerciseToActive(ex)}
                      className="text-left p-3 bg-black/20 rounded-lg border border-white/5 hover:border-primary/40 transition-colors flex items-center justify-between group"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-tight truncate">{pickName(lang, ex)}</p>
                        <p className="text-[10px] text-muted-foreground">{ex.defaultSets} × {ex.defaultReps}</p>
                      </div>
                      <Plus size={16} className="text-muted-foreground group-hover:text-primary shrink-0 ml-2" />
                    </button>
                  ))}
                  {!exercises?.length && <p className="col-span-2 text-xs text-center py-6 text-muted-foreground">No exercises match.</p>}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
