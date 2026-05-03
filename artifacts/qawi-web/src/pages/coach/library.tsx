import { useEffect, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { useLanguage } from '@/hooks/use-language';
import { pickName } from '@/lib/i18n-name';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Play, Search, Trash2, Pencil, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

export default function Library() {
  const { t, lang } = useLanguage();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [search, setSearch] = useState('');

  const { data: categories } = useQuery<any[]>({
    queryKey: ['exercises', 'categories'],
    queryFn: () => apiFetch('/exercises/categories'),
  });

  const { data: rawExercises, isLoading } = useQuery<any[]>({
    queryKey: ['exercises', 'library', activeCategory],
    queryFn: () =>
      activeCategory
        ? apiFetch(`/exercises/library/${activeCategory}`)
        : apiFetch('/exercises/library'),
  });

  const exercises = useMemo(() => {
    const list = rawExercises || [];
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter((ex: any) =>
      (ex.name || '').toLowerCase().includes(q) ||
      (ex.nameAr || '').toLowerCase().includes(q)
    );
  }, [rawExercises, search]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [assignTarget, setAssignTarget] = useState<any | null>(null);
  const [usageTarget, setUsageTarget] = useState<any | null>(null);

  const addExercise = useMutation({
    mutationFn: (data: any) => apiFetch('/exercises/library', { method: 'POST', data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises', 'library'] });
      toast.success('Exercise added to library');
      setDialogOpen(false);
      setEditing(null);
    },
    onError: (err: any) => toast.error(err.error || 'Failed'),
  });

  const updateExercise = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiFetch(`/exercises/library/${id}`, { method: 'PUT', data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises', 'library'] });
      toast.success('Exercise updated');
      setDialogOpen(false);
      setEditing(null);
    },
    onError: (err: any) => toast.error(err.error || 'Failed to update'),
  });

  const canEdit = (ex: any) => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    if (user.role === 'GYM_ADMIN') return ex.scope === 'GYM' && ex.gymId === user.gymId;
    if (user.role === 'COACH') return ex.scope === 'COACH' && ex.createdByCoachId === user.id;
    return false;
  };

  const canDelete = (ex: any) => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    if (user.role === 'GYM_ADMIN') {
      return (ex.scope === 'GYM' || ex.scope === 'COACH') && ex.gymId === user.gymId;
    }
    if (user.role === 'COACH') return ex.scope === 'COACH' && ex.createdByCoachId === user.id;
    return false;
  };

  const canAssignToMember = user?.role === 'COACH';

  const deleteExercise = useMutation({
    mutationFn: (id: string) => apiFetch(`/exercises/library/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises', 'library'] });
      toast.success(t('coach.exercise_deleted'));
    },
    onError: (err: any) => toast.error(err.error || err.message || t('coach.delete_exercise_failed')),
  });

  const categoryById = useMemo(() => {
    const map: Record<string, any> = {};
    (categories || []).forEach((c: any) => { map[c.id] = c; });
    return map;
  }, [categories]);

  const getEmojiForCategory = (name?: string) => {
    if (!name) return '🏋️';
    const map: Record<string, string> = { chest: '💪', back: '🏋️', legs: '🦵', shoulders: '🎯', arms: '💪', core: '🔥', cardio: '🏃' };
    const key = name.toLowerCase();
    for (const k in map) if (key.includes(k)) return map[k];
    return '🏋️';
  };

  return (
    <PageWrapper>
      <PageHeader
        title={t('common.library')}
        actions={
          <Button className="glow-hover" onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Add Custom Exercise
          </Button>
        }
      />

      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="glass-card border-white/10 sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Edit Exercise' : 'New Exercise'}</DialogTitle></DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const data = {
                name: fd.get('name'),
                nameAr: fd.get('nameAr'),
                categoryId: fd.get('categoryId'),
                defaultSets: Number(fd.get('defaultSets')),
                defaultReps: Number(fd.get('defaultReps')),
                videoUrl: fd.get('videoUrl'),
              };
              if (editing) updateExercise.mutate({ id: editing.id, data });
              else addExercise.mutate(data);
            }}
            className="space-y-4"
          >
            <Input name="name" placeholder="English Name" required className="bg-black/20" defaultValue={editing?.name || ''} />
            <Input name="nameAr" placeholder="Arabic Name" className="bg-black/20" dir="rtl" defaultValue={editing?.nameAr || ''} />
            <Select name="categoryId" required defaultValue={editing?.categoryId || undefined}>
              <SelectTrigger className="bg-black/20"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                {categories?.map((c: any) => <SelectItem key={c.id} value={c.id}>{pickName(lang, c)}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-4">
              <Input name="defaultSets" type="number" placeholder="Default Sets" defaultValue={editing?.defaultSets ?? 3} required className="bg-black/20" />
              <Input name="defaultReps" type="number" placeholder="Default Reps" defaultValue={editing?.defaultReps ?? 10} required className="bg-black/20" />
            </div>
            <Input name="videoUrl" placeholder="Video URL (optional)" className="bg-black/20" defaultValue={editing?.videoUrl || ''} />
            <Button type="submit" className="w-full" disabled={addExercise.isPending || updateExercise.isPending}>
              {(addExercise.isPending || updateExercise.isPending) ? <Loader2 className="animate-spin" /> : (editing ? 'Update Exercise' : 'Save Exercise')}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AssignToMemberDialog
        exercise={assignTarget}
        onClose={() => setAssignTarget(null)}
        lang={lang}
      />

      <UsageDialog
        exercise={usageTarget}
        onClose={() => setUsageTarget(null)}
        lang={lang}
      />

      <div className="mb-8 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setActiveCategory('')}
          className={cn(
            'px-4 py-2 rounded-full whitespace-nowrap font-medium text-sm transition-all',
            !activeCategory ? 'bg-primary text-white' : 'bg-black/20 text-muted-foreground hover:bg-white/10'
          )}
        >
          All
        </button>
        {categories?.map((c: any) => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c.id)}
            className={cn(
              'px-4 py-2 rounded-full whitespace-nowrap font-medium text-sm transition-all flex items-center gap-2',
              activeCategory === c.id ? 'bg-primary text-white' : 'bg-black/20 text-muted-foreground hover:bg-white/10'
            )}
          >
            <span>{getEmojiForCategory(c.name)}</span> {pickName(lang, c)}
          </button>
        ))}
      </div>

      <div className="relative w-full max-w-md mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search exercises..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-black/20 h-12 rounded-xl border-white/10" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {exercises?.map((ex: any) => {
            const cat = categoryById[ex.categoryId];
            return (
              <div
                key={ex.id}
                onClick={() => setUsageTarget(ex)}
                className="glass-card border-white/5 hover:border-primary/30 transition-colors flex flex-col relative overflow-hidden group cursor-pointer"
              >
                {ex.videoUrl && (() => {
                  const ytId = ex.videoUrl?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
                  return ytId ? (
                    <a
                      href={ex.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="relative block w-full overflow-hidden rounded-t-[inherit]"
                      style={{ aspectRatio: '16/9' }}
                    >
                      <img
                        src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
                        alt="Exercise video"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,0,0,0.85)' }}>
                          <Play size={20} className="fill-white text-white ml-0.5" />
                        </div>
                      </div>
                    </a>
                  ) : null;
                })()}
                <div className="p-5 flex flex-col flex-1">
                <div className="absolute -right-6 -top-6 text-9xl opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                  {getEmojiForCategory(cat?.name)}
                </div>
                <div className="mb-6 relative z-10 flex items-start justify-between gap-2">
                  <h3 className="text-2xl font-bold leading-tight mb-1" dir={lang === 'ar' ? 'rtl' : 'ltr'}>{pickName(lang, ex)}</h3>
                  <Users size={14} className="text-muted-foreground/60 mt-1 shrink-0" aria-label="Click to see usage" />
                </div>
                <div className="mt-auto flex items-center justify-between relative z-10 pt-4 border-t border-white/5">
                  <span className="bg-black/40 text-muted-foreground px-2 py-1 rounded-md text-xs font-bold font-mono">
                    {ex.defaultSets} × {ex.defaultReps}
                  </span>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {ex.videoUrl && (
                      <a href={ex.videoUrl} target="_blank" rel="noreferrer" className="text-red-500 hover:text-red-400 transition-colors p-1 bg-red-500/10 rounded-full hover:bg-red-500/20">
                        <Play size={20} className="fill-current" />
                      </a>
                    )}
                    {canAssignToMember && (
                      <button
                        onClick={() => setAssignTarget(ex)}
                        title="Add to member's plan"
                        className="text-emerald-400 hover:text-emerald-300 transition-colors p-1.5 bg-emerald-500/10 rounded-full hover:bg-emerald-500/20"
                      >
                        <UserPlus size={16} />
                      </button>
                    )}
                    {canEdit(ex) && (
                      <button
                        onClick={() => { setEditing(ex); setDialogOpen(true); }}
                        title="Edit exercise"
                        className="text-primary hover:text-primary/80 transition-colors p-1.5 bg-primary/10 rounded-full hover:bg-primary/20"
                      >
                        <Pencil size={16} />
                      </button>
                    )}
                    {canDelete(ex) && (
                      <button
                        onClick={() => {
                          const name = pickName(lang, ex);
                          const msg = (t('coach.delete_exercise_confirm') || 'Delete {name}? This will remove it from all plans using it.').replace('{name}', name);
                          if (confirm(msg)) {
                            deleteExercise.mutate(ex.id);
                          }
                        }}
                        disabled={deleteExercise.isPending}
                        title={t('coach.delete_exercise_title') || 'Delete exercise'}
                        className="text-red-500 hover:text-red-400 transition-colors p-1.5 bg-red-500/10 rounded-full hover:bg-red-500/20 disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
                </div>
              </div>
            );
          })}
          {exercises?.length === 0 && (
            <div className="col-span-full text-center py-16 text-muted-foreground glass-card border-dashed">
              No exercises found matching criteria.
            </div>
          )}
        </div>
      )}
    </PageWrapper>
  );
}

// ─── Add to Member dialog (FEATURE 1) ─────────────────────────────────────

function AssignToMemberDialog({ exercise, onClose, lang }: { exercise: any; onClose: () => void; lang: 'en' | 'ar' }) {
  const queryClient = useQueryClient();
  const open = !!exercise;
  const [memberId, setMemberId] = useState<string>('');
  const [dayId, setDayId] = useState<string>('');
  const [sets, setSets] = useState<number>(exercise?.defaultSets ?? 3);
  const [reps, setReps] = useState<number>(exercise?.defaultReps ?? 10);
  const [note, setNote] = useState('');

  // Reset state whenever a new exercise is opened
  useEffect(() => {
    if (exercise) {
      setMemberId('');
      setDayId('');
      setSets(exercise.defaultSets ?? 3);
      setReps(exercise.defaultReps ?? 10);
      setNote('');
    }
  }, [exercise?.id, exercise?.defaultSets, exercise?.defaultReps]);

  const members = useQuery<any[]>({
    queryKey: ['coach', 'members'],
    queryFn: () => apiFetch('/coach/members'),
    enabled: open,
  });

  // Latest plan for the chosen member
  const plans = useQuery<any[]>({
    queryKey: ['workouts', 'member', memberId],
    queryFn: () => apiFetch(`/workouts/member/${memberId}`),
    enabled: open && !!memberId,
  });

  const latestPlanId = useMemo(() => {
    const arr = plans.data || [];
    if (!arr.length) return null;
    // Pick the plan with the latest endDate
    return [...arr].sort((a, b) => String(b.endDate).localeCompare(String(a.endDate)))[0]?.id;
  }, [plans.data]);

  const planDetail = useQuery<any>({
    queryKey: ['workouts', 'plan', latestPlanId],
    queryFn: () => apiFetch(`/workouts/${latestPlanId}`),
    enabled: open && !!latestPlanId,
  });

  const days: any[] = useMemo(() => {
    return (planDetail.data?.days || []).filter((d: any) => !d.isRestDay);
  }, [planDetail.data]);

  const addToDay = useMutation({
    mutationFn: () =>
      apiFetch(`/workouts/days/${dayId}/exercises`, {
        method: 'POST',
        data: {
          exerciseTemplateId: exercise.id,
          sets,
          reps,
          targetWeight: 0,
          videoUrl: note ? `note:${note}` : undefined,
          orderIndex: 0,
        },
      }),
    onSuccess: () => {
      const member = (members.data || []).find((m: any) => m.id === memberId || m.memberId === memberId);
      const memberName = member?.name || member?.memberName || 'member';
      toast.success(`Added to ${memberName}'s plan!`);
      queryClient.invalidateQueries({ queryKey: ['workouts', 'plan', latestPlanId] });
      queryClient.invalidateQueries({ queryKey: ['exercises', 'usage', exercise.id] });
      onClose();
    },
    onError: (err: any) => toast.error(err.error || err.message || 'Failed to add'),
  });

  const submitDisabled = !memberId || !dayId || addToDay.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass-card border-white/10 sm:max-w-md">
        <DialogHeader><DialogTitle>Add to Member's Plan</DialogTitle></DialogHeader>
        {exercise && (
          <p className="text-sm text-muted-foreground -mt-2 mb-2">{pickName(lang, exercise)}</p>
        )}
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Member</label>
            <Select value={memberId} onValueChange={(v) => { setMemberId(v); setDayId(''); }}>
              <SelectTrigger className="bg-black/20"><SelectValue placeholder={members.isLoading ? 'Loading...' : 'Select member'} /></SelectTrigger>
              <SelectContent>
                {(members.data || []).map((m: any) => (
                  <SelectItem key={m.id || m.memberId} value={m.id || m.memberId}>
                    {m.name || m.memberName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Day</label>
            <Select value={dayId} onValueChange={setDayId} disabled={!memberId || planDetail.isLoading}>
              <SelectTrigger className="bg-black/20">
                <SelectValue placeholder={
                  !memberId ? 'Pick member first'
                  : planDetail.isLoading ? 'Loading plan...'
                  : !latestPlanId ? 'Member has no plan'
                  : days.length === 0 ? 'No training days'
                  : 'Select day'
                } />
              </SelectTrigger>
              <SelectContent>
                {days.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.dayName} — {String(d.dayDate).slice(0, 10)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Sets</label>
              <Input type="number" min={1} value={sets} onChange={(e) => setSets(Number(e.target.value))} className="bg-black/20" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Reps</label>
              <Input type="number" min={1} value={reps} onChange={(e) => setReps(Number(e.target.value))} className="bg-black/20" />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Coach Note (optional)</label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Use machine #1" className="bg-black/20" />
          </div>

          <Button
            onClick={() => addToDay.mutate()}
            disabled={submitDisabled}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            {addToDay.isPending ? <Loader2 className="animate-spin" /> : 'Add Exercise'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Usage panel (FEATURE 2) ──────────────────────────────────────────────

function UsageDialog({ exercise, onClose, lang }: { exercise: any; onClose: () => void; lang: 'en' | 'ar' }) {
  const open = !!exercise;
  const usage = useQuery<any[]>({
    queryKey: ['exercises', 'usage', exercise?.id],
    queryFn: () => apiFetch(`/exercises/${exercise.id}/usage`),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass-card border-white/10 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{exercise ? `${pickName(lang, exercise)} — Usage` : 'Usage'}</DialogTitle>
        </DialogHeader>
        {usage.isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" /></div>
        ) : !usage.data?.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No members assigned yet.</p>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {usage.data.map((u: any, i: number) => (
              <div key={`${u.memberId}-${u.dayId}-${i}`} className="p-3 bg-black/30 rounded-lg border border-white/5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                      {(u.memberName || '?').slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{u.memberName}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.planName}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono bg-black/40 text-muted-foreground px-2 py-1 rounded">
                    {u.sets} × {u.reps}
                  </span>
                </div>
                <div className="mt-2 pt-2 border-t border-white/5 text-xs text-muted-foreground flex items-center justify-between">
                  <span>{u.dayName} · {String(u.dayDate || '').slice(0, 10)}</span>
                  {u.lastLoggedAt ? (
                    <span className="text-primary">
                      Last: {String(u.lastLoggedAt).slice(0, 10)}{u.lastWeight != null ? ` · ${u.lastWeight}kg` : ''}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/60">Not logged</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
