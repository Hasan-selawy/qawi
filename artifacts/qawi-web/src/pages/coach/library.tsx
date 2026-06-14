import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Plus, Play, Search, Trash2, Pencil, UserPlus, Users, Dumbbell,
  RotateCcw, Sparkles, UserCircle, ChevronDown, ChevronRight, LayoutList, UserSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ImageUpload } from '@/components/ImageUpload';

function getYouTubeId(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  return m ? m[1] : null;
}

function VideoPreview({ url }: { url?: string | null }) {
  if (!url) return null;
  const ytId = getYouTubeId(url);
  if (ytId) {
    return (
      <div className="mt-3 rounded-lg overflow-hidden aspect-video w-full">
        <iframe src={`https://www.youtube.com/embed/${ytId}`} className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
      </div>
    );
  }
  return (
    <div className="mt-3 rounded-lg overflow-hidden aspect-video w-full bg-black/20 flex items-center justify-center">
      <video src={url} controls className="max-w-full max-h-full" />
    </div>
  );
}

function LibrarySkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="glass-card overflow-hidden">
          <Skeleton className="h-32 w-full" />
          <div className="p-5 space-y-3"><Skeleton className="h-6 w-36" /><Skeleton className="h-4 w-20" /></div>
        </div>
      ))}
    </div>
  );
}

function CoachAvatar({ name, url, size = 'sm' }: { name: string; url?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || '?';
  const sizeClasses = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-14 w-14' };
  const textClasses = { sm: 'text-xs', md: 'text-sm', lg: 'text-lg' };
  return (
    <Avatar className={cn(sizeClasses[size], 'shrink-0')}
      style={!url ? { background: 'linear-gradient(135deg, hsl(160, 70%, 45%), hsl(200, 80%, 40%))' } : undefined}>
      {url && <AvatarImage src={url} alt={name} />}
      <AvatarFallback className={cn(textClasses[size], 'text-white font-bold bg-transparent')}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

export default function Library() {
  const { t, lang } = useLanguage();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('exercises');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [overrideTarget, setOverrideTarget] = useState<any | null>(null);
  const [overrideForm, setOverrideForm] = useState({ name: '', nameAr: '', videoUrl: '', imageUrl: '' });
  const [overrideVideoPreview, setOverrideVideoPreview] = useState('');
  const [assignTarget, setAssignTarget] = useState<any | null>(null);
  const [usageTarget, setUsageTarget] = useState<any | null>(null);
  const [selectedCoach, setSelectedCoach] = useState<any | null>(null);
  const [showCoachMembers, setShowCoachMembers] = useState<string | null>(null);
  const isGymAdmin = user?.role === 'GYM_ADMIN';
  const isCoach = user?.role === 'COACH';
  const isAr = lang === 'ar';

  const { data: categories } = useQuery<any[]>({
    queryKey: ['exercises', 'categories'],
    queryFn: () => apiFetch('/exercises/categories'),
  });

  const { data: rawExercises, isLoading } = useQuery<any[]>({
    queryKey: ['exercises', 'library', activeCategory],
    queryFn: () => activeCategory ? apiFetch(`/exercises/library/${activeCategory}`) : apiFetch('/exercises/library'),
  });

  const { data: gymOverrides } = useQuery<any[]>({
    queryKey: ['admin', 'exercises', 'overrides'],
    queryFn: () => apiFetch('/admin/exercises/overrides'),
    enabled: isGymAdmin,
  });

  const { data: myMembers } = useQuery<any[]>({
    queryKey: ['coach', 'members'],
    queryFn: () => apiFetch('/coach/members'),
    enabled: isCoach,
  });

  const { data: usageData } = useQuery<any[]>({
    queryKey: ['exercises', usageTarget?.id, 'usage'],
    queryFn: () => apiFetch(`/exercises/${usageTarget?.id}/usage`),
    enabled: !!usageTarget,
  });

  // Coach list for GYM_ADMIN
  const { data: coachesList } = useQuery<any[]>({
    queryKey: ['admin', 'coaches'],
    queryFn: () => apiFetch('/admin/coaches'),
    enabled: isGymAdmin,
  });

  // Coach members for the selected coach
  const { data: coachMembers, isLoading: coachMembersLoading } = useQuery<any[]>({
    queryKey: ['admin', 'coaches', showCoachMembers, 'members'],
    queryFn: () => apiFetch(`/admin/coaches/${showCoachMembers}/members`),
    enabled: !!showCoachMembers,
  });

  // Build a map of coachId -> coach data for exercise cards
  const coachMap = useMemo(() => {
    const map: Record<string, any> = {};
    (coachesList || []).forEach((c: any) => { map[c.id] = c; });
    return map;
  }, [coachesList]);

  const overrideMap = useMemo(() => {
    const map: Record<string, any> = {};
    (gymOverrides || []).forEach((o: any) => { map[o.exerciseTemplateId] = o; });
    return map;
  }, [gymOverrides]);

  const exercises = useMemo(() => {
    const list = rawExercises || [];
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter((ex: any) =>
      (ex.name || '').toLowerCase().includes(q) || (ex.nameAr || '').toLowerCase().includes(q));
  }, [rawExercises, search]);

  const addExercise = useMutation({
    mutationFn: (data: any) => apiFetch('/exercises/library', { method: 'POST', data }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['exercises'] }); toast.success('Exercise added'); setDialogOpen(false); setEditing(null); },
    onError: (err: any) => toast.error(err.error || 'Failed'),
  });

  const updateExercise = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiFetch(`/exercises/library/${id}`, { method: 'PUT', data }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['exercises'] }); toast.success('Exercise updated'); setDialogOpen(false); setEditing(null); },
    onError: (err: any) => toast.error(err.error || 'Failed'),
  });

  const deleteExercise = useMutation({
    mutationFn: (id: string) => apiFetch(`/exercises/library/${id}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['exercises'] }); toast.success('Exercise removed'); },
    onError: (err: any) => toast.error(err.error || 'Failed'),
  });

  const upsertOverride = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiFetch(`/admin/exercises/${id}/override`, { method: 'PUT', data }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'exercises', 'overrides'] }); toast.success('Exercise customized for your gym'); setOverrideTarget(null); },
    onError: (err: any) => toast.error(err.error || 'Failed'),
  });

  const deleteOverride = useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/exercises/${id}/override`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'exercises', 'overrides'] }); toast.success('Reset to default'); setOverrideTarget(null); },
    onError: (err: any) => toast.error(err.error || 'Failed'),
  });

  const openOverride = (ex: any) => {
    const existing = overrideMap[ex.id];
    setOverrideForm({ name: existing?.name ?? ex.name ?? '', nameAr: existing?.nameAr ?? ex.nameAr ?? '', videoUrl: existing?.videoUrl ?? ex.videoUrl ?? '', imageUrl: existing?.imageUrl ?? ex.imageUrl ?? '' });
    setOverrideVideoPreview(existing?.videoUrl ?? ex.videoUrl ?? '');
    setOverrideTarget(ex);
  };

  const canEditOriginal = (ex: any) => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    if (user.role === 'GYM_ADMIN') return ex.scope === 'GYM' && ex.gymId === user.gymId;
    if (user.role === 'COACH') return ex.scope === 'COACH' && ex.createdByCoachId === user.id;
    return false;
  };

  const canDelete = (ex: any) => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    if (user.role === 'GYM_ADMIN') return (ex.scope === 'GYM' || ex.scope === 'COACH') && ex.gymId === user.gymId;
    if (user.role === 'COACH') return ex.scope === 'COACH' && ex.createdByCoachId === user.id;
    return false;
  };

  return (
    <PageWrapper>
      <PageHeader
        title={t('common.library')}
        actions={
          activeTab === 'exercises' && (
            <Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="glow-hover">
              <Plus className="mr-2 h-4 w-4" />{isAr ? 'إضافة تمرين' : 'Add Exercise'}
            </Button>
          )
        }
      />

      {/* Tab switcher for GYM_ADMIN */}
      {isGymAdmin && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="bg-black/20 border border-white/5">
            <TabsTrigger value="exercises" className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <LayoutList size={14} />
              {isAr ? 'التمارين' : 'Exercises'}
            </TabsTrigger>
            <TabsTrigger value="coaches" className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <UserSquare size={14} />
              {isAr ? 'المدربين' : 'Trainers'}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* ── EXERCISES TAB ── */}
      {activeTab === 'exercises' && (
        <>
          {/* Gym Admin Override Modal */}
          <Dialog open={!!overrideTarget} onOpenChange={(v) => { if (!v) setOverrideTarget(null); }}>
            <DialogContent className="glass-card border-white/10 sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="text-primary h-5 w-5" />
                  {isAr ? 'تخصيص التمرين لصالتك' : 'Customize exercise for your gym'}
                </DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground -mt-2">
                {isAr ? 'التغييرات تطبق على صالتك فقط ولا تؤثر على بيانات التمرين العامة.' : 'Changes apply only to your gym — global exercise data is untouched.'}
              </p>
              <div className="space-y-4 mt-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{isAr ? 'الاسم (إنجليزي)' : 'Name (English)'}</label>
                  <Input value={overrideForm.name} onChange={(e) => setOverrideForm((f) => ({ ...f, name: e.target.value }))} className="bg-black/20" placeholder="Exercise name" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{isAr ? 'الاسم (عربي)' : 'Name (Arabic)'}</label>
                  <Input value={overrideForm.nameAr} onChange={(e) => setOverrideForm((f) => ({ ...f, nameAr: e.target.value }))} className="bg-black/20" dir="rtl" placeholder="اسم التمرين" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{isAr ? 'رابط الفيديو' : 'Video URL'}</label>
                  <Input value={overrideForm.videoUrl} onChange={(e) => { setOverrideForm((f) => ({ ...f, videoUrl: e.target.value })); setOverrideVideoPreview(e.target.value); }} className="bg-black/20" placeholder="https://youtube.com/..." />
                  <VideoPreview url={overrideVideoPreview} />
                </div>
                <ImageUpload
                  value={overrideForm.imageUrl || undefined}
                  onChange={(url) => setOverrideForm((f) => ({ ...f, imageUrl: url || '' }))}
                  label="Exercise Image"
                  labelAr="صورة التمرين"
                  isAr={isAr}
                />
                <div className="flex gap-3 pt-2">
                  <Button className="flex-1" onClick={() => upsertOverride.mutate({ id: overrideTarget?.id, data: overrideForm })} disabled={upsertOverride.isPending}>
                    {upsertOverride.isPending ? 'Saving…' : (isAr ? 'حفظ التخصيص' : 'Save Customization')}
                  </Button>
                  {overrideMap[overrideTarget?.id] && (
                    <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => deleteOverride.mutate(overrideTarget?.id)} disabled={deleteOverride.isPending}>
                      <RotateCcw className="mr-2 h-4 w-4" />{isAr ? 'استعادة الافتراضي' : 'Reset'}
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Add/Edit Dialog */}
          <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditing(null); }}>
            <DialogContent className="glass-card border-white/10 sm:max-w-lg">
              <DialogHeader><DialogTitle>{editing ? (isAr ? 'تعديل التمرين' : 'Edit Exercise') : (isAr ? 'إضافة تمرين' : 'Add Exercise')}</DialogTitle></DialogHeader>
              <ExerciseForm initial={editing} categories={categories || []} lang={lang}
                onSubmit={(data: any) => { if (editing) updateExercise.mutate({ id: editing.id, data }); else addExercise.mutate(data); }}
                isPending={addExercise.isPending || updateExercise.isPending} />
            </DialogContent>
          </Dialog>

          {/* Category filter */}
          <div className="flex flex-wrap gap-2 mb-6">
            {[{ id: '', label: isAr ? 'الكل' : 'All' }, ...(categories || []).map((c: any) => ({ id: c.id, label: isAr ? c.nameAr : c.name }))].map((item) => (
              <button key={item.id} onClick={() => setActiveCategory(item.id)}
                className={cn('px-4 py-2 rounded-full text-sm font-medium transition-colors border', activeCategory === item.id ? 'bg-primary text-white border-primary' : 'border-white/10 text-muted-foreground hover:border-white/20')}>
                {item.label}
              </button>
            ))}
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={isAr ? 'بحث...' : 'Search exercises...'} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-black/20" />
          </div>

          {isLoading ? <LibrarySkeleton /> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {exercises.map((ex: any) => {
                const override = overrideMap[ex.id];
                const displayName = isAr ? (override?.nameAr ?? ex.nameAr) : (override?.name ?? ex.name);
                const displayVideo = override?.videoUrl ?? ex.videoUrl;
                const displayImage = override?.imageUrl ?? ex.imageUrl;
                const ytId = getYouTubeId(displayVideo);
                const isCustomized = !!override;
                const coach = ex.createdByCoachId ? coachMap[ex.createdByCoachId] : null;

                return (
                  <div key={ex.id} className="glass-card overflow-hidden group flex flex-col hover:border-primary/30 transition-colors border border-white/5">
                    {/* Image or Video thumbnail */}
                    {displayImage ? (
                      <div className="relative h-32 bg-black overflow-hidden">
                        <img src={displayImage} alt={displayName} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                        {displayVideo && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center"><Play className="h-5 w-5 text-white fill-white" /></div>
                          </div>
                        )}
                      </div>
                    ) : ytId ? (
                      <div className="relative h-32 bg-black overflow-hidden">
                        <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt={displayName} className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center"><Play className="h-5 w-5 text-white fill-white" /></div>
                        </div>
                      </div>
                    ) : displayVideo ? (
                      <div className="relative h-32 bg-black/40 flex items-center justify-center"><Play className="h-8 w-8 text-muted-foreground" /></div>
                    ) : (
                      <div className="h-32 bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center"><Dumbbell className="h-12 w-12 text-primary/30" /></div>
                    )}

                    <div className="p-4 flex flex-col flex-1 gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{displayName}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {ex.scope === 'GLOBAL' ? (isAr ? 'افتراضي' : 'Built-in') : ex.scope === 'GYM' ? (isAr ? 'صالة' : 'Gym') : (isAr ? 'مدرب' : 'Coach')}
                          </p>
                        </div>
                        {isCustomized && <Badge className="bg-primary/20 text-primary border-primary/30 text-xs shrink-0 pointer-events-none">{isAr ? 'مخصص' : 'Customized'}</Badge>}
                      </div>

                      {/* Coach avatar for coach-created exercises */}
                      {coach && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CoachAvatar name={coach.name} url={coach.profileImageUrl} size="sm" />
                          <span className="truncate">{coach.name}</span>
                        </div>
                      )}

                      <div className="flex gap-1.5 mt-auto flex-wrap">
                        {isGymAdmin && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-8 px-2 text-primary hover:bg-primary/10" onClick={() => openOverride(ex)}>
                                <Sparkles className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{isAr ? 'تخصيص للصالة' : 'Customize for gym'}</TooltipContent>
                          </Tooltip>
                        )}
                        {canEditOriginal(ex) && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => { setEditing(ex); setDialogOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>
                        )}
                        {isCoach && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setAssignTarget(ex)}><UserPlus className="h-3.5 w-3.5" /></Button>
                            </TooltipTrigger>
                            <TooltipContent>Assign to member</TooltipContent>
                          </Tooltip>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setUsageTarget(ex)}><Users className="h-3.5 w-3.5" /></Button>
                          </TooltipTrigger>
                          <TooltipContent>View usage</TooltipContent>
                        </Tooltip>
                        {canDelete(ex) && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-8 px-2 text-red-500 hover:bg-red-500/10"
                                onClick={() => { if (confirm('Delete this exercise?')) deleteExercise.mutate(ex.id); }}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {exercises.length === 0 && !isLoading && (
                <div className="col-span-full text-center py-16">
                  <Dumbbell className="h-16 w-16 mx-auto text-muted-foreground/20 mb-4" />
                  <p className="text-muted-foreground">{isAr ? 'لا توجد تمارين' : 'No exercises found'}</p>
                </div>
              )}
            </div>
          )}

          {/* Assign Dialog */}
          <Dialog open={!!assignTarget} onOpenChange={(v) => { if (!v) setAssignTarget(null); }}>
            <DialogContent className="glass-card border-white/10">
              <DialogHeader><DialogTitle>Assign to Member</DialogTitle></DialogHeader>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {(myMembers || []).map((m: any) => (
                  <button key={m.id} onClick={() => { toast.success(`Tip: Add "${assignTarget?.name}" to ${m.name}'s plan from their profile`); setAssignTarget(null); }}
                    className="w-full text-left px-4 py-3 glass-card hover:border-primary/30 transition-colors flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">{m.name[0]}</div>
                    <div><p className="font-medium">{m.name}</p><p className="text-xs text-muted-foreground">{m.email}</p></div>
                  </button>
                ))}
                {!(myMembers || []).length && <p className="text-center text-muted-foreground py-4">No members assigned yet</p>}
              </div>
            </DialogContent>
          </Dialog>

          {/* Usage Dialog */}
          <Dialog open={!!usageTarget} onOpenChange={(v) => { if (!v) setUsageTarget(null); }}>
            <DialogContent className="glass-card border-white/10">
              <DialogHeader><DialogTitle>Usage — {usageTarget?.name}</DialogTitle></DialogHeader>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(usageData || []).length === 0
                  ? <p className="text-muted-foreground text-center py-4">Not assigned to any plans yet.</p>
                  : (usageData || []).map((u: any, i: number) => (
                    <div key={i} className="glass-card p-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">{u.memberName?.[0]}</div>
                      <div><p className="font-medium text-sm">{u.memberName}</p><p className="text-xs text-muted-foreground">{u.planName}</p></div>
                    </div>
                  ))}
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* ── COACHES TAB ── */}
      {activeTab === 'coaches' && isGymAdmin && (
        <div className="space-y-6">
          {/* Selected coach members */}
          {showCoachMembers && (
            <div className="glass-card border-white/5 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CoachAvatar name={coachMap[showCoachMembers]?.name || 'Coach'} url={coachMap[showCoachMembers]?.profileImageUrl} size="md" />
                  <div>
                    <h3 className="font-semibold">{coachMap[showCoachMembers]?.name}</h3>
                    <p className="text-xs text-muted-foreground">{coachMap[showCoachMembers]?.email}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowCoachMembers(null)}>
                  {isAr ? 'إغلاق' : 'Close'}
                </Button>
              </div>

              <div className="border-t border-white/5 pt-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  {isAr ? 'الأعضاء المخصصين' : 'Assigned Members'} ({coachMembers?.length ?? 0})
                </h4>
                {coachMembersLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
                  </div>
                ) : (coachMembers || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    {isAr ? 'لا يوجد أعضاء مخصصين لهذا المدرب' : 'No members assigned to this coach'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {(coachMembers || []).map((m: any) => (
                      <div key={m.id} className="glass-card p-3 flex items-center gap-3 border-white/5">
                        <CoachAvatar name={m.name} url={m.profileImageUrl} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{m.name}</p>
                          <p className="text-xs text-muted-foreground">{m.email}</p>
                        </div>
                        <Badge variant="outline" className="border-white/10 text-xs text-muted-foreground">
                          {m.subscriptionEndDate
                            ? (isAr ? 'نشط' : 'Active')
                            : (isAr ? 'غير مؤكد' : 'Unconfirmed')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Coach grid */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              {isAr ? `المدربين (${coachesList?.length ?? 0})` : `Trainers (${coachesList?.length ?? 0})`}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {(coachesList || []).map((coach: any) => (
                <div
                  key={coach.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setShowCoachMembers(coach.id)}
                  onKeyDown={(e) => e.key === 'Enter' && setShowCoachMembers(coach.id)}
                  className="glass-card p-5 border-white/5 hover:border-primary/30 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <CoachAvatar name={coach.name} url={coach.profileImageUrl} size="lg" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{coach.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{coach.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                    <span className="text-xs text-muted-foreground">
                      {isAr ? 'عرض الأعضاء' : 'View members'}
                    </span>
                    <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              ))}
              {(coachesList || []).length === 0 && (
                <div className="col-span-full text-center py-16">
                  <UserCircle className="h-16 w-16 mx-auto text-muted-foreground/20 mb-4" />
                  <p className="text-muted-foreground">
                    {isAr ? 'لا يوجد مدربين' : 'No trainers found'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}

function ExerciseForm({ initial, categories, lang, onSubmit, isPending }: any) {
  const [form, setForm] = useState({ name: initial?.name || '', nameAr: initial?.nameAr || '', videoUrl: initial?.videoUrl || '', imageUrl: initial?.imageUrl || '', categoryId: initial?.categoryId || '', defaultSets: initial?.defaultSets || 3, defaultReps: initial?.defaultReps || 12, defaultWeight: initial?.defaultWeight || 0 });
  const [videoPreview, setVideoPreview] = useState(form.videoUrl);
  const isAr = lang === 'ar';
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <Input placeholder="Name (English)" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="bg-black/20" required />
      <Input placeholder="الاسم بالعربية" value={form.nameAr} onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))} className="bg-black/20" dir="rtl" required />
      <Select value={form.categoryId} onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}>
        <SelectTrigger className="bg-black/20"><SelectValue placeholder="Select category" /></SelectTrigger>
        <SelectContent>{categories.map((cat: any) => <SelectItem key={cat.id} value={cat.id}>{lang === 'ar' ? cat.nameAr : cat.name}</SelectItem>)}</SelectContent>
      </Select>
      <ImageUpload
        value={form.imageUrl || undefined}
        onChange={(url) => setForm((f) => ({ ...f, imageUrl: url || '' }))}
        label="Exercise Image"
        labelAr="صورة التمرين"
        isAr={isAr}
      />
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">{isAr ? 'رابط الفيديو' : 'Video URL'}</label>
        <Input placeholder="Video URL (YouTube or direct)" value={form.videoUrl}
          onChange={(e) => { setForm((f) => ({ ...f, videoUrl: e.target.value })); setVideoPreview(e.target.value); }} className="bg-black/20" />
        <VideoPreview url={videoPreview} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="text-xs text-muted-foreground">Sets</label><Input type="number" value={form.defaultSets} onChange={(e) => setForm((f) => ({ ...f, defaultSets: +e.target.value }))} className="bg-black/20" min={1} /></div>
        <div><label className="text-xs text-muted-foreground">Reps</label><Input type="number" value={form.defaultReps} onChange={(e) => setForm((f) => ({ ...f, defaultReps: +e.target.value }))} className="bg-black/20" min={1} /></div>
        <div><label className="text-xs text-muted-foreground">Weight (kg)</label><Input type="number" value={form.defaultWeight} onChange={(e) => setForm((f) => ({ ...f, defaultWeight: +e.target.value }))} className="bg-black/20" min={0} /></div>
      </div>
      <Button type="submit" className="w-full glow-hover" disabled={isPending}>{isPending ? 'Saving…' : 'Save Exercise'}</Button>
    </form>
  );
}
