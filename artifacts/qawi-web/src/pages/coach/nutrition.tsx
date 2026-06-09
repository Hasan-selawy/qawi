import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import { apiFetch } from '@/services/api';
import { useLanguage } from '@/hooks/use-language';
import { useGymConfig } from '@/hooks/use-gym-config';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { GradientAvatar } from '@/components/GradientAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, UtensilsCrossed, Target, TrendingUp, Droplets, CheckCircle, XCircle } from 'lucide-react';
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

type CoachMember = { id: string; name: string; email: string };

type NutritionTarget = {
  hasTarget: boolean;
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  waterMl?: number;
  goal?: string;
};

type DailyTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type OverviewData = {
  hasTarget: boolean;
  target?: NutritionTarget;
  totals?: DailyTotals;
  waterMl?: number;
  weeklyAdherence?: number;
  avgCalories7d?: number;
  avgProtein7d?: number;
  memberName?: string;
  entries?: any[];
};

const GOALS = [
  { key: 'LOSE_WEIGHT', en: 'Weight Loss', ar: 'خسارة وزن' },
  { key: 'MUSCLE_GAIN', en: 'Muscle Gain', ar: 'بناء عضلات' },
  { key: 'MAINTAIN', en: 'Maintenance', ar: 'محافظة' },
  { key: 'RECOMPOSITION', en: 'Recomposition', ar: 'إعادة تشكيل' },
];

const MEAL_LABELS: Record<string, { en: string; ar: string; emoji: string }> = {
  BREAKFAST: { en: 'Breakfast', ar: 'الإفطار', emoji: '🌅' },
  LUNCH: { en: 'Lunch', ar: 'الغداء', emoji: '☀️' },
  DINNER: { en: 'Dinner', ar: 'العشاء', emoji: '🌙' },
  SNACK: { en: 'Snack', ar: 'وجبة خفيفة', emoji: '🍎' },
  PRE_WORKOUT: { en: 'Pre-Workout', ar: 'قبل التمرين', emoji: '💪' },
  POST_WORKOUT: { en: 'Post-Workout', ar: 'بعد التمرين', emoji: '⚡' },
};

function MacroProgressBar({
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
          {Math.round(consumed)}{unit} {target > 0 ? `/ ${target}${unit}` : ''}
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

function TargetForm({
  memberId,
  existing,
  isAr,
  onSaved,
}: {
  memberId: string;
  existing?: NutritionTarget;
  isAr: boolean;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    calories: String(existing?.calories ?? ''),
    proteinG: String(existing?.proteinG ?? ''),
    carbsG: String(existing?.carbsG ?? ''),
    fatG: String(existing?.fatG ?? ''),
    waterMl: String(existing?.waterMl ?? ''),
    goal: existing?.goal ?? 'MAINTAIN',
  });

  const save = useMutation({
    mutationFn: () => {
      const body = {
        memberId,
        calories: parseInt(form.calories) || 0,
        proteinG: parseInt(form.proteinG) || 0,
        carbsG: parseInt(form.carbsG) || 0,
        fatG: parseInt(form.fatG) || 0,
        waterMl: parseInt(form.waterMl) || 0,
        goal: form.goal,
      };
      const exists = existing?.hasTarget;
      return exists
        ? apiFetch(`/nutrition/v3/targets/${memberId}`, { method: 'PUT', data: body })
        : apiFetch('/nutrition/v3/targets', { method: 'POST', data: body });
    },
    onSuccess: () => {
      toast.success(isAr ? 'تم حفظ الأهداف' : 'Targets saved');
      qc.invalidateQueries({ queryKey: ['nutrition', 'v3', 'overview', memberId] });
      onSaved();
    },
    onError: (e: any) => toast.error((isAr ? e?.messageAr : e?.error) || 'Failed to save'),
  });

  const field = (
    key: keyof typeof form,
    label: string,
    labelAr: string,
    color: string,
    suffix: string,
  ) => (
    <div>
      <Label className="text-xs mb-1 block" style={{ color }}>
        {isAr ? labelAr : label} ({suffix})
      </Label>
      <Input
        type="number"
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="bg-black/20 border-white/10"
        placeholder="0"
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {field('calories', 'Calories', 'السعرات', N.calories, 'kcal')}
        {field('proteinG', 'Protein', 'بروتين', N.protein, 'g')}
        {field('carbsG', 'Carbs', 'كربوهيدرات', N.carbs, 'g')}
        {field('fatG', 'Fat', 'دهون', N.fat, 'g')}
        {field('waterMl', 'Water', 'ماء', N.water, 'ml')}
      </div>

      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">
          {isAr ? 'الهدف' : 'Goal'}
        </Label>
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

      <Button
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className="w-full"
      >
        {save.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : null}
        {isAr ? 'حفظ الأهداف' : 'Save Targets'}
      </Button>
    </div>
  );
}

function TodayLog({ data, isAr }: { data: OverviewData; isAr: boolean }) {
  const target = (data.target as any) ?? {};
  const totals = data.totals ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const waterMl = data.waterMl ?? 0;
  const targetWater = target.waterMl ?? 0;

  const entriesByMeal = (data.entries ?? []).reduce(
    (acc: Record<string, any[]>, e: any) => {
      const mt = e.mealType ?? 'SNACK';
      if (!acc[mt]) acc[mt] = [];
      acc[mt].push(e);
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-4">
      {/* Macro bars */}
      <div className="glass-card border-white/5 p-4 space-y-3">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {isAr ? "إجمالي اليوم" : "Today's Totals"}
        </h4>
        <MacroProgressBar
          label="Calories" labelAr="سعرات" unit=" kcal"
          consumed={totals.calories ?? 0} target={target.calories ?? 0}
          color={N.calories} isAr={isAr}
        />
        <MacroProgressBar
          label="Protein" labelAr="بروتين"
          consumed={totals.protein ?? 0} target={target.proteinG ?? 0}
          color={N.protein} isAr={isAr}
        />
        <MacroProgressBar
          label="Carbs" labelAr="كربوهيدرات"
          consumed={totals.carbs ?? 0} target={target.carbsG ?? 0}
          color={N.carbs} isAr={isAr}
        />
        <MacroProgressBar
          label="Fat" labelAr="دهون"
          consumed={totals.fat ?? 0} target={target.fatG ?? 0}
          color={N.fat} isAr={isAr}
        />
        {targetWater > 0 && (
          <div className="flex items-center gap-2 pt-1">
            <Droplets className="h-4 w-4" style={{ color: N.water }} />
            <span className="text-sm font-semibold" style={{ color: N.water }}>
              {(waterMl / 1000).toFixed(1)}L
            </span>
            <span className="text-xs text-muted-foreground">
              / {(targetWater / 1000).toFixed(1)}L
            </span>
          </div>
        )}
      </div>

      {/* Food entries by meal */}
      {Object.entries(entriesByMeal).map(([mt, entries]) => {
        const info = MEAL_LABELS[mt] ?? { en: mt, ar: mt, emoji: '🍽️' };
        const totalCal = (entries as any[]).reduce(
          (s, e) => s + (e.calories ?? 0), 0,
        );
        return (
          <div key={mt} className="glass-card border-white/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{info.emoji}</span>
              <span className="font-semibold">{isAr ? info.ar : info.en}</span>
              <span className="text-xs text-muted-foreground ml-auto">
                {Math.round(totalCal)} kcal
              </span>
            </div>
            <div className="space-y-2">
              {(entries as any[]).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-2 text-sm border-b border-white/5 pb-2 last:border-0"
                >
                  <span className="flex-1 font-medium">
                    {isAr && entry.foodNameAr ? entry.foodNameAr : entry.foodName}
                  </span>
                  {entry.quantity ? (
                    <span className="text-xs text-muted-foreground">
                      {entry.quantity} {entry.unit}
                    </span>
                  ) : null}
                  <span
                    className="text-xs font-semibold"
                    style={{ color: N.calories }}
                  >
                    {Math.round(entry.calories ?? 0)} kcal
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {(data.entries ?? []).length === 0 && (
        <div className="glass-card border-white/5 p-8 text-center text-muted-foreground text-sm">
          <UtensilsCrossed className="h-8 w-8 mx-auto mb-3 opacity-30" />
          {isAr ? 'لا توجد سجلات طعام اليوم' : 'No food logged today'}
        </div>
      )}
    </div>
  );
}

function AdherenceChart({
  memberId, isAr,
}: {
  memberId: string; isAr: boolean;
}) {
  const history = useQuery({
    queryKey: ['nutrition', 'v3', 'history', memberId],
    queryFn: () => apiFetch<any[]>(`/nutrition/v3/log/history/${memberId}`).catch(() => []),
    enabled: !!memberId,
  });

  const raw: any[] = history.data ?? [];

  const days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const found = raw.find((r: any) => {
      const rk = r.loggedAt
        ? new Date(r.loggedAt).toISOString().slice(0, 10)
        : '';
      return rk === key;
    });
    const dayEntries = raw.filter((r: any) => {
      const rk = r.loggedAt
        ? new Date(r.loggedAt).toISOString().slice(0, 10)
        : '';
      return rk === key;
    });
    const totalCal = dayEntries.reduce((s: number, e: any) => s + (e.calories ?? 0), 0);
    return {
      date: d.toLocaleDateString(isAr ? 'ar-SA' : 'en-US', { weekday: 'short' }),
      calories: Math.round(totalCal),
    };
  });

  if (history.isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="animate-spin text-primary h-6 w-6" />
      </div>
    );
  }

  return (
    <div style={{ height: 160 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={days} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <XAxis
            dataKey="date"
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: '#0A0F1E',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              color: 'white',
            }}
            formatter={(v: any) => [`${v} kcal`, isAr ? 'السعرات' : 'Calories']}
          />
          <Bar dataKey="calories" radius={[4, 4, 0, 0]}>
            {days.map((d, i) => (
              <Cell key={i} fill={N.calories} fillOpacity={d.calories > 0 ? 0.8 : 0.2} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function CoachNutrition() {
  const { lang } = useLanguage();
  const { features } = useGymConfig();
  const qc = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingTargets, setEditingTargets] = useState(false);

  const isAr = lang === 'ar';

  const members = useQuery<CoachMember[]>({
    queryKey: ['coach', 'members'],
    queryFn: () => apiFetch('/coach/members'),
  });

  const overview = useQuery<OverviewData | null>({
    queryKey: ['nutrition', 'v3', 'overview', selectedId],
    queryFn: () =>
      apiFetch<OverviewData>(`/nutrition/v3/coach/overview/${selectedId}`).catch(
        () => null,
      ),
    enabled: !!selectedId,
  });

  const data = overview.data as any;
  const hasTarget = data?.hasTarget ?? false;
  const target = (data?.target as any) ?? {};
  const adherence = data?.weeklyAdherence ?? 0;
  const avgCal = data?.avgCalories7d ?? 0;
  const avgProtein = data?.avgProtein7d ?? 0;

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
      <PageHeader title={isAr ? 'تغذية الأعضاء' : 'Member Nutrition'} />

      <div className="flex gap-6 h-[calc(100vh-140px)]">
        {/* Member list */}
        <div className="w-64 flex-shrink-0 glass-card border-white/5 overflow-y-auto">
          <div className="p-4 border-b border-white/10 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {isAr ? 'الأعضاء' : 'Members'}
          </div>
          {members.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-primary h-6 w-6" />
            </div>
          ) : !members.data?.length ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              {isAr ? 'لا توجد أعضاء' : 'No members assigned'}
            </div>
          ) : (
            members.data.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setSelectedId(m.id);
                  setEditingTargets(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5',
                  selectedId === m.id ? 'bg-primary/10 border-l-2 border-primary' : '',
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

        {/* Main panel */}
        <div className="flex-1 overflow-y-auto space-y-4">
          {!selectedId ? (
            <div className="glass-card p-12 text-center text-muted-foreground h-full flex flex-col items-center justify-center">
              <Target className="h-10 w-10 mb-4 opacity-30" />
              <p>{isAr ? 'اختر عضوًا لعرض تغذيته' : 'Select a member to view nutrition'}</p>
            </div>
          ) : overview.isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-primary h-8 w-8" />
            </div>
          ) : (
            <>
              {/* Targets card */}
              <div className="glass-card border-white/5 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    {isAr ? 'الأهداف اليومية' : 'Daily Targets'}
                  </h3>
                  <button
                    onClick={() => setEditingTargets((v) => !v)}
                    className="text-xs text-primary hover:opacity-80 font-semibold"
                  >
                    {editingTargets
                      ? isAr ? 'إخفاء' : 'Hide'
                      : hasTarget
                      ? isAr ? 'تعديل' : 'Edit'
                      : isAr ? '+ تعيين أهداف' : '+ Set Targets'}
                  </button>
                </div>

                {editingTargets ? (
                  <TargetForm
                    memberId={selectedId}
                    existing={hasTarget ? { hasTarget: true, ...target } : undefined}
                    isAr={isAr}
                    onSaved={() => setEditingTargets(false)}
                  />
                ) : hasTarget ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    {[
                      { label: 'Calories', labelAr: 'سعرات', value: target.calories, unit: 'kcal', color: N.calories },
                      { label: 'Protein', labelAr: 'بروتين', value: target.proteinG, unit: 'g', color: N.protein },
                      { label: 'Carbs', labelAr: 'كارب', value: target.carbsG, unit: 'g', color: N.carbs },
                      { label: 'Fat', labelAr: 'دهون', value: target.fatG, unit: 'g', color: N.fat },
                      { label: 'Water', labelAr: 'ماء', value: target.waterMl ? (target.waterMl / 1000).toFixed(1) : 0, unit: 'L', color: N.water },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-xl p-3 text-center"
                        style={{ backgroundColor: `${item.color}15`, border: `1px solid ${item.color}25` }}
                      >
                        <p className="text-lg font-black" style={{ color: item.color }}>
                          {item.value}
                        </p>
                        <p className="text-xs" style={{ color: `${item.color}99` }}>
                          {item.unit}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {isAr ? item.labelAr : item.label}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-4 text-sm">
                    {isAr ? 'لم يتم تعيين أهداف غذائية بعد' : 'No nutrition targets set yet'}
                  </div>
                )}
              </div>

              {/* Weekly adherence */}
              <div className="glass-card border-white/5 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">
                    {isAr ? 'سجل ٧ أيام' : '7-Day Log'}
                  </h3>
                  {hasTarget && (
                    <span
                      className="ml-auto text-xs font-bold px-2 py-1 rounded-full"
                      style={{
                        backgroundColor: adherence >= 70 ? `${N.protein}20` : `${N.over}20`,
                        color: adherence >= 70 ? N.protein : N.over,
                      }}
                    >
                      {Math.round(adherence)}% {isAr ? 'التزام' : 'adherence'}
                    </span>
                  )}
                </div>

                <AdherenceChart memberId={selectedId} isAr={isAr} />

                {hasTarget && (
                  <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/5">
                    {[
                      { label: isAr ? 'متوسط سعرات' : 'Avg Calories', value: `${Math.round(avgCal)} kcal`, color: N.calories },
                      { label: isAr ? 'متوسط بروتين' : 'Avg Protein', value: `${Math.round(avgProtein)}g`, color: N.protein },
                      {
                        label: isAr ? 'التزام أسبوعي' : 'Weekly Goal',
                        value: `${Math.round(adherence)}%`,
                        color: adherence >= 70 ? N.protein : N.over,
                      },
                    ].map((stat) => (
                      <div key={stat.label} className="text-center">
                        <p className="text-xl font-black" style={{ color: stat.color }}>
                          {stat.value}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Today's log */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2 px-1">
                  <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
                  {isAr ? "سجل اليوم" : "Today's Log"}
                  <span className="text-xs text-muted-foreground font-normal ml-1">
                    {isAr ? "(للقراءة فقط)" : "(read only)"}
                  </span>
                </h3>
                <TodayLog data={data ?? { hasTarget: false }} isAr={isAr} />
              </div>
            </>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
