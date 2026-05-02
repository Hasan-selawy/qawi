import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { useLanguage } from '@/hooks/use-language';
import { pickName } from '@/lib/i18n-name';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Dumbbell, Trash2, Calendar, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const DAY_EN = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
const DAY_AR = ['يوم 1', 'يوم 2', 'يوم 3', 'يوم 4', 'يوم 5', 'يوم 6', 'يوم 7'];

type DraftExercise = { exerciseTemplateId: string; name: string; sets: number; reps: number };
type DraftDay = { dayName: string; dayNameAr: string; isRestDay: boolean; exercises: DraftExercise[] };

export default function Templates() {
  const { t, lang } = useLanguage();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [description, setDescription] = useState('');
  const [days, setDays] = useState<DraftDay[]>([]);
  const [editingDayIndex, setEditingDayIndex] = useState<number | null>(null);
  const [exerciseSearch, setExerciseSearch] = useState('');

  const { data: templates, isLoading } = useQuery<any[]>({
    queryKey: ['templates'],
    queryFn: () => apiFetch('/templates'),
  });

  const { data: members } = useQuery<any[]>({
    queryKey: ['coach', 'members'],
    queryFn: () => apiFetch('/coach/members'),
  });

  const { data: library } = useQuery<any[]>({
    queryKey: ['exercises', 'library'],
    queryFn: () => apiFetch('/exercises/library'),
  });

  const filteredLibrary = useMemo(() => {
    const list = library || [];
    if (!exerciseSearch.trim()) return list;
    const q = exerciseSearch.toLowerCase();
    return list.filter((ex: any) =>
      (ex.name || '').toLowerCase().includes(q) ||
      (ex.nameAr || '').toLowerCase().includes(q)
    );
  }, [library, exerciseSearch]);

  const deleteTemplate = useMutation({
    mutationFn: (id: string) => apiFetch(`/templates/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template deleted');
    },
  });

  const applyTemplate = useMutation({
    mutationFn: (data: any) => apiFetch('/workouts/from-template', { method: 'POST', data }),
    onSuccess: () => toast.success('Template applied to member successfully'),
    onError: (err: any) => toast.error(lang === 'ar' ? err.messageAr : err.error || 'Failed'),
  });

  const createTemplate = useMutation({
    mutationFn: (data: any) => apiFetch('/templates', { method: 'POST', data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template created');
      setCreateOpen(false);
      setName(''); setNameAr(''); setDescription(''); setDays([]);
    },
    onError: (err: any) => toast.error(err.error || err.message || 'Failed to create template'),
  });

  const addDay = (isRest: boolean) => {
    if (days.length >= 7) {
      toast.error('Maximum 7 days per template');
      return;
    }
    const i = days.length;
    setDays([...days, { dayName: DAY_EN[i], dayNameAr: DAY_AR[i], isRestDay: isRest, exercises: [] }]);
  };

  const removeDay = (idx: number) => setDays(days.filter((_, i) => i !== idx));

  const addExerciseToDay = (idx: number, ex: any) => {
    const next = [...days];
    next[idx] = {
      ...next[idx],
      exercises: [
        ...next[idx].exercises,
        {
          exerciseTemplateId: ex.id,
          name: pickName(lang, ex) || ex.name,
          sets: ex.defaultSets || 3,
          reps: ex.defaultReps || 10,
        },
      ],
    };
    setDays(next);
  };

  const removeExerciseFromDay = (dayIdx: number, exIdx: number) => {
    const next = [...days];
    next[dayIdx] = { ...next[dayIdx], exercises: next[dayIdx].exercises.filter((_, i) => i !== exIdx) };
    setDays(next);
  };

  const updateExerciseField = (dayIdx: number, exIdx: number, field: 'sets' | 'reps', value: number) => {
    const next = [...days];
    const nextExs = [...next[dayIdx].exercises];
    nextExs[exIdx] = { ...nextExs[exIdx], [field]: value };
    next[dayIdx] = { ...next[dayIdx], exercises: nextExs };
    setDays(next);
  };

  const handleSubmit = () => {
    if (!name.trim()) { toast.error('Template name is required'); return; }
    if (!nameAr.trim()) { toast.error('Arabic template name is required'); return; }
    if (days.length === 0) { toast.error('Add at least one day to the template'); return; }
    const emptyTraining = days.findIndex(d => !d.isRestDay && d.exercises.length === 0);
    if (emptyTraining >= 0) {
      toast.error(`Day ${emptyTraining + 1} is a training day with no exercises. Add at least one exercise or mark it as rest.`);
      return;
    }
    createTemplate.mutate({
      name: name.trim(),
      nameAr: nameAr.trim(),
      description: description.trim() || null,
      days: days.map((d, i) => ({
        dayNumber: i + 1,
        dayName: d.dayName,
        dayNameAr: d.dayNameAr,
        isRestDay: d.isRestDay,
        exercises: d.exercises.map((e, j) => ({
          exerciseTemplateId: e.exerciseTemplateId,
          sets: e.sets,
          reps: e.reps,
          targetWeight: 0,
          orderIndex: j,
        })),
      })),
    });
  };

  return (
    <PageWrapper>
      <PageHeader
        title={t('common.templates')}
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild><Button className="glow-hover"><Plus className="mr-2 h-4 w-4" /> New Template</Button></DialogTrigger>
            <DialogContent className="glass-card border-white/10 max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Create Workout Template</DialogTitle></DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Template Name (English) *</label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Push Pull Legs" className="bg-black/20" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Template Name (Arabic) *</label>
                    <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder="مثال: دفع وسحب وأرجل" className="bg-black/20" dir="rtl" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Description (optional)</label>
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this template for?" className="bg-black/20" />
                </div>

                <div className="border-t border-white/5 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold flex items-center gap-2"><Calendar size={16} /> Days ({days.length})</h4>
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant="secondary" onClick={() => addDay(false)} disabled={days.length >= 7}>
                        <Plus size={14} className="mr-1" /> Training Day
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => addDay(true)} disabled={days.length >= 7}>
                        <Plus size={14} className="mr-1" /> Rest Day
                      </Button>
                    </div>
                  </div>

                  {days.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground bg-black/20 rounded-lg border border-dashed border-white/10 text-sm">
                      No days added yet. Add at least one training or rest day.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {days.map((d, idx) => (
                        <div key={idx} className={`p-3 rounded-lg border ${d.isRestDay ? 'bg-orange-500/5 border-orange-500/20' : 'bg-black/20 border-white/5'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{d.dayName}</span>
                              {d.isRestDay && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">Rest</span>}
                              {!d.isRestDay && <span className="text-xs text-muted-foreground">{d.exercises.length} exercise(s)</span>}
                            </div>
                            <div className="flex gap-1">
                              {!d.isRestDay && (
                                <Button type="button" size="sm" variant="ghost" onClick={() => { setEditingDayIndex(idx); setExerciseSearch(''); }}>
                                  <Plus size={14} className="mr-1" /> Exercise
                                </Button>
                              )}
                              <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeDay(idx)}>
                                <X size={14} />
                              </Button>
                            </div>
                          </div>

                          {!d.isRestDay && d.exercises.length > 0 && (
                            <div className="space-y-1 mt-2">
                              {d.exercises.map((ex, exIdx) => (
                                <div key={exIdx} className="flex items-center gap-2 p-2 bg-black/30 rounded text-xs">
                                  <span className="flex-1 font-medium">{ex.name}</span>
                                  <Input
                                    type="number" min={1} value={ex.sets}
                                    onChange={(e) => updateExerciseField(idx, exIdx, 'sets', Number(e.target.value) || 1)}
                                    className="w-14 h-7 bg-black/40 text-center"
                                  />
                                  <span className="text-muted-foreground">×</span>
                                  <Input
                                    type="number" min={1} value={ex.reps}
                                    onChange={(e) => updateExerciseField(idx, exIdx, 'reps', Number(e.target.value) || 1)}
                                    className="w-14 h-7 bg-black/40 text-center"
                                  />
                                  <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeExerciseFromDay(idx, exIdx)}>
                                    <X size={12} />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button onClick={handleSubmit} className="w-full" disabled={createTemplate.isPending}>
                  {createTemplate.isPending ? <Loader2 className="animate-spin" /> : 'Save Template'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Exercise picker dialog (nested) */}
      <Dialog open={editingDayIndex !== null} onOpenChange={(open) => !open && setEditingDayIndex(null)}>
        <DialogContent className="glass-card border-white/10 max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Exercises{editingDayIndex !== null && ` to ${days[editingDayIndex]?.dayName}`}</DialogTitle></DialogHeader>
          <Input
            placeholder="Search library..."
            value={exerciseSearch}
            onChange={(e) => setExerciseSearch(e.target.value)}
            className="bg-black/20 mb-3"
          />
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {filteredLibrary.map((ex: any) => (
              <button
                key={ex.id}
                onClick={() => editingDayIndex !== null && addExerciseToDay(editingDayIndex, ex)}
                className="w-full text-start p-3 bg-black/20 hover:bg-primary/10 border border-white/5 hover:border-primary/30 rounded-lg transition-colors flex items-center justify-between"
              >
                <span className="font-medium text-sm" dir={lang === 'ar' ? 'rtl' : 'ltr'}>{pickName(lang, ex)}</span>
                <span className="text-xs text-muted-foreground font-mono">{ex.defaultSets} × {ex.defaultReps}</span>
              </button>
            ))}
            {filteredLibrary.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm">No exercises found.</div>
            )}
          </div>
          <Button variant="secondary" onClick={() => setEditingDayIndex(null)} className="w-full mt-2">Done</Button>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {templates?.map((tpl: any) => (
            <div key={tpl.id} className="glass-card flex flex-col hover:-translate-y-1 transition-transform overflow-hidden border border-white/5">
              <div className="p-6 pb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4 text-primary">
                  <Dumbbell size={24} />
                </div>
                <h3 className="text-xl font-bold mb-1">{lang === 'ar' ? (tpl.nameAr || tpl.name) : tpl.name}</h3>
                {tpl.description && <p className="text-xs text-muted-foreground mt-2">{tpl.description}</p>}
                <p className="text-xs text-muted-foreground mt-3">Created {tpl.createdAt ? format(new Date(tpl.createdAt), 'PP') : '-'}</p>
              </div>

              <div className="border-t border-white/10 mt-auto bg-black/10 p-3 flex gap-2">
                <Dialog>
                  <DialogTrigger asChild><Button variant="secondary" className="flex-1 text-xs h-8">Use</Button></DialogTrigger>
                  <DialogContent className="glass-card border-white/10">
                    <DialogHeader><DialogTitle>Apply Template: {tpl.name}</DialogTitle></DialogHeader>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        applyTemplate.mutate({ templateId: tpl.id, memberId: fd.get('memberId'), startDate: fd.get('startDate') });
                      }}
                      className="space-y-4"
                    >
                      <Select name="memberId" required>
                        <SelectTrigger className="bg-black/20"><SelectValue placeholder="Select Member" /></SelectTrigger>
                        <SelectContent>
                          {members?.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input name="startDate" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="bg-black/20" />
                      <Button type="submit" className="w-full" disabled={applyTemplate.isPending}>
                        {applyTemplate.isPending ? <Loader2 className="animate-spin" /> : 'Apply to Member'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:bg-destructive/20"
                  onClick={() => { if (confirm('Delete template?')) deleteTemplate.mutate(tpl.id); }}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          ))}
          {templates?.length === 0 && (
            <div className="col-span-full text-center py-16 text-muted-foreground glass-card border-dashed">
              No templates available. Create one to save time.
            </div>
          )}
        </div>
      )}
    </PageWrapper>
  );
}
