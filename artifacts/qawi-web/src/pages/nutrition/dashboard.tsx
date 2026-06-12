import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import {
  UtensilsCrossed, Target, TrendingUp, Users, ChevronRight, CheckCircle,
  AlertCircle, XCircle, Loader2, Plus, Trash2, Droplets, Flame, Zap,
} from 'lucide-react';
import { apiFetch } from '@/services/api';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { GradientAvatar } from '@/components/GradientAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const N = {
  calories: '#F59E0B',
  protein: '#22C55E',
  carbs: '#3B82F6',
  fat: '#EC4899',
  water: '#06B6D4',
  over: '#EF4444',
};

const GOALS = [
  { key: 'WEIGHT_LOSS', en: 'Weight Loss', ar: 'خسارة وزن' },
  { key: 'MUSCLE_GAIN', en: 'Muscle Gain', ar: 'بناء عضلات' },
  { key: 'MAINTENANCE', en: 'Maintenance', ar: 'محافظة' },
  { key: 'RECOMPOSITION', en: 'Recomposition', ar: 'إعادة تشكيل' },
  { key: 'PERFORMANCE', en: 'Performance', ar: 'أداء رياضي' },
];

const MEAL_LABELS: Record<string, { en: string; ar: string; emoji: string }> = {
  BREAKFAST: { en: 'Breakfast', ar: 'الإفطار', emoji: '🌅' },
  LUNCH: { en: 'Lunch', ar: 'الغداء', emoji: '☀️' },
  DINNER: { en: 'Dinner', ar: 'العشاء', emoji: '🌙' },
  SNACK: { en: 'Snack', ar: 'وجبة خفيفة', emoji: '🍎' },
  PRE_WORKOUT: { en: 'Pre-Workout', ar: 'قبل التمرين', emoji: '💪' },
  POST_WORKOUT: { en: 'Post-Workout', ar: 'بعد التمرين', emoji: '⚡' },
};

const STATUS_CONFIG: Record<string, { color: string; icon: any; en: string; ar: string }> = {
  ON_TRACK: { color: 'text-green-400', icon: CheckCircle, en: 'On Track', ar: 'على المسار' },
  UNDER: { color: 'text-blue-400', icon: AlertCircle, en: 'Under', ar: 'أقل من الهدف' },
  OVER: { color: 'text-red-400', icon: XCircle, en: 'Over', ar: 'تجاوز الهدف' },
  NO_LOG: { color: 'text-yellow-400', icon: AlertCircle, en: 'No Log', ar: 'لا توجد سجلات' },
  NO_TARGET: { color: 'text-muted-foreground', icon: Target, en: 'No Target', ar: 'لا يوجد هدف' },
};

// ─── Macro Progress Bar ───────────────────────────────────────

function MacroBar({
  label, labelAr, consumed, target, color, unit = 'g', isAr,
}: {
  label: string; labelAr: string; consumed: number; target: number;
  color: string; unit?: string; isAr: boolean;
}) {
  const pct = target > 0 ? Math.min(100, (consumed / target) * 100) : 0;
  const over = consumed > target && target > 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-semibold text-white">{isAr ? labelAr : label}</span>
        <span style={{ color: over ? N.over : 'rgba(255,255,255,0.55)' }}>
          {Math.round(consumed)}{unit}{target > 0 ? ` / ${target}${unit}` : ''}
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: over ? N.over : color }}
        />
      </div>
    </div>
  );
}

// ─── Set Target Modal ─────────────────────────────────────────

function SetTargetModal({
  memberId, memberName, existing, isAr, onClose,
}: {
  memberId: string; memberName: string; existing?: any; isAr: boolean; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    targetCalories: String(existing?.targetCalories ?? '2000'),
    targetProtein: String(existing?.targetProtein ?? '150'),
    targetCarbs: String(existing?.targetCarbs ?? '200'),
    targetFat: String(existing?.targetFat ?? '65'),
    targetWater: String(existing?.targetWater ?? '2'),
    goal: existing?.goal ?? 'MAINTENANCE',
    notes: existing?.notes ?? '',
  });

  const save = useMutation({
    mutationFn: () => apiFetch('/nutrition/targets', {
      method: 'POST',
      data: {
        memberId,
        targetCalories: parseInt(form.targetCalories) || 2000,
        targetProtein: parseInt(form.targetProtein) || 150,
        targetCarbs: parseInt(form.targetCarbs) || 200,
        targetFat: parseInt(form.targetFat) || 65,
        targetWater: parseFloat(form.targetWater) || 2,
        goal: form.goal,
        notes: form.notes,
      },
    }),
    onSuccess: () => {
      toast.success(isAr ? 'تم حفظ الأهداف' : 'Targets saved');
      qc.invalidateQueries({ queryKey: ['nutrition', 'staff', 'overview', memberId] });
      qc.invalidateQueries({ queryKey: ['nutrition', 'staff', 'members'] });
      onClose();
    },
    onError: (e: any) => toast.error((isAr ? e?.messageAr : e?.error) || 'Failed to save'),
  });

  const field = (k: keyof typeof form, label: string, labelAr: string, color: string, suffix: string) => (
    <div>
      <Label className="text-xs mb-1 block" style={{ color }}>
        {isAr ? labelAr : label} ({suffix})
      </Label>
      <Input
        type="number"
        value={form[k]}
        onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
        className="bg-black/20 border-white/10"
        placeholder="0"
      />
    </div>
  );

  return (
    <DialogContent className="glass-card border-white/10 max-w-lg">
      <DialogTitle className="text-lg font-bold">
        {isAr ? `أهداف التغذية — ${memberName}` : `Nutrition Targets — ${memberName}`}
      </DialogTitle>
      <DialogDescription className="text-muted-foreground text-sm">
        {isAr ? 'حدد الأهداف اليومية للعضو' : 'Set daily nutrition targets for this member'}
      </DialogDescription>
      <div className="space-y-4 pt-2">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {field('targetCalories', 'Calories', 'سعرات', N.calories, 'kcal')}
          {field('targetProtein', 'Protein', 'بروتين', N.protein, 'g')}
          {field('targetCarbs', 'Carbs', 'كربوهيدرات', N.carbs, 'g')}
          {field('targetFat', 'Fat', 'دهون', N.fat, 'g')}
          {field('targetWater', 'Water', 'ماء', N.water, 'L')}
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">{isAr ? 'الهدف' : 'Goal'}</Label>
          <div className="flex flex-wrap gap-2">
            {GOALS.map((g) => (
              <button
                key={g.key}
                type="button"
                onClick={() => setForm((f) => ({ ...f, goal: g.key }))}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                  form.goal === g.key
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-white/10 bg-black/20 text-muted-foreground hover:border-white/20',
                )}
              >
                {isAr ? g.ar : g.en}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">{isAr ? 'ملاحظات' : 'Notes'}</Label>
          <Input
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="bg-black/20 border-white/10"
            placeholder={isAr ? 'أي ملاحظات خاصة...' : 'Any special notes...'}
          />
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full">
          {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isAr ? 'حفظ الأهداف' : 'Save Targets'}
        </Button>
      </div>
    </DialogContent>
  );
}

// ─── Add Suggestion Modal ─────────────────────────────────────

function AddSuggestionModal({
  memberId, memberName, isAr, onClose,
}: {
  memberId: string; memberName: string; isAr: boolean; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    mealType: 'BREAKFAST', description: '', descriptionAr: '',
    targetCalories: '', targetProtein: '',
  });

  const save = useMutation({
    mutationFn: () => apiFetch('/nutrition/suggestions', {
      method: 'POST',
      data: {
        memberId,
        mealType: form.mealType,
        description: form.description,
        descriptionAr: form.descriptionAr,
        targetCalories: parseInt(form.targetCalories) || null,
        targetProtein: parseInt(form.targetProtein) || null,
      },
    }),
    onSuccess: () => {
      toast.success(isAr ? 'تم إضافة الاقتراح' : 'Suggestion added');
      qc.invalidateQueries({ queryKey: ['nutrition', 'staff', 'overview', memberId] });
      onClose();
    },
    onError: (e: any) => toast.error((isAr ? e?.messageAr : e?.error) || 'Failed to add'),
  });

  return (
    <DialogContent className="glass-card border-white/10 max-w-md">
      <DialogTitle>{isAr ? `اقتراح وجبة — ${memberName}` : `Meal Suggestion — ${memberName}`}</DialogTitle>
      <DialogDescription className="text-muted-foreground text-sm">
        {isAr ? 'أضف اقتراح وجبة مخصص للعضو' : 'Add a custom meal suggestion for this member'}
      </DialogDescription>
      <div className="space-y-4 pt-2">
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">{isAr ? 'نوع الوجبة' : 'Meal Type'}</Label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(MEAL_LABELS).map(([k, v]) => (
              <button
                key={k}
                type="button"
                onClick={() => setForm((f) => ({ ...f, mealType: k }))}
                className={cn(
                  'px-2 py-1 rounded text-xs font-semibold border transition-colors',
                  form.mealType === k ? 'border-primary bg-primary/15 text-primary' : 'border-white/10 bg-black/20 text-muted-foreground',
                )}
              >
                {v.emoji} {isAr ? v.ar : v.en}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">{isAr ? 'الوصف (عربي)' : 'Description (Arabic)'}</Label>
          <Input
            value={form.descriptionAr}
            onChange={(e) => setForm((f) => ({ ...f, descriptionAr: e.target.value }))}
            className="bg-black/20 border-white/10"
            dir="rtl"
            placeholder="مثال: شاورما دجاج مع سلطة..."
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">{isAr ? 'الوصف (إنجليزي)' : 'Description (English)'}</Label>
          <Input
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="bg-black/20 border-white/10"
            placeholder="e.g. Grilled chicken with salad..."
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs mb-1 block" style={{ color: N.calories }}>{isAr ? 'سعرات مستهدفة' : 'Target Cal'}</Label>
            <Input type="number" value={form.targetCalories} onChange={(e) => setForm((f) => ({ ...f, targetCalories: e.target.value }))} className="bg-black/20 border-white/10" placeholder="500" />
          </div>
          <div>
            <Label className="text-xs mb-1 block" style={{ color: N.protein }}>{isAr ? 'بروتين مستهدف' : 'Target Protein'}</Label>
            <Input type="number" value={form.targetProtein} onChange={(e) => setForm((f) => ({ ...f, targetProtein: e.target.value }))} className="bg-black/20 border-white/10" placeholder="40g" />
          </div>
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending || (!form.description && !form.descriptionAr)} className="w-full">
          {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isAr ? 'إضافة الاقتراح' : 'Add Suggestion'}
        </Button>
      </div>
    </DialogContent>
  );
}

// ─── Member Overview Panel ────────────────────────────────────

function MemberOverviewPanel({
  memberId, isAr,
}: {
  memberId: string; isAr: boolean;
}) {
  const qc = useQueryClient();
  const [showTarget, setShowTarget] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(false);

  const { data: overview, isLoading } = useQuery({
    queryKey: ['nutrition', 'staff', 'overview', memberId],
    queryFn: () => apiFetch<any>(`/nutrition/staff/overview/${memberId}`),
    enabled: !!memberId,
  });

  const deleteSuggestion = useMutation({
    mutationFn: (id: string) => apiFetch(`/nutrition/suggestions/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(isAr ? 'تم حذف الاقتراح' : 'Suggestion deleted');
      qc.invalidateQueries({ queryKey: ['nutrition', 'staff', 'overview', memberId] });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    );
  }

  if (!overview) return null;

  const target = overview.target;
  const today = overview.today;
  const totals = today?.totals;
  const history = overview.last7Days ?? [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <GradientAvatar name={overview.name} size="md" />
          <div>
            <h3 className="font-bold text-white">{overview.name}</h3>
            <p className="text-xs text-muted-foreground">{overview.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm" variant="outline"
            className="border-primary/50 text-primary hover:bg-primary/10 text-xs"
            onClick={() => setShowTarget(true)}
          >
            <Target size={14} className="mr-1" />
            {isAr ? 'تعيين أهداف' : 'Set Targets'}
          </Button>
          <Button
            size="sm" variant="outline"
            className="border-white/20 text-muted-foreground hover:bg-white/5 text-xs"
            onClick={() => setShowSuggestion(true)}
          >
            <Plus size={14} className="mr-1" />
            {isAr ? 'اقتراح وجبة' : 'Add Suggestion'}
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Flame, label: isAr ? 'متوسط سعرات' : 'Avg Cal/Day', value: overview.weeklyAvgCalories?.toLocaleString() ?? '—', color: N.calories },
          { icon: Zap, label: isAr ? 'متوسط بروتين' : 'Avg Protein', value: `${overview.weeklyAvgProtein ?? 0}g`, color: N.protein },
          { icon: TrendingUp, label: isAr ? 'التزام 7 أيام' : '7-Day Adherence', value: `${Math.round(overview.adherence7Days ?? 0)}%`, color: overview.adherence7Days >= 70 ? N.protein : overview.adherence7Days >= 40 ? N.calories : N.over },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="glass-card border-white/5 p-3 rounded-xl text-center">
            <Icon size={18} className="mx-auto mb-1" style={{ color }} />
            <div className="text-xl font-bold" style={{ color }}>{value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Today Macros */}
      {totals && (
        <div className="glass-card border-white/5 p-4 rounded-xl space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {isAr ? 'إجمالي اليوم' : "Today's Totals"}
          </h4>
          <MacroBar label="Calories" labelAr="سعرات" unit=" kcal"
            consumed={totals.calories?.consumed ?? 0} target={totals.calories?.target ?? 0}
            color={N.calories} isAr={isAr} />
          <MacroBar label="Protein" labelAr="بروتين"
            consumed={totals.protein?.consumed ?? 0} target={totals.protein?.target ?? 0}
            color={N.protein} isAr={isAr} />
          <MacroBar label="Carbs" labelAr="كربوهيدرات"
            consumed={totals.carbs?.consumed ?? 0} target={totals.carbs?.target ?? 0}
            color={N.carbs} isAr={isAr} />
          <MacroBar label="Fat" labelAr="دهون"
            consumed={totals.fat?.consumed ?? 0} target={totals.fat?.target ?? 0}
            color={N.fat} isAr={isAr} />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Droplets size={14} style={{ color: N.water }} />
              {isAr ? 'الماء' : 'Water'}
            </span>
            <span style={{ color: N.water }}>
              {(totals.water?.consumed ?? 0).toFixed(1)}L / {(totals.water?.target ?? 2)}L
            </span>
          </div>
        </div>
      )}

      {/* Today Meals */}
      {today?.entriesByMeal && Object.keys(today.entriesByMeal).some((k) => (today.entriesByMeal[k] as any[]).length > 0) && (
        <div className="glass-card border-white/5 p-4 rounded-xl">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {isAr ? 'وجبات اليوم' : "Today's Meals"}
          </h4>
          <div className="space-y-3">
            {Object.entries(today.entriesByMeal).map(([meal, entries]) => {
              if (!(entries as any[]).length) return null;
              const ml = MEAL_LABELS[meal] ?? { en: meal, ar: meal, emoji: '🍽' };
              return (
                <div key={meal}>
                  <div className="text-xs text-muted-foreground mb-1">
                    {ml.emoji} {isAr ? ml.ar : ml.en}
                  </div>
                  <div className="space-y-1">
                    {(entries as any[]).map((e: any) => (
                      <div key={e.id} className="flex justify-between text-xs bg-white/5 rounded px-2 py-1">
                        <span className="text-white">{isAr && e.foodNameAr ? e.foodNameAr : e.foodName}</span>
                        <span className="text-muted-foreground">{Math.round(e.calories ?? 0)} kcal</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 7-Day History Chart */}
      {history.length > 0 && (
        <div className="glass-card border-white/5 p-4 rounded-xl">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {isAr ? 'سعرات آخر 7 أيام' : 'Calories — Last 7 Days'}
          </h4>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={history.map((d: any) => ({
              date: d.date?.slice(5) ?? '',
              cal: d.totalCalories ?? 0,
              target: d.targetCalories ?? 0,
              goalMet: d.goalMet,
            }))}>
              <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: '#0A0F1E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
                formatter={(v: any) => [`${v} kcal`, '']}
              />
              {history[0]?.targetCalories > 0 && (
                <ReferenceLine y={history[0].targetCalories} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 2" />
              )}
              <Bar dataKey="cal" radius={[4, 4, 0, 0]}>
                {history.map((d: any, i: number) => (
                  <Cell key={i} fill={d.goalMet ? N.protein : N.calories} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-1 justify-end text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: N.protein }} /> {isAr ? 'حقق الهدف' : 'Goal met'}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: N.calories }} /> {isAr ? 'لم يحقق' : 'Off target'}</span>
          </div>
        </div>
      )}

      {/* Target Info */}
      {overview.hasTarget && target && (
        <div className="glass-card border-white/5 p-4 rounded-xl">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {isAr ? 'الأهداف اليومية' : 'Daily Targets'}
          </h4>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {[
              { l: isAr ? 'سعرات' : 'Calories', v: `${target.targetCalories} kcal`, c: N.calories },
              { l: isAr ? 'بروتين' : 'Protein', v: `${target.targetProtein}g`, c: N.protein },
              { l: isAr ? 'كربوهيدرات' : 'Carbs', v: `${target.targetCarbs}g`, c: N.carbs },
              { l: isAr ? 'دهون' : 'Fat', v: `${target.targetFat}g`, c: N.fat },
              { l: isAr ? 'ماء' : 'Water', v: `${target.targetWater ?? 2}L`, c: N.water },
              { l: isAr ? 'الهدف' : 'Goal', v: GOALS.find((g) => g.key === target.goal)?.[isAr ? 'ar' : 'en'] ?? target.goal ?? '—', c: 'rgba(255,255,255,0.6)' },
            ].map(({ l, v, c }) => (
              <div key={l} className="bg-white/5 rounded p-2">
                <div className="text-muted-foreground mb-0.5">{l}</div>
                <div className="font-semibold" style={{ color: c }}>{v}</div>
              </div>
            ))}
          </div>
          {target.notes && (
            <p className="text-xs text-muted-foreground mt-2 bg-white/5 rounded px-2 py-1 italic">📝 {target.notes}</p>
          )}
        </div>
      )}

      {/* Meal Suggestions */}
      {overview.suggestions?.length > 0 && (
        <div className="glass-card border-white/5 p-4 rounded-xl">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {isAr ? 'اقتراحات الوجبات' : 'Meal Suggestions'}
          </h4>
          <div className="space-y-2">
            {overview.suggestions.map((s: any) => {
              const ml = MEAL_LABELS[s.mealType];
              return (
                <div key={s.id} className="flex items-start justify-between gap-3 bg-white/5 rounded-lg p-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground mb-0.5">
                      {ml?.emoji} {isAr ? ml?.ar : ml?.en}
                    </div>
                    <p className="text-sm text-white truncate">
                      {isAr && s.descriptionAr ? s.descriptionAr : s.description}
                    </p>
                    {(s.targetCalories || s.targetProtein) && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {s.targetCalories ? `${s.targetCalories} kcal` : ''}{s.targetProtein ? ` · ${s.targetProtein}g protein` : ''}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteSuggestion.mutate(s.id)}
                    className="text-red-400/50 hover:text-red-400 transition-colors shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      <Dialog open={showTarget} onOpenChange={(v) => !v && setShowTarget(false)}>
        <SetTargetModal
          memberId={memberId}
          memberName={overview.name}
          existing={target}
          isAr={isAr}
          onClose={() => setShowTarget(false)}
        />
      </Dialog>
      <Dialog open={showSuggestion} onOpenChange={(v) => !v && setShowSuggestion(false)}>
        <AddSuggestionModal
          memberId={memberId}
          memberName={overview.name}
          isAr={isAr}
          onClose={() => setShowSuggestion(false)}
        />
      </Dialog>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────

export default function NutritionDashboard() {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { data: members = [], isLoading } = useQuery<any[]>({
    queryKey: ['nutrition', 'staff', 'members'],
    queryFn: () => apiFetch('/nutrition/staff/members'),
    refetchInterval: 60_000,
  });

  const filtered = members.filter((m) =>
    !search.trim() || m.name?.toLowerCase().includes(search.toLowerCase()),
  );

  const selected = members.find((m) => m.memberId === selectedId);

  return (
    <PageWrapper>
      <PageHeader
        title={isAr ? 'لوحة التغذية' : 'Nutrition Dashboard'}
        subtitle={isAr ? 'إدارة أهداف وتتبع التغذية للأعضاء' : 'Manage targets and track member nutrition'}
      />

      <div className="flex gap-5 h-[calc(100vh-160px)] min-h-[400px]">
        {/* Left: Member List */}
        <div className={cn(
          'flex flex-col glass-card border-white/5 rounded-2xl overflow-hidden',
          selectedId ? 'w-72 shrink-0 hidden lg:flex' : 'flex-1 max-w-lg',
        )}>
          <div className="p-3 border-b border-white/5">
            <Input
              placeholder={isAr ? 'بحث عن عضو...' : 'Search member...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white/5 border-white/10 text-sm h-9"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-3 space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <Users size={32} className="text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">
                  {isAr ? 'لا يوجد أعضاء' : 'No members found'}
                </p>
              </div>
            ) : (
              filtered.map((m) => {
                const statusCfg = STATUS_CONFIG[m.status] ?? STATUS_CONFIG.NO_LOG;
                const StatusIcon = statusCfg.icon;
                const pct = m.targetCalories > 0
                  ? Math.min(100, Math.round(m.todayCalories / m.targetCalories * 100))
                  : 0;
                return (
                  <button
                    key={m.memberId}
                    onClick={() => setSelectedId(m.memberId)}
                    className={cn(
                      'w-full text-left px-3 py-3 border-b border-white/5 transition-colors hover:bg-white/5',
                      selectedId === m.memberId && 'bg-primary/10',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <GradientAvatar name={m.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-sm font-semibold text-white truncate">{m.name}</span>
                          <StatusIcon size={13} className={statusCfg.color} />
                        </div>
                        <div className="flex items-center gap-2">
                          {m.targetCalories > 0 ? (
                            <>
                              <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${pct}%`,
                                    backgroundColor: m.status === 'OVER' ? N.over : m.status === 'ON_TRACK' ? N.protein : N.calories,
                                  }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {m.todayCalories}/{m.targetCalories}
                              </span>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {isAr ? 'لا يوجد هدف' : 'No target'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className={cn('text-xs', statusCfg.color)}>
                            {isAr ? statusCfg.ar : statusCfg.en}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {isAr ? `التزام: ${Math.round(m.adherence7Days ?? 0)}%` : `${Math.round(m.adherence7Days ?? 0)}% adherence`}
                          </span>
                        </div>
                      </div>
                      {selectedId === m.memberId && <ChevronRight size={14} className="text-primary shrink-0" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Detail */}
        <div className="flex-1 overflow-y-auto">
          {selectedId ? (
            <>
              {/* Back button on mobile */}
              <button
                onClick={() => setSelectedId(null)}
                className="lg:hidden flex items-center gap-1 text-sm text-primary mb-3"
              >
                <ChevronRight size={16} className="rotate-180" />
                {isAr ? 'العودة للقائمة' : 'Back to list'}
              </button>
              <MemberOverviewPanel memberId={selectedId} isAr={isAr} />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                <UtensilsCrossed size={36} className="text-primary/60" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">
                  {isAr ? 'اختر عضواً لعرض تفاصيله' : 'Select a member to view details'}
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  {isAr
                    ? 'انقر على أي عضو من القائمة لعرض أهدافه وسجل التغذية والتحليلات'
                    : 'Click any member from the list to view their targets, nutrition log, and analytics'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
