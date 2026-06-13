import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UtensilsCrossed, Plus, Trash2, Droplets, Search, Loader2, X,
  ChevronDown, ChevronUp, Flame, Zap, Target,
} from 'lucide-react';
import { apiFetch } from '@/services/api';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const N = {
  calories: '#F59E0B', protein: '#22C55E', carbs: '#3B82F6',
  fat: '#EC4899', water: '#06B6D4', over: '#EF4444',
};

const MEAL_TYPES = [
  { key: 'BREAKFAST', en: 'Breakfast', ar: 'الإفطار', emoji: '🌅' },
  { key: 'LUNCH', en: 'Lunch', ar: 'الغداء', emoji: '☀️' },
  { key: 'DINNER', en: 'Dinner', ar: 'العشاء', emoji: '🌙' },
  { key: 'SNACK', en: 'Snack', ar: 'وجبة خفيفة', emoji: '🍎' },
  { key: 'PRE_WORKOUT', en: 'Pre-Workout', ar: 'قبل التمرين', emoji: '💪' },
  { key: 'POST_WORKOUT', en: 'Post-Workout', ar: 'بعد التمرين', emoji: '⚡' },
];

const UNITS = ['g', 'ml', 'pieces', 'cups', 'tbsp', 'serving'];

function MacroBar({ label, labelAr, consumed, target, color, unit = 'g', isAr }: {
  label: string; labelAr: string; consumed: number; target: number;
  color: string; unit?: string; isAr: boolean;
}) {
  const pct = target > 0 ? Math.min(100, (consumed / target) * 100) : 0;
  const over = consumed > target && target > 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-white/80">{isAr ? labelAr : label}</span>
        <span style={{ color: over ? N.over : 'rgba(255,255,255,0.5)' }}>
          {Math.round(consumed)}{unit}{target > 0 ? ` / ${target}${unit}` : ''}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: over ? N.over : color }}
        />
      </div>
    </div>
  );
}

// ─── Log Food Dialog ──────────────────────────────────────────

function LogFoodDialog({
  memberId, defaultMeal, isAr, onClose,
}: {
  memberId: string; defaultMeal: string; isAr: boolean; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'ai' | 'manual'>('ai');
  const [foodQuery, setFoodQuery] = useState('');
  const [qty, setQty] = useState('100');
  const [unit, setUnit] = useState('g');
  const [mealType, setMealType] = useState(defaultMeal);
  const [calcResult, setCalcResult] = useState<any>(null);
  const [calculating, setCalculating] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [manual, setManual] = useState({
    foodName: '', foodNameAr: '', quantity: '100', unit: 'g',
    calories: '', protein: '', carbs: '', fat: '', fiber: '', sugar: '',
  });

  const handleSearch = async (q: string) => {
    setFoodQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await apiFetch<any[]>(`/nutrition/search?q=${encodeURIComponent(q)}`);
      setSearchResults(res ?? []);
    } finally { setSearching(false); }
  };

  const pickFromSearch = (item: any) => {
    setFoodQuery(isAr && item.foodNameAr ? item.foodNameAr : item.foodName);
    setQty(String(item.defaultQuantity ?? 100));
    setUnit(item.defaultUnit ?? 'g');
    setSearchResults([]);
    setCalcResult(null);
  };

  const handleCalculate = async () => {
    if (!foodQuery.trim()) return;
    setCalculating(true);
    setCalcResult(null);
    try {
      const res = await apiFetch<any>('/nutrition/calculate', {
        method: 'POST',
        data: { foodName: foodQuery.trim(), quantity: parseFloat(qty) || 100, unit },
      });
      setCalcResult(res);
    } catch (e: any) {
      toast.error((isAr ? e?.messageAr : e?.error) || (isAr ? 'فشل في الحساب' : 'Failed to calculate'));
    } finally { setCalculating(false); }
  };

  const logAI = useMutation({
    mutationFn: () => apiFetch('/nutrition/log', {
      method: 'POST',
      data: { memberId, foodName: foodQuery.trim(), quantity: parseFloat(qty) || 100, unit, mealType },
    }),
    onSuccess: () => {
      toast.success(isAr ? 'تم تسجيل الطعام' : 'Food logged');
      qc.invalidateQueries({ queryKey: ['nutrition', 'today', memberId] });
      onClose();
    },
    onError: (e: any) => toast.error((isAr ? e?.messageAr : e?.error) || 'Failed to log'),
  });

  const logManual = useMutation({
    mutationFn: () => apiFetch('/nutrition/log/manual', {
      method: 'POST',
      data: {
        memberId,
        foodName: manual.foodName,
        foodNameAr: manual.foodNameAr,
        quantity: parseFloat(manual.quantity) || 100,
        unit: manual.unit,
        mealType,
        calories: parseFloat(manual.calories) || 0,
        protein: parseFloat(manual.protein) || 0,
        carbs: parseFloat(manual.carbs) || 0,
        fat: parseFloat(manual.fat) || 0,
        fiber: parseFloat(manual.fiber) || null,
        sugar: parseFloat(manual.sugar) || null,
      },
    }),
    onSuccess: () => {
      toast.success(isAr ? 'تم تسجيل الطعام' : 'Food logged');
      qc.invalidateQueries({ queryKey: ['nutrition', 'today', memberId] });
      onClose();
    },
    onError: (e: any) => toast.error((isAr ? e?.messageAr : e?.error) || 'Failed to log'),
  });

  return (
    <DialogContent className="glass-card border-white/10 max-w-md max-h-[90vh] overflow-y-auto">
      <DialogTitle>{isAr ? 'تسجيل طعام' : 'Log Food'}</DialogTitle>
      <DialogDescription className="text-muted-foreground text-sm">
        {isAr ? 'ابحث أو أدخل قيم الطعام يدوياً' : 'Search food or enter values manually'}
      </DialogDescription>

      {/* Meal type */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        {MEAL_TYPES.map((m) => (
          <button
            key={m.key}
            onClick={() => setMealType(m.key)}
            className={cn(
              'px-2 py-1 rounded text-xs font-medium border transition-colors',
              mealType === m.key ? 'border-primary bg-primary/15 text-primary' : 'border-white/10 bg-black/20 text-muted-foreground',
            )}
          >
            {m.emoji} {isAr ? m.ar : m.en}
          </button>
        ))}
      </div>

      {/* Tab switch */}
      <div className="flex rounded-lg overflow-hidden border border-white/10">
        {[{ k: 'ai', en: 'AI Search', ar: 'بحث ذكي' }, { k: 'manual', en: 'Manual', ar: 'يدوي' }].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k as 'ai' | 'manual')}
            className={cn(
              'flex-1 py-2 text-sm font-medium transition-colors',
              tab === t.k ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-white/5',
            )}
          >
            {isAr ? t.ar : t.en}
          </button>
        ))}
      </div>

      {tab === 'ai' ? (
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              className="pl-8 bg-black/20 border-white/10"
              placeholder={isAr ? 'اسم الطعام مثل: شاورما، أرز...' : 'Food name e.g. shawarma, rice...'}
              value={foodQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
            {searching && <Loader2 size={14} className="absolute right-3 top-2.5 animate-spin text-muted-foreground" />}
          </div>
          {searchResults.length > 0 && (
            <div className="border border-white/10 rounded-lg overflow-hidden bg-black/30">
              {searchResults.map((item) => (
                <button
                  key={item.id}
                  onClick={() => pickFromSearch(item)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-white/5 border-b border-white/5 last:border-0"
                >
                  <span className="text-white">{isAr && item.foodNameAr ? item.foodNameAr : item.foodName}</span>
                  <span className="text-muted-foreground text-xs ml-2">
                    {item.calories} kcal / {item.defaultQuantity}{item.defaultUnit}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Quantity + unit */}
          <div className="flex gap-2">
            <Input
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="bg-black/20 border-white/10 w-24 shrink-0"
              placeholder="100"
            />
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="flex-1 bg-black/20 border border-white/10 rounded-md text-sm text-white px-2"
            >
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            <Button variant="outline" size="sm" onClick={handleCalculate} disabled={calculating || !foodQuery.trim()} className="shrink-0 border-white/20">
              {calculating ? <Loader2 size={14} className="animate-spin" /> : isAr ? 'احسب' : 'Calc'}
            </Button>
          </div>

          {/* AI Result */}
          {calcResult && (
            <div className="glass-card border-white/5 rounded-xl p-3 space-y-2">
              <p className="text-sm font-semibold text-white">
                {isAr && calcResult.foodNameAr ? calcResult.foodNameAr : calcResult.foodName}
                <span className="text-xs text-muted-foreground ml-2">
                  ({Math.round(calcResult.confidence * 100)}% {isAr ? 'دقة' : 'confidence'})
                </span>
              </p>
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { l: isAr ? 'سعرات' : 'Cal', v: Math.round(calcResult.calories), c: N.calories, u: '' },
                  { l: isAr ? 'بروتين' : 'Prot', v: Math.round(calcResult.protein), c: N.protein, u: 'g' },
                  { l: isAr ? 'كربوهيدرات' : 'Carbs', v: Math.round(calcResult.carbs), c: N.carbs, u: 'g' },
                  { l: isAr ? 'دهون' : 'Fat', v: Math.round(calcResult.fat), c: N.fat, u: 'g' },
                ].map(({ l, v, c, u }) => (
                  <div key={l} className="bg-white/5 rounded p-2">
                    <div className="text-lg font-bold" style={{ color: c }}>{v}{u}</div>
                    <div className="text-xs text-muted-foreground">{l}</div>
                  </div>
                ))}
              </div>
              <Button onClick={() => logAI.mutate()} disabled={logAI.isPending} className="w-full" size="sm">
                {logAI.isPending ? <Loader2 size={14} className="mr-2 animate-spin" /> : null}
                {isAr ? 'تسجيل في السجل' : 'Log this food'}
              </Button>
            </div>
          )}

          {!calcResult && foodQuery.trim() && (
            <Button onClick={handleCalculate} disabled={calculating} className="w-full" variant="outline">
              {calculating ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Flame size={14} className="mr-2" />}
              {isAr ? 'احسب القيم الغذائية بالذكاء الاصطناعي' : 'Calculate nutrition with AI'}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">{isAr ? 'اسم الطعام (عربي)' : 'Food (Arabic)'}</Label>
              <Input dir="rtl" value={manual.foodNameAr} onChange={(e) => setManual((f) => ({ ...f, foodNameAr: e.target.value }))} className="bg-black/20 border-white/10" placeholder="شاورما" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">{isAr ? 'اسم الطعام (إنجليزي)' : 'Food (English)'}</Label>
              <Input value={manual.foodName} onChange={(e) => setManual((f) => ({ ...f, foodName: e.target.value }))} className="bg-black/20 border-white/10" placeholder="Shawarma" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1 block">{isAr ? 'الكمية' : 'Quantity'}</Label>
              <Input type="number" value={manual.quantity} onChange={(e) => setManual((f) => ({ ...f, quantity: e.target.value }))} className="bg-black/20 border-white/10" />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1 block">{isAr ? 'الوحدة' : 'Unit'}</Label>
              <select value={manual.unit} onChange={(e) => setManual((f) => ({ ...f, unit: e.target.value }))} className="w-full bg-black/20 border border-white/10 rounded-md text-sm text-white px-2 py-2">
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { k: 'calories', l: 'Calories', la: 'سعرات', c: N.calories, u: 'kcal' },
              { k: 'protein', l: 'Protein', la: 'بروتين', c: N.protein, u: 'g' },
              { k: 'carbs', l: 'Carbs', la: 'كربوهيدرات', c: N.carbs, u: 'g' },
              { k: 'fat', l: 'Fat', la: 'دهون', c: N.fat, u: 'g' },
              { k: 'fiber', l: 'Fiber', la: 'ألياف', c: 'rgba(255,255,255,0.4)', u: 'g' },
              { k: 'sugar', l: 'Sugar', la: 'سكر', c: 'rgba(255,255,255,0.4)', u: 'g' },
            ].map(({ k, l, la, c, u }) => (
              <div key={k}>
                <Label className="text-xs mb-1 block" style={{ color: c }}>{isAr ? la : l} ({u})</Label>
                <Input
                  type="number"
                  value={manual[k as keyof typeof manual]}
                  onChange={(e) => setManual((f) => ({ ...f, [k]: e.target.value }))}
                  className="bg-black/20 border-white/10"
                  placeholder="0"
                />
              </div>
            ))}
          </div>
          <Button
            onClick={() => logManual.mutate()}
            disabled={logManual.isPending || !manual.foodName.trim()}
            className="w-full"
          >
            {logManual.isPending ? <Loader2 size={14} className="mr-2 animate-spin" /> : null}
            {isAr ? 'تسجيل يدوي' : 'Log manually'}
          </Button>
        </div>
      )}
    </DialogContent>
  );
}

// ─── Water Log Button ─────────────────────────────────────────

function WaterSection({ memberId, isAr }: { memberId: string; isAr: boolean }) {
  const qc = useQueryClient();
  const amounts = [0.25, 0.5, 1, 1.5];

  const add = useMutation({
    mutationFn: (amount: number) => apiFetch('/nutrition/water', {
      method: 'POST',
      data: { memberId, amount },
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nutrition', 'today', memberId] });
    },
    onError: (e: any) => toast.error((isAr ? e?.messageAr : e?.error) || 'Failed'),
  });

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Droplets size={16} style={{ color: N.water }} />
      <span className="text-sm text-muted-foreground">{isAr ? 'أضف ماء:' : 'Add water:'}</span>
      {amounts.map((a) => (
        <button
          key={a}
          onClick={() => add.mutate(a)}
          disabled={add.isPending}
          className="px-2 py-1 text-xs rounded-lg border border-white/10 bg-black/20 hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-colors"
          style={{ color: N.water }}
        >
          +{a}L
        </button>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────

export default function MemberNutrition() {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const isAr = lang === 'ar';
  const memberId = user?.id ?? '';
  const [logMeal, setLogMeal] = useState<string | null>(null);
  const [expandedMeals, setExpandedMeals] = useState<Record<string, boolean>>({
    BREAKFAST: true, LUNCH: true, DINNER: true,
  });
  const [showGoalsDialog, setShowGoalsDialog] = useState(false);
  const [goalsForm, setGoalsForm] = useState({
    calories: 2000, protein: 150, carbs: 200, fat: 65, water: 2.5, goal: '',
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['nutrition', 'today', memberId],
    queryFn: () => apiFetch<any>(`/nutrition/log/today/${memberId}`),
    enabled: !!memberId,
    refetchInterval: 60_000,
  });

  const qc = useQueryClient();
  const deleteEntry = useMutation({
    mutationFn: (id: string) => apiFetch(`/nutrition/log/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(isAr ? 'تم الحذف' : 'Deleted');
      qc.invalidateQueries({ queryKey: ['nutrition', 'today', memberId] });
    },
  });

  const setGoals = useMutation({
    mutationFn: () =>
      apiFetch('/nutrition/targets', {
        method: 'POST',
        data: {
          memberId,
          targetCalories: goalsForm.calories,
          targetProtein: goalsForm.protein,
          targetCarbs: goalsForm.carbs,
          targetFat: goalsForm.fat,
          targetWater: goalsForm.water,
          goal: goalsForm.goal || undefined,
        },
      }),
    onSuccess: () => {
      toast.success(isAr ? 'تم حفظ الأهداف!' : 'Goals saved!');
      setShowGoalsDialog(false);
      qc.invalidateQueries({ queryKey: ['nutrition', 'today', memberId] });
    },
    onError: (e: any) => toast.error(e?.body?.error || (isAr ? 'فشل الحفظ' : 'Failed to save')),
  });

  const totals = data?.totals;
  const target = data?.target;
  const entriesByMeal: Record<string, any[]> = data?.entriesByMeal ?? {};
  const suggestions: any[] = data?.suggestions ?? [];

  const calorieConsumed = totals?.calories?.consumed ?? 0;
  const calorieTarget = totals?.calories?.target ?? 0;
  const caloriePct = calorieTarget > 0 ? Math.min(100, (calorieConsumed / calorieTarget) * 100) : 0;
  const calorieOver = calorieConsumed > calorieTarget && calorieTarget > 0;

  const MEAL_ORDER = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'PRE_WORKOUT', 'POST_WORKOUT'];
  const mealDef = Object.fromEntries(MEAL_TYPES.map((m) => [m.key, m]));

  return (
    <PageWrapper>
      <PageHeader
        title={isAr ? 'سجل التغذية' : 'Nutrition Log'}
        subtitle={isAr ? 'تتبع وجباتك اليومية' : 'Track your daily meals'}
        actions={
          <div className="flex gap-2">
            {user?.selfTrainingEnabled && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (target) {
                    setGoalsForm({
                      calories: target.targetCalories ?? 2000,
                      protein: target.targetProtein ?? 150,
                      carbs: target.targetCarbs ?? 200,
                      fat: target.targetFat ?? 65,
                      water: target.targetWater ?? 2.5,
                      goal: target.goal ?? '',
                    });
                  }
                  setShowGoalsDialog(true);
                }}
                className="gap-1 border-primary/40 text-primary hover:bg-primary/10"
              >
                <Target size={14} />
                {isAr ? 'أهدافي' : 'My Goals'}
              </Button>
            )}
            <Button size="sm" onClick={() => setLogMeal('SNACK')} className="gap-1">
              <Plus size={14} /> {isAr ? 'إضافة طعام' : 'Log Food'}
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      ) : (
        <div className="space-y-4 max-w-2xl">
          {/* Calorie ring + summary */}
          <div className="glass-card border-white/5 rounded-2xl p-5">
            <div className="flex items-center gap-6">
              {/* Simple ring */}
              <div className="relative w-24 h-24 shrink-0">
                <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
                  <circle cx="48" cy="48" r="38" fill="transparent" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
                  <circle
                    cx="48" cy="48" r="38" fill="transparent"
                    stroke={calorieOver ? N.over : N.calories}
                    strokeWidth="10"
                    strokeDasharray={`${2 * Math.PI * 38}`}
                    strokeDashoffset={`${2 * Math.PI * 38 * (1 - caloriePct / 100)}`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-bold" style={{ color: calorieOver ? N.over : N.calories }}>
                    {Math.round(calorieConsumed)}
                  </span>
                  <span className="text-xs text-muted-foreground">kcal</span>
                </div>
              </div>

              {/* Macros */}
              <div className="flex-1 space-y-2.5">
                <MacroBar label="Calories" labelAr="سعرات" unit=" kcal"
                  consumed={calorieConsumed} target={calorieTarget}
                  color={N.calories} isAr={isAr} />
                <MacroBar label="Protein" labelAr="بروتين"
                  consumed={totals?.protein?.consumed ?? 0} target={totals?.protein?.target ?? 0}
                  color={N.protein} isAr={isAr} />
                <MacroBar label="Carbs" labelAr="كربوهيدرات"
                  consumed={totals?.carbs?.consumed ?? 0} target={totals?.carbs?.target ?? 0}
                  color={N.carbs} isAr={isAr} />
                <MacroBar label="Fat" labelAr="دهون"
                  consumed={totals?.fat?.consumed ?? 0} target={totals?.fat?.target ?? 0}
                  color={N.fat} isAr={isAr} />
              </div>
            </div>

            {/* Water */}
            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white flex items-center gap-1.5">
                  <Droplets size={14} style={{ color: N.water }} />
                  {isAr ? 'الماء' : 'Water'}
                </span>
                <span style={{ color: N.water }} className="text-sm">
                  {(totals?.water?.consumed ?? 0).toFixed(1)}L / {totals?.water?.target ?? 2}L
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/10 mb-2">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (totals?.water?.percentage ?? 0))}%`,
                    backgroundColor: N.water,
                  }}
                />
              </div>
              <WaterSection memberId={memberId} isAr={isAr} />
            </div>
          </div>

          {/* Meal Sections */}
          {MEAL_ORDER.map((mealKey) => {
            const entries: any[] = entriesByMeal[mealKey] ?? [];
            const m = mealDef[mealKey];
            const mealCal = entries.reduce((s, e) => s + (e.calories ?? 0), 0);
            const expanded = expandedMeals[mealKey] ?? false;

            return (
              <div key={mealKey} className="glass-card border-white/5 rounded-2xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
                  onClick={() => setExpandedMeals((p) => ({ ...p, [mealKey]: !p[mealKey] }))}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{m?.emoji}</span>
                    <div className="text-left rtl:text-right">
                      <span className="text-sm font-semibold text-white">{isAr ? m?.ar : m?.en}</span>
                      {entries.length > 0 && (
                        <span className="text-xs text-muted-foreground ml-2">
                          {Math.round(mealCal)} kcal · {entries.length} {isAr ? 'سجل' : 'items'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setLogMeal(mealKey); }}
                      className="p-1 rounded-lg hover:bg-primary/15 text-primary transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                    {expanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                  </div>
                </button>

                {expanded && (
                  <div className="border-t border-white/5">
                    {entries.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                        {isAr ? 'لا توجد وجبات' : 'No entries yet'}
                      </div>
                    ) : (
                      <div className="divide-y divide-white/5">
                        {entries.map((e: any) => (
                          <div key={e.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white truncate">
                                {isAr && e.foodNameAr ? e.foodNameAr : e.foodName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {e.quantity}{e.unit} · {Math.round(e.calories ?? 0)} kcal · P:{Math.round(e.protein ?? 0)}g C:{Math.round(e.carbs ?? 0)}g F:{Math.round(e.fat ?? 0)}g
                              </p>
                            </div>
                            <button
                              onClick={() => deleteEntry.mutate(e.id)}
                              className="text-red-400/40 hover:text-red-400 transition-colors shrink-0"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Today's Plan Day card */}
          {data?.todayPlanDay && (
            <div className="glass-card border-primary/15 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm">📅</span>
                <h3 className="text-sm font-semibold text-white">
                  {isAr ? `خطة اليوم — ${data.todayPlanDay.dayNameAr ?? data.todayPlanDay.dayName}` : `Today's Plan — ${data.todayPlanDay.dayName}`}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary ml-auto">
                  {isAr ? 'نشطة' : 'Active Plan'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { l: isAr ? 'سعرات' : 'Cal', v: `${data.todayPlanDay.targetCalories ?? '—'} kcal`, c: N.calories },
                  { l: isAr ? 'بروتين' : 'Prot', v: `${data.todayPlanDay.targetProtein ?? '—'}g`, c: N.protein },
                  { l: isAr ? 'كربوهيدرات' : 'Carbs', v: `${data.todayPlanDay.targetCarbs ?? '—'}g`, c: N.carbs },
                  { l: isAr ? 'دهون' : 'Fat', v: `${data.todayPlanDay.targetFat ?? '—'}g`, c: N.fat },
                  { l: isAr ? 'ماء' : 'Water', v: `${data.todayPlanDay.targetWater ?? 2}L`, c: N.water },
                ].map(({ l, v, c }) => (
                  <div key={l} className="bg-white/5 rounded-lg p-2 text-center">
                    <div className="text-muted-foreground mb-0.5">{l}</div>
                    <div className="font-semibold" style={{ color: c }}>{v}</div>
                  </div>
                ))}
              </div>
              {(data.todayPlanDay.notesAr || data.todayPlanDay.notes) && (
                <p className="text-xs text-muted-foreground bg-white/5 rounded px-3 py-2 italic">
                  📝 {isAr && data.todayPlanDay.notesAr ? data.todayPlanDay.notesAr : data.todayPlanDay.notes}
                </p>
              )}
            </div>
          )}

          {/* Suggestions from coach/nutritionist */}
          {suggestions.length > 0 && (
            <div className="glass-card border-primary/20 rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-primary mb-3">
                {isAr ? '💡 اقتراحات من مدربك' : '💡 Suggestions from your coach'}
              </h3>
              <div className="space-y-2">
                {suggestions.map((s: any) => {
                  const m = mealDef[s.mealType];
                  return (
                    <div key={s.id} className="bg-white/5 rounded-lg p-3">
                      <div className="text-xs text-muted-foreground mb-0.5">
                        {m?.emoji} {isAr ? m?.ar : m?.en}
                      </div>
                      <p className="text-sm text-white">
                        {isAr && s.descriptionAr ? s.descriptionAr : s.description}
                      </p>
                      {(s.targetCalories || s.targetProtein) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {s.targetCalories ? `${s.targetCalories} kcal` : ''}
                          {s.targetProtein ? ` · ${s.targetProtein}g protein` : ''}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!target && (
            <div className="text-center py-5">
              {user?.selfTrainingEnabled ? (
                <div className="glass-card p-5 border-primary/15 max-w-xs mx-auto">
                  <Target size={24} className="text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">
                    {isAr
                      ? 'لم يتم تعيين أهداف تغذية بعد'
                      : 'No nutrition targets set yet'}
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setShowGoalsDialog(true)}
                    className="gap-1"
                  >
                    <Target size={13} />
                    {isAr ? 'تعيين أهدافي' : 'Set My Goals'}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {isAr
                    ? 'لم يتم تعيين أهداف تغذية بعد — تواصل مع مدربك أو أخصائي التغذية'
                    : 'No nutrition targets set yet — ask your coach or nutritionist'}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <Dialog open={!!logMeal} onOpenChange={(v) => !v && setLogMeal(null)}>
        {logMeal && (
          <LogFoodDialog
            memberId={memberId}
            defaultMeal={logMeal}
            isAr={isAr}
            onClose={() => setLogMeal(null)}
          />
        )}
      </Dialog>

      <Dialog open={showGoalsDialog} onOpenChange={(v) => { if (!v) setShowGoalsDialog(false); }}>
        <DialogContent className="bg-[#0d1225] border-white/10 max-w-sm">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <Target size={16} className="text-primary" />
            {isAr ? 'تعيين أهداف التغذية' : 'Set Nutrition Goals'}
          </DialogTitle>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'calories', label: 'Calories', labelAr: 'سعرات', unit: 'kcal', min: 1000, max: 6000, step: 50 },
                { key: 'protein', label: 'Protein', labelAr: 'بروتين', unit: 'g', min: 0, max: 400 },
                { key: 'carbs', label: 'Carbs', labelAr: 'كربوهيدرات', unit: 'g', min: 0, max: 800 },
                { key: 'fat', label: 'Fat', labelAr: 'دهون', unit: 'g', min: 0, max: 300 },
              ].map(({ key, label, labelAr, unit, min, max, step = 1 }) => (
                <div key={key}>
                  <Label className="text-xs text-muted-foreground">
                    {isAr ? labelAr : label} ({unit})
                  </Label>
                  <Input
                    type="number"
                    min={min}
                    max={max}
                    step={step}
                    value={goalsForm[key as keyof typeof goalsForm] as number}
                    onChange={(e) =>
                      setGoalsForm((p) => ({ ...p, [key]: Number(e.target.value) }))
                    }
                    className="bg-black/20 mt-1 h-9 text-sm"
                  />
                </div>
              ))}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                {isAr ? 'الماء (لتر/يوم)' : 'Water (L/day)'}
              </Label>
              <Input
                type="number"
                min={0}
                max={10}
                step={0.25}
                value={goalsForm.water}
                onChange={(e) =>
                  setGoalsForm((p) => ({ ...p, water: Number(e.target.value) }))
                }
                className="bg-black/20 mt-1 h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                {isAr ? 'الهدف (اختياري)' : 'Goal (optional)'}
              </Label>
              <select
                value={goalsForm.goal}
                onChange={(e) => setGoalsForm((p) => ({ ...p, goal: e.target.value }))}
                className="w-full mt-1 h-9 rounded-md bg-black/20 border border-white/10 text-sm px-3 text-foreground"
              >
                <option value="">{isAr ? '— اختر —' : '— Choose —'}</option>
                <option value="WEIGHT_LOSS">{isAr ? 'فقدان الوزن' : 'Weight Loss'}</option>
                <option value="MUSCLE_GAIN">{isAr ? 'بناء العضلات' : 'Muscle Gain'}</option>
                <option value="MAINTENANCE">{isAr ? 'الحفاظ على الوزن' : 'Maintenance'}</option>
                <option value="RECOMPOSITION">{isAr ? 'إعادة التركيب' : 'Recomposition'}</option>
                <option value="PERFORMANCE">{isAr ? 'الأداء الرياضي' : 'Performance'}</option>
              </select>
            </div>
            <Button
              className="w-full"
              onClick={() => setGoals.mutate()}
              disabled={setGoals.isPending}
            >
              {setGoals.isPending
                ? <Loader2 size={14} className="animate-spin mr-2" />
                : <Target size={14} className="mr-2" />}
              {isAr ? 'حفظ الأهداف' : 'Save Goals'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
