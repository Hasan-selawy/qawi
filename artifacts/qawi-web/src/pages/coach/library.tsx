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
import { Loader2, Plus, Play, Search } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function Library() {
  const { t, lang } = useLanguage();
  const queryClient = useQueryClient();
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

  const addExercise = useMutation({
    mutationFn: (data: any) => apiFetch('/exercises/library', { method: 'POST', data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises', 'library'] });
      toast.success('Exercise added to library');
    },
    onError: (err: any) => toast.error(err.error || 'Failed'),
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
          <Dialog>
            <DialogTrigger asChild><Button className="glow-hover"><Plus className="mr-2 h-4 w-4" /> Add Custom Exercise</Button></DialogTrigger>
            <DialogContent className="glass-card border-white/10 sm:max-w-md">
              <DialogHeader><DialogTitle>New Exercise</DialogTitle></DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  addExercise.mutate({
                    name: fd.get('name'),
                    nameAr: fd.get('nameAr'),
                    categoryId: fd.get('categoryId'),
                    defaultSets: Number(fd.get('defaultSets')),
                    defaultReps: Number(fd.get('defaultReps')),
                    videoUrl: fd.get('videoUrl'),
                  });
                }}
                className="space-y-4"
              >
                <Input name="name" placeholder="English Name" required className="bg-black/20" />
                <Input name="nameAr" placeholder="Arabic Name" className="bg-black/20" dir="rtl" />
                <Select name="categoryId" required>
                  <SelectTrigger className="bg-black/20"><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    {categories?.map((c: any) => <SelectItem key={c.id} value={c.id}>{pickName(lang, c)}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-4">
                  <Input name="defaultSets" type="number" placeholder="Default Sets" defaultValue={3} required className="bg-black/20" />
                  <Input name="defaultReps" type="number" placeholder="Default Reps" defaultValue={10} required className="bg-black/20" />
                </div>
                <Input name="videoUrl" placeholder="Video URL (optional)" className="bg-black/20" />
                <Button type="submit" className="w-full" disabled={addExercise.isPending}>
                  {addExercise.isPending ? <Loader2 className="animate-spin" /> : 'Save Exercise'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
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
              <div key={ex.id} className="glass-card p-5 border-white/5 hover:border-primary/30 transition-colors flex flex-col relative overflow-hidden group">
                <div className="absolute -right-6 -top-6 text-9xl opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                  {getEmojiForCategory(cat?.name)}
                </div>
                <div className="mb-6 relative z-10">
                  <h3 className="text-2xl font-bold leading-tight mb-1" dir={lang === 'ar' ? 'rtl' : 'ltr'}>{pickName(lang, ex)}</h3>
                </div>
                <div className="mt-auto flex items-center justify-between relative z-10 pt-4 border-t border-white/5">
                  <span className="bg-black/40 text-muted-foreground px-2 py-1 rounded-md text-xs font-bold font-mono">
                    {ex.defaultSets} × {ex.defaultReps}
                  </span>
                  {ex.videoUrl && (
                    <a href={ex.videoUrl} target="_blank" rel="noreferrer" className="text-red-500 hover:text-red-400 transition-colors p-1 bg-red-500/10 rounded-full hover:bg-red-500/20">
                      <Play size={20} className="fill-current" />
                    </a>
                  )}
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
