import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { useLanguage } from '@/hooks/use-language';
import { useLocation } from 'wouter';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { GradientAvatar } from '@/components/GradientAvatar';
import { StatusBadge, BadgeStatus } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Flame, Plus, Activity, Trash2 } from 'lucide-react';
import { format, isToday } from 'date-fns';
import { toast } from 'sonner';
import { WeightChart } from '@/components/charts/WeightChart';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getSubStatus } from '@/lib/sub-status';

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
            <TabsTrigger value="nutrition" className="py-2">Nutrition</TabsTrigger>
            <TabsTrigger value="measurements" className="py-2">Measurements</TabsTrigger>
            <TabsTrigger value="photos" className="py-2">Photos</TabsTrigger>
            <TabsTrigger value="attendance" className="py-2">Attendance</TabsTrigger>
            <TabsTrigger value="notes" className="py-2">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="plan" className="m-0"><PlanTab plan={overview?.currentWorkoutPlan} /></TabsContent>
          <TabsContent value="nutrition" className="m-0"><NutritionTab plan={overview?.nutritionPlan} lang={lang} memberId={id} /></TabsContent>
          <TabsContent value="measurements" className="m-0"><MeasurementsTab memberId={id} /></TabsContent>
          <TabsContent value="photos" className="m-0"><PhotosTab memberId={id} /></TabsContent>
          <TabsContent value="attendance" className="m-0"><AttendanceTab memberId={id} /></TabsContent>
          <TabsContent value="notes" className="m-0"><NotesTab memberId={id} /></TabsContent>
        </Tabs>
      </div>
    </PageWrapper>
  );
}

function PlanTab({ plan }: { plan: any }) {
  if (!plan) {
    return (
      <div className="glass-card p-12 text-center border-dashed">
        <p className="text-muted-foreground">No active workout plan for this member yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 justify-between items-center bg-black/20 p-4 rounded-xl border border-white/5">
        <div>
          <h3 className="text-lg font-semibold">{plan.name}</h3>
          <p className="text-xs text-muted-foreground">
            {plan.startDate ? format(new Date(plan.startDate), 'PP') : ''} → {plan.endDate ? format(new Date(plan.endDate), 'PP') : ''}
          </p>
        </div>
      </div>

      {plan.scheduleDays && plan.scheduleDays.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {plan.scheduleDays.map((day: any) => {
            const isRest = day.isRestDay;
            const date = day.dayDate ? new Date(day.dayDate) : null;
            const today = date ? isToday(date) : false;
            return (
              <div
                key={day.id}
                className={cn(
                  'glass-card p-3 flex flex-col cursor-pointer transition-transform hover:-translate-y-1 border',
                  isRest ? 'opacity-60 border-white/5' : 'border-white/10',
                  today ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-background' : '',
                  day.isCompleted ? 'border-primary/40 bg-primary/5' : ''
                )}
              >
                <p className="text-xs text-muted-foreground mb-1">{date ? format(date, 'EEE, MMM d') : day.dayName}</p>
                <div
                  className={cn(
                    'flex-1 rounded-lg flex items-center justify-center min-h-[60px] text-center font-medium text-xs p-2',
                    isRest ? 'bg-black/40 text-muted-foreground' : 'bg-primary/20 text-primary border border-primary/30'
                  )}
                >
                  {isRest ? 'Rest Day' : `${day.exercises?.length || 0} Exercises`}
                </div>
                {day.isCompleted && <p className="text-[10px] text-primary mt-1 text-center">✓ Done</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NutritionTab({ plan, lang, memberId }: { plan: any; lang: string; memberId: string }) {
  const queryClient = useQueryClient();
  const addMeal = useMutation({
    mutationFn: ({ planId, data }: { planId: string; data: any }) => apiFetch(`/nutrition/${planId}/meals`, { method: 'POST', data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach', 'members', memberId, 'overview'] });
      toast.success('Meal added');
    },
    onError: (err: any) => toast.error(err.error || 'Failed'),
  });

  if (!plan) {
    return (
      <div className="glass-card p-12 text-center border-dashed">
        <p className="text-muted-foreground">No nutrition plan configured for this member yet.</p>
      </div>
    );
  }

  const mealTypes = [
    { type: 'BREAKFAST', emoji: '🌅', label: 'Breakfast' },
    { type: 'LUNCH', emoji: '☀️', label: 'Lunch' },
    { type: 'SNACK', emoji: '🍎', label: 'Snack' },
    { type: 'DINNER', emoji: '🌙', label: 'Dinner' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {mealTypes.map(({ type, emoji, label }) => {
        const meals = (plan.meals || []).filter((m: any) => m.mealType === type);
        return (
          <div key={type} className="glass-card p-6 border-white/5 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-semibold text-lg flex items-center gap-2"><span>{emoji}</span> {label}</h4>
              <Dialog>
                <DialogTrigger asChild><Button variant="ghost" size="sm" className="h-8"><Plus className="mr-1 h-4 w-4" /> Add</Button></DialogTrigger>
                <DialogContent className="glass-card border-white/10">
                  <DialogHeader><DialogTitle>Add {label}</DialogTitle></DialogHeader>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      addMeal.mutate({
                        planId: plan.id,
                        data: {
                          mealType: type,
                          description: fd.get('description'),
                          descriptionAr: fd.get('descriptionAr'),
                          calories: Number(fd.get('calories')),
                          protein: Number(fd.get('protein')),
                        },
                      });
                    }}
                    className="space-y-4"
                  >
                    <Input name="description" placeholder="Meal description" required className="bg-black/20" />
                    <Input name="descriptionAr" placeholder="وصف الوجبة" className="bg-black/20" dir="rtl" />
                    <div className="grid grid-cols-2 gap-4">
                      <Input name="calories" type="number" placeholder="Calories (kcal)" required className="bg-black/20" />
                      <Input name="protein" type="number" placeholder="Protein (g)" required className="bg-black/20" />
                    </div>
                    <Button type="submit" className="w-full" disabled={addMeal.isPending}>Save</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-3 flex-1">
              {meals.map((meal: any) => (
                <div key={meal.id} className="p-3 bg-black/20 rounded-lg border border-white/5">
                  <p className="font-medium mb-2">{lang === 'ar' && meal.descriptionAr ? meal.descriptionAr : meal.description}</p>
                  <div className="flex gap-2">
                    <span className="text-xs bg-orange-500/20 text-orange-500 px-2 py-1 rounded-md">{meal.calories} kcal</span>
                    <span className="text-xs bg-blue-500/20 text-blue-500 px-2 py-1 rounded-md">{meal.protein}g protein</span>
                  </div>
                </div>
              ))}
              {meals.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">No meals added</p>}
            </div>
          </div>
        );
      })}
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
