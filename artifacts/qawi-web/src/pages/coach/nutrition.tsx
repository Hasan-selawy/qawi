import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { useLanguage } from '@/hooks/use-language';
import { useGymConfig } from '@/hooks/use-gym-config';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { GradientAvatar } from '@/components/GradientAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Plus, Trash2, UtensilsCrossed } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type CoachMember = { id: string; name: string; email: string };
type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
type Meal = { id: string; mealType: MealType; description: string; descriptionAr: string; calories: number; protein: number; orderIndex: number };
type Plan = { id: string; memberId: string; coachId: string; createdAt: string; meals: Meal[] };

const MEAL_TYPES: MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];
const MEAL_LABELS: Record<MealType, { en: string; ar: string }> = {
  BREAKFAST: { en: 'Breakfast', ar: 'الإفطار' },
  LUNCH:     { en: 'Lunch',     ar: 'الغداء' },
  DINNER:    { en: 'Dinner',    ar: 'العشاء' },
  SNACK:     { en: 'Snack',     ar: 'وجبة خفيفة' },
};

type DraftMeal = { tempId: string; mealType: MealType; description: string; descriptionAr: string; calories: string; protein: string };

function mkDraft(): DraftMeal {
  return { tempId: Math.random().toString(36).slice(2), mealType: 'BREAKFAST', description: '', descriptionAr: '', calories: '', protein: '' };
}

export default function CoachNutrition() {
  const { lang } = useLanguage();
  const { features } = useGymConfig();
  const qc = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [meals, setMeals] = useState<DraftMeal[]>([mkDraft()]);

  const isAr = lang === 'ar';

  const members = useQuery<CoachMember[]>({
    queryKey: ['coach', 'members'],
    queryFn: () => apiFetch('/coach/members'),
  });

  const plans = useQuery<Plan[]>({
    queryKey: ['nutrition', 'member', selectedId],
    queryFn: () => apiFetch(`/nutrition/member/${selectedId}`),
    enabled: !!selectedId,
  });

  const createPlan = useMutation({
    mutationFn: async () => {
      const plan = await apiFetch<any>('/nutrition', { method: 'POST', data: { memberId: selectedId } });
      for (const m of meals) {
        await apiFetch(`/nutrition/${plan.id}/meals`, {
          method: 'POST',
          data: {
            mealType: m.mealType,
            description: m.description,
            descriptionAr: m.descriptionAr || m.description,
            calories: parseInt(m.calories, 10) || 0,
            protein: parseInt(m.protein, 10) || 0,
          },
        });
      }
    },
    onSuccess: () => {
      toast.success(isAr ? 'تم حفظ خطة الغذاء' : 'Nutrition plan saved');
      qc.invalidateQueries({ queryKey: ['nutrition', 'member', selectedId] });
      setShowCreate(false);
      setMeals([mkDraft()]);
    },
    onError: (e: any) => toast.error((isAr ? e?.messageAr : e?.error) || 'Failed to save plan'),
  });

  const deletePlan = useMutation({
    mutationFn: (planId: string) => apiFetch(`/nutrition/${planId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(isAr ? 'تم حذف الخطة' : 'Plan deleted');
      qc.invalidateQueries({ queryKey: ['nutrition', 'member', selectedId] });
    },
    onError: (e: any) => toast.error((isAr ? e?.messageAr : e?.error) || 'Failed to delete plan'),
  });

  const updateMeal = (id: string, patch: Partial<DraftMeal>) =>
    setMeals((arr) => arr.map((m) => (m.tempId === id ? { ...m, ...patch } : m)));

  const canSave = !!selectedId && meals.length > 0 && meals.every((m) => m.description.trim());

  if (!features.nutritionEnabled) {
    return (
      <PageWrapper>
        <PageHeader title={isAr ? 'التغذية' : 'Nutrition'} />
        <div className="glass-card p-12 text-center text-muted-foreground">
          <UtensilsCrossed className="mx-auto mb-4 h-10 w-10 opacity-40" />
          <p>{isAr ? 'ميزة التغذية غير مفعّلة لهذا الصالة.' : 'Nutrition is not enabled for this gym.'}</p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageHeader
        title={isAr ? 'خطط التغذية' : 'Nutrition Plans'}
        actions={
          selectedId ? (
            <Button onClick={() => setShowCreate(true)} className="glow-hover">
              <Plus className="mr-2 h-4 w-4" />
              {isAr ? 'خطة جديدة' : 'New Plan'}
            </Button>
          ) : null
        }
      />

      <div className="flex gap-6 h-[calc(100vh-140px)]">
        {/* Member list */}
        <div className="w-72 flex-shrink-0 glass-card border-white/5 overflow-y-auto">
          <div className="p-4 border-b border-white/10 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {isAr ? 'الأعضاء' : 'Members'}
          </div>
          {members.isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary h-6 w-6" /></div>
          ) : !members.data?.length ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              {isAr ? 'لا توجد أعضاء' : 'No members assigned'}
            </div>
          ) : (
            members.data.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedId(m.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5',
                  selectedId === m.id ? 'bg-primary/10 border-l-2 border-primary' : ''
                )}
              >
                <GradientAvatar name={m.name} size="sm" />
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{m.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Plans panel */}
        <div className="flex-1 overflow-y-auto space-y-4">
          {!selectedId ? (
            <div className="glass-card p-12 text-center text-muted-foreground h-full flex flex-col items-center justify-center">
              <UtensilsCrossed className="h-10 w-10 mb-4 opacity-30" />
              <p>{isAr ? 'اختر عضوًا لعرض خطط التغذية' : 'Select a member to view nutrition plans'}</p>
            </div>
          ) : plans.isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>
          ) : !plans.data?.length ? (
            <div className="glass-card p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-4">
              <UtensilsCrossed className="h-10 w-10 opacity-30" />
              <p>{isAr ? 'لا توجد خطط تغذية لهذا العضو' : 'No nutrition plans for this member'}</p>
              <Button onClick={() => setShowCreate(true)} className="glow-hover">
                <Plus className="mr-2 h-4 w-4" />
                {isAr ? 'إنشاء خطة تغذية' : 'Create Nutrition Plan'}
              </Button>
            </div>
          ) : (
            plans.data.map((plan) => (
              <div key={plan.id} className="glass-card border-white/5 p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-muted-foreground">
                    {new Date(plan.createdAt).toLocaleDateString(isAr ? 'ar-SA' : 'en-US')}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deletePlan.mutate(plan.id)}
                    disabled={deletePlan.isPending}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {plan.meals.map((meal) => (
                    <div key={meal.id} className="flex items-center gap-3 p-3 rounded-lg bg-black/20">
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                        {MEAL_LABELS[meal.mealType][isAr ? 'ar' : 'en']}
                      </span>
                      <span className="flex-1 text-sm">{isAr && meal.descriptionAr ? meal.descriptionAr : meal.description}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{meal.calories} kcal · {meal.protein}g</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create plan dialog */}
      <Dialog open={showCreate} onOpenChange={(v) => { setShowCreate(v); if (!v) setMeals([mkDraft()]); }}>
        <DialogContent className="glass-card border-white/10 sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isAr ? 'إنشاء خطة تغذية' : 'Create Nutrition Plan'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {meals.map((meal, i) => (
              <div key={meal.tempId} className="border border-white/10 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-muted-foreground">
                    {isAr ? `الوجبة ${i + 1}` : `Meal ${i + 1}`}
                  </span>
                  {meals.length > 1 && (
                    <button
                      onClick={() => setMeals((arr) => arr.filter((m) => m.tempId !== meal.tempId))}
                      className="text-destructive hover:opacity-80"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {MEAL_TYPES.map((mt) => (
                    <button
                      key={mt}
                      onClick={() => updateMeal(meal.tempId, { mealType: mt })}
                      className={cn(
                        'text-xs py-1.5 px-2 rounded-md border transition-colors font-medium',
                        meal.mealType === mt
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-black/20 border-white/10 text-muted-foreground hover:border-white/30'
                      )}
                    >
                      {MEAL_LABELS[mt][isAr ? 'ar' : 'en']}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">{isAr ? 'الوصف (EN)' : 'Description (EN)'}</Label>
                    <Input value={meal.description} onChange={(e) => updateMeal(meal.tempId, { description: e.target.value })} className="bg-black/20 mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{isAr ? 'الوصف (AR)' : 'Description (AR)'}</Label>
                    <Input value={meal.descriptionAr} onChange={(e) => updateMeal(meal.tempId, { descriptionAr: e.target.value })} className="bg-black/20 mt-1" dir="rtl" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{isAr ? 'السعرات' : 'Calories (kcal)'}</Label>
                    <Input type="number" value={meal.calories} onChange={(e) => updateMeal(meal.tempId, { calories: e.target.value })} className="bg-black/20 mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{isAr ? 'البروتين (g)' : 'Protein (g)'}</Label>
                    <Input type="number" value={meal.protein} onChange={(e) => updateMeal(meal.tempId, { protein: e.target.value })} className="bg-black/20 mt-1" />
                  </div>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full border-dashed" onClick={() => setMeals((m) => [...m, mkDraft()])}>
              <Plus className="mr-2 h-4 w-4" />
              {isAr ? 'إضافة وجبة' : 'Add Meal'}
            </Button>
            <Button onClick={() => createPlan.mutate()} disabled={!canSave || createPlan.isPending} className="w-full">
              {createPlan.isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
              {isAr ? 'حفظ الخطة' : 'Save Plan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
