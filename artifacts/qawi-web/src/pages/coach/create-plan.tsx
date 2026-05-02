import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { useLanguage } from '@/hooks/use-language';
import { useLocation } from 'wouter';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, ArrowRight, CheckCircle2, Save, Trash2, Plus } from 'lucide-react';
import { format, eachDayOfInterval, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function CreatePlan() {
  const { t, lang } = useLanguage();
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  // URL Params parsing logic manually since wouter doesn't have useSearchParams
  const searchParams = new URLSearchParams(window.location.search);
  const initialMemberId = searchParams.get('memberId') || '';

  const [step, setStep] = useState(1);
  const [planData, setPlanData] = useState({
    name: '', nameAr: '', memberId: initialMemberId, startDate: format(new Date(), 'yyyy-MM-dd'), endDate: format(new Date(Date.now() + 7*24*60*60*1000), 'yyyy-MM-dd')
  });
  const [createdPlanId, setCreatedPlanId] = useState<number | null>(null);
  const [days, setDays] = useState<any[]>([]); // array of { date, isRestDay, id (after creation) }
  
  const [activeDayId, setActiveDayId] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Queries
  const { data: members } = useQuery({ queryKey: ['coach', 'members'], queryFn: () => apiFetch('/coach/members') });
  const { data: categories } = useQuery({ queryKey: ['exercises', 'categories'], queryFn: () => apiFetch('/exercises/categories') });
  const { data: exercises } = useQuery({ 
    queryKey: ['exercises', 'library', categoryFilter, searchQuery], 
    queryFn: () => {
      let url = '/exercises/library';
      const params = new URLSearchParams();
      if (categoryFilter) params.append('category', categoryFilter);
      if (searchQuery) params.append('search', searchQuery);
      if (params.toString()) url += `?${params.toString()}`;
      return apiFetch(url);
    }
  });

  // Mutations
  const createPlanBase = useMutation({
    mutationFn: (data: any) => apiFetch('/workouts', { method: 'POST', data }),
    onSuccess: async (data: any) => {
      setCreatedPlanId(data.id);
      
      // Generate days between start and end
      const dates = eachDayOfInterval({ start: parseISO(planData.startDate), end: parseISO(planData.endDate) });
      const createdDays = [];
      
      for (const d of dates) {
        const isRest = [0, 6].includes(d.getDay()); // Default rest on Sun/Sat
        const dayRes = await apiFetch(`/workouts/${data.id}/days`, { 
          method: 'POST', 
          data: { date: format(d, 'yyyy-MM-dd'), isRestDay: isRest } 
        });
        createdDays.push({ ...dayRes, dateStr: format(d, 'yyyy-MM-dd') });
      }
      
      setDays(createdDays);
      setActiveDayId(createdDays.find(d => !d.isRestDay)?.id || createdDays[0].id);
      setStep(3);
    }
  });

  const toggleRestDay = useMutation({
    mutationFn: ({ dayId, isRestDay }: { dayId: number, isRestDay: boolean }) => 
      apiFetch(`/workouts/days/${dayId}/rest`, { method: 'PUT', data: { isRestDay } }),
    onSuccess: (_, variables) => {
      setDays(prev => prev.map(d => d.id === variables.dayId ? { ...d, isRestDay: variables.isRestDay } : d));
    }
  });

  const addExercise = useMutation({
    mutationFn: ({ dayId, data }: { dayId: number, data: any }) => 
      apiFetch(`/workouts/days/${dayId}/exercises`, { method: 'POST', data }),
    onSuccess: () => {
      toast.success('Exercise added');
      // Ideally refetch the day's exercises, but we don't have that endpoint in the spec for single day.
      // Assuming UI optimism is enough for now or we invalidate the plan query.
    }
  });

  return (
    <PageWrapper className="max-w-5xl mx-auto">
      <PageHeader title={t('plan.create_new')} />

      {/* Progress */}
      <div className="flex gap-2 mb-8">
        {[1, 2, 3].map(i => (
          <div key={i} className={cn("h-2 flex-1 rounded-full transition-all", step >= i ? "bg-primary" : "bg-white/10")} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-card p-8 max-w-2xl mx-auto">
            <h2 className="text-xl font-bold mb-6">Plan Details</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Plan Name</label>
                <Input value={planData.name} onChange={e => setPlanData({ ...planData, name: e.target.value })} className="bg-black/20" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Plan Name (Arabic)</label>
                <Input value={planData.nameAr} onChange={e => setPlanData({ ...planData, nameAr: e.target.value })} className="bg-black/20" dir="rtl" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Assign to Member</label>
                <Select value={planData.memberId} onValueChange={v => setPlanData({ ...planData, memberId: v })}>
                  <SelectTrigger className="bg-black/20"><SelectValue placeholder="Select Member" /></SelectTrigger>
                  <SelectContent>
                    {members?.map((m: any) => <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Start Date</label>
                  <Input type="date" value={planData.startDate} onChange={e => setPlanData({ ...planData, startDate: e.target.value })} className="bg-black/20" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">End Date</label>
                  <Input type="date" value={planData.endDate} onChange={e => setPlanData({ ...planData, endDate: e.target.value })} className="bg-black/20" />
                </div>
              </div>
              
              <div className="pt-6">
                <Button 
                  className="w-full h-12 text-lg" 
                  onClick={() => createPlanBase.mutate({ ...planData, memberId: Number(planData.memberId) })}
                  disabled={!planData.name || !planData.memberId || createPlanBase.isPending}
                >
                  {createPlanBase.isPending ? <Loader2 className="animate-spin" /> : 'Create Framework & Continue'} <ArrowRight className="ml-2" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col lg:flex-row gap-6">
            
            {/* Days Sidebar */}
            <div className="w-full lg:w-64 flex flex-col gap-2">
              <h3 className="font-semibold mb-2">Schedule</h3>
              {days.map(day => {
                const date = parseISO(day.date);
                const isRest = day.isRestDay;
                const isActive = activeDayId === day.id;
                
                return (
                  <div key={day.id} className={cn(
                    "p-3 rounded-xl border transition-all flex justify-between items-center cursor-pointer",
                    isActive ? "border-primary bg-primary/10" : "border-white/5 bg-black/20 hover:border-white/20",
                    isRest && !isActive ? "opacity-60" : ""
                  )} onClick={() => setActiveDayId(day.id)}>
                    <div>
                      <p className="font-medium text-sm">{format(date, 'EEEE')}</p>
                      <p className="text-xs text-muted-foreground">{format(date, 'MMM d')}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={cn("h-7 px-2 text-xs", isRest ? "text-orange-500 hover:text-orange-400" : "text-green-500 hover:text-green-400")}
                      onClick={(e) => { e.stopPropagation(); toggleRestDay.mutate({ dayId: day.id, isRestDay: !isRest }); }}
                    >
                      {isRest ? 'Set Active' : 'Set Rest'}
                    </Button>
                  </div>
                );
              })}
              
              <Button className="mt-4" variant="outline" onClick={() => {
                toast.success('Plan completed successfully!');
                setLocation(`/coach/members/${planData.memberId}`);
              }}>
                <Save className="mr-2 h-4 w-4" /> Finish Plan
              </Button>
            </div>

            {/* Exercise Picker */}
            <div className="flex-1 glass-card p-6 border-white/5">
              {days.find(d => d.id === activeDayId)?.isRestDay ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                  <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-8 w-8 text-orange-500" />
                  </div>
                  <p>This is a rest day. No exercises needed.</p>
                </div>
              ) : (
                <div className="flex flex-col h-full h-[600px]">
                  <div className="flex gap-4 mb-6">
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-[200px] bg-black/20"><SelectValue placeholder="All Categories" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">All Categories</SelectItem>
                        {categories?.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{lang === 'ar' && c.nameAr ? c.nameAr : c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input 
                      placeholder="Search exercises..." 
                      value={searchQuery} 
                      onChange={e => setSearchQuery(e.target.value)} 
                      className="bg-black/20"
                    />
                  </div>
                  
                  <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {exercises?.map((ex: any) => (
                      <div key={ex.id} className="p-4 bg-black/20 rounded-xl border border-white/5 flex flex-col justify-between hover:border-white/10 transition-colors group">
                        <div className="mb-4">
                          <h4 className="font-bold text-lg mb-1 leading-tight">{lang === 'ar' && ex.nameAr ? ex.nameAr : ex.name}</h4>
                          {lang === 'ar' && ex.nameAr && <p className="text-xs text-muted-foreground">{ex.name}</p>}
                        </div>
                        
                        <div className="flex items-center gap-2 mt-auto">
                          <Input type="number" defaultValue={ex.defaultSets || 3} className="h-8 w-16 bg-black/40 text-center" id={`sets-${ex.id}`} />
                          <span className="text-muted-foreground text-xs">sets x</span>
                          <Input type="number" defaultValue={ex.defaultReps || 10} className="h-8 w-16 bg-black/40 text-center" id={`reps-${ex.id}`} />
                          <span className="text-muted-foreground text-xs">reps</span>
                          
                          <Button 
                            size="sm" 
                            className="ml-auto h-8 px-3 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              const sets = (document.getElementById(`sets-${ex.id}`) as HTMLInputElement).value;
                              const reps = (document.getElementById(`reps-${ex.id}`) as HTMLInputElement).value;
                              addExercise.mutate({ dayId: activeDayId!, data: { exerciseId: ex.id, sets: Number(sets), reps: Number(reps) } });
                            }}
                          >
                            <Plus size={16} /> Add
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}