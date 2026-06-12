import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import {
  UtensilsCrossed, Target, TrendingUp, Users, ChevronRight, CheckCircle,
  AlertCircle, XCircle, Loader2, Plus, Trash2, Droplets, Flame, Zap,
  CalendarDays, ChevronDown, ChevronUp, Calendar, NotebookPen,
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

// ─── Create Calendar Plan Modal ───────────────────────────────

function CreateCalendarPlanModal({
  memberId, memberName, isAr, onClose,
}: { memberId: string; memberName: string; isAr: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const [form, setForm] = useState({
    title: isAr ? `خطة تغذية — ${memberName}` : `Nutrition Plan — ${memberName}`,
    startDate: today, endDate: nextMonth,
    targetCalories: '2000', targetProtein: '150',
    targetCarbs: '200', targetFat: '65', targetWater: '2',
    goal: 'MAINTENANCE', notes: '',
  });

  const save = useMutation({
    mutationFn: () => apiFetch('/nutrition/calendar-plans', {
      method: 'POST',
      data: {
        memberId,
        title: form.title,
        startDate: form.startDate,
        endDate: form.endDate,
        defaultTargetCalories: parseInt(form.targetCalories) || 2000,
        defaultTargetProtein: parseInt(form.targetProtein) || 150,
        defaultTargetCarbs: parseInt(form.targetCarbs) || 200,
        defaultTargetFat: parseInt(form.targetFat) || 65,
        defaultTargetWater: parseFloat(form.targetWater) || 2,
        goal: form.goal,
        notes: form.notes || null,
      },
    }),
    onSuccess: () => {
      toast.success(isAr ? 'تم إنشاء الخطة' : 'Plan created');
      qc.invalidateQueries({ queryKey: ['nutrition', 'calendar-plans', memberId] });
      onClose();
    },
    onError: (e: any) => toast.error((isAr ? e?.messageAr : e?.error) || 'Failed'),
  });

  const f = (k: keyof typeof form, lbl: string, lbAr: string, color: string, sfx: string, type = 'number') => (
    <div>
      <label className="text-xs mb-1 block" style={{ color }}>{isAr ? lbAr : lbl} ({sfx})</label>
      <input
        type={type}
        value={form[k]}
        onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))}
        className="w-full bg-black/20 border border-white/10 rounded-md text-sm text-white px-3 py-2"
      />
    </div>
  );

  return (
    <DialogContent className="glass-card border-white/10 max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogTitle>{isAr ? `خطة تغذية جديدة — ${memberName}` : `New Nutrition Plan — ${memberName}`}</DialogTitle>
      <DialogDescription className="text-muted-foreground text-sm">
        {isAr ? 'سيتم إنشاء أيام تلقائياً للفترة المحددة' : 'Days will be auto-generated for the selected period'}
      </DialogDescription>
      <div className="space-y-4 pt-2">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{isAr ? 'عنوان الخطة' : 'Plan Title'}</label>
          <input
            type="text" value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            className="w-full bg-black/20 border border-white/10 rounded-md text-sm text-white px-3 py-2"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {f('startDate', 'Start Date', 'تاريخ البداية', N.protein, '', 'date')}
          {f('endDate', 'End Date', 'تاريخ الانتهاء', N.calories, '', 'date')}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {f('targetCalories', 'Calories', 'سعرات', N.calories, 'kcal')}
          {f('targetProtein', 'Protein', 'بروتين', N.protein, 'g')}
          {f('targetCarbs', 'Carbs', 'كربوهيدرات', N.carbs, 'g')}
          {f('targetFat', 'Fat', 'دهون', N.fat, 'g')}
          {f('targetWater', 'Water', 'ماء', N.water, 'L')}
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-2 block">{isAr ? 'الهدف' : 'Goal'}</label>
          <div className="flex flex-wrap gap-2">
            {GOALS.map((g) => (
              <button key={g.key} type="button"
                onClick={() => setForm((p) => ({ ...p, goal: g.key }))}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                  form.goal === g.key ? 'border-primary bg-primary/15 text-primary' : 'border-white/10 bg-black/20 text-muted-foreground hover:border-white/20')}
              >{isAr ? g.ar : g.en}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{isAr ? 'ملاحظات' : 'Notes'}</label>
          <input type="text" value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            className="w-full bg-black/20 border border-white/10 rounded-md text-sm text-white px-3 py-2"
            placeholder={isAr ? 'أي ملاحظات خاصة...' : 'Any special notes...'}
          />
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending || !form.title.trim()} className="w-full">
          {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarDays size={14} className="mr-2" />}
          {isAr ? 'إنشاء الخطة' : 'Create Plan'}
        </Button>
      </div>
    </DialogContent>
  );
}

// ─── Day Editor Modal ──────────────────────────────────────────

function DayEditorModal({
  dayId, isAr, onClose,
}: { dayId: string; isAr: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [addSugg, setAddSugg] = useState(false);
  const [suggForm, setSuggForm] = useState({ mealType: 'BREAKFAST', description: '', descriptionAr: '', targetCalories: '', targetProtein: '' });
  const [editTargets, setEditTargets] = useState(false);
  const [tForm, setTForm] = useState<any>(null);

  const { data: day, isLoading } = useQuery({
    queryKey: ['nutrition', 'calendar-day', dayId],
    queryFn: () => apiFetch<any>(`/nutrition/calendar-plans/days/${dayId}`),
  });

  const updateDay = useMutation({
    mutationFn: () => apiFetch(`/nutrition/calendar-plans/days/${dayId}`, {
      method: 'PUT',
      data: {
        targetCalories: parseInt(tForm.targetCalories) || null,
        targetProtein: parseInt(tForm.targetProtein) || null,
        targetCarbs: parseInt(tForm.targetCarbs) || null,
        targetFat: parseInt(tForm.targetFat) || null,
        targetWater: parseFloat(tForm.targetWater) || null,
        notes: tForm.notes || null,
        notesAr: tForm.notesAr || null,
      },
    }),
    onSuccess: () => {
      toast.success(isAr ? 'تم التحديث' : 'Updated');
      qc.invalidateQueries({ queryKey: ['nutrition', 'calendar-day', dayId] });
      qc.invalidateQueries({ queryKey: ['nutrition', 'calendar-plans'] });
      setEditTargets(false);
    },
    onError: (e: any) => toast.error((isAr ? e?.messageAr : e?.error) || 'Failed'),
  });

  const addSuggestion = useMutation({
    mutationFn: () => apiFetch(`/nutrition/calendar-plans/days/${dayId}/suggestions`, {
      method: 'POST',
      data: {
        mealType: suggForm.mealType,
        description: suggForm.description || null,
        descriptionAr: suggForm.descriptionAr || null,
        targetCalories: parseInt(suggForm.targetCalories) || null,
        targetProtein: parseInt(suggForm.targetProtein) || null,
      },
    }),
    onSuccess: () => {
      toast.success(isAr ? 'تم إضافة الاقتراح' : 'Suggestion added');
      qc.invalidateQueries({ queryKey: ['nutrition', 'calendar-day', dayId] });
      setSuggForm({ mealType: 'BREAKFAST', description: '', descriptionAr: '', targetCalories: '', targetProtein: '' });
      setAddSugg(false);
    },
    onError: (e: any) => toast.error((isAr ? e?.messageAr : e?.error) || 'Failed'),
  });

  const deleteSugg = useMutation({
    mutationFn: (id: string) => apiFetch(`/nutrition/calendar-plans/suggestions/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nutrition', 'calendar-day', dayId] }),
  });

  if (isLoading) return (
    <DialogContent className="glass-card border-white/10 max-w-md">
      <DialogTitle>{isAr ? 'تفاصيل اليوم' : 'Day Details'}</DialogTitle>
      <DialogDescription className="text-muted-foreground text-sm sr-only">
        {isAr ? 'جارٍ تحميل بيانات اليوم' : 'Loading day details'}
      </DialogDescription>
      <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
    </DialogContent>
  );

  if (!day) return null;

  return (
    <DialogContent className="glass-card border-white/10 max-w-md max-h-[90vh] overflow-y-auto">
      <DialogTitle>
        {isAr ? day.dayNameAr : day.dayName} — {day.dayDate}
      </DialogTitle>
      <DialogDescription className="text-muted-foreground text-sm">
        {GOALS.find((g) => g.key === day.goal)?.[isAr ? 'ar' : 'en'] ?? ''}
      </DialogDescription>
      <div className="space-y-4 pt-1">
        {/* Targets */}
        <div className="glass-card border-white/5 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {isAr ? 'الأهداف' : 'Targets'}
            </span>
            <button onClick={() => { setEditTargets((v) => !v); setTForm({ targetCalories: String(day.targetCalories ?? ''), targetProtein: String(day.targetProtein ?? ''), targetCarbs: String(day.targetCarbs ?? ''), targetFat: String(day.targetFat ?? ''), targetWater: String(day.targetWater ?? '2'), notes: day.notes ?? '', notesAr: day.notesAr ?? '' }); }}
              className="text-xs text-primary hover:underline"
            >{isAr ? 'تعديل' : 'Edit'}</button>
          </div>
          {editTargets && tForm ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['targetCalories', 'Cal', 'سعرات', N.calories, 'kcal'],
                  ['targetProtein', 'Prot', 'بروتين', N.protein, 'g'],
                  ['targetCarbs', 'Carbs', 'كربوهيدرات', N.carbs, 'g'],
                  ['targetFat', 'Fat', 'دهون', N.fat, 'g'],
                  ['targetWater', 'Water', 'ماء', N.water, 'L'],
                ].map(([k, l, la, c, u]) => (
                  <div key={k}>
                    <label className="text-xs mb-1 block" style={{ color: c }}>{isAr ? la : l} ({u})</label>
                    <input type="number" value={tForm[k]}
                      onChange={(e) => setTForm((p: any) => ({ ...p, [k]: e.target.value }))}
                      className="w-full bg-black/20 border border-white/10 rounded text-xs text-white px-2 py-1.5"
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{isAr ? 'ملاحظات (ع)' : 'Notes (AR)'}</label>
                <input type="text" value={tForm.notesAr} dir="rtl"
                  onChange={(e) => setTForm((p: any) => ({ ...p, notesAr: e.target.value }))}
                  className="w-full bg-black/20 border border-white/10 rounded text-xs text-white px-2 py-1.5"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{isAr ? 'ملاحظات (ع)' : 'Notes (EN)'}</label>
                <input type="text" value={tForm.notes}
                  onChange={(e) => setTForm((p: any) => ({ ...p, notes: e.target.value }))}
                  className="w-full bg-black/20 border border-white/10 rounded text-xs text-white px-2 py-1.5"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => updateDay.mutate()} disabled={updateDay.isPending} className="flex-1">
                  {updateDay.isPending ? <Loader2 size={12} className="animate-spin mr-1" /> : null}{isAr ? 'حفظ' : 'Save'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditTargets(false)} className="border-white/10">{isAr ? 'إلغاء' : 'Cancel'}</Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[
                { l: isAr ? 'سعرات' : 'Cal', v: `${day.targetCalories ?? '—'} kcal`, c: N.calories },
                { l: isAr ? 'بروتين' : 'Prot', v: `${day.targetProtein ?? '—'}g`, c: N.protein },
                { l: isAr ? 'كربوهيدرات' : 'Carbs', v: `${day.targetCarbs ?? '—'}g`, c: N.carbs },
                { l: isAr ? 'دهون' : 'Fat', v: `${day.targetFat ?? '—'}g`, c: N.fat },
                { l: isAr ? 'ماء' : 'Water', v: `${day.targetWater ?? 2}L`, c: N.water },
              ].map(({ l, v, c }) => (
                <div key={l} className="bg-white/5 rounded p-2">
                  <div className="text-muted-foreground mb-0.5">{l}</div>
                  <div className="font-semibold" style={{ color: c }}>{v}</div>
                </div>
              ))}
            </div>
          )}
          {day.notes && !editTargets && (
            <p className="text-xs text-muted-foreground mt-2 italic">📝 {isAr && day.notesAr ? day.notesAr : day.notes}</p>
          )}
        </div>

        {/* Suggestions */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {isAr ? 'اقتراحات الوجبات' : 'Meal Suggestions'}
            </span>
            <button onClick={() => setAddSugg((v) => !v)} className="text-xs text-primary hover:underline flex items-center gap-1">
              <Plus size={12} />{isAr ? 'إضافة' : 'Add'}
            </button>
          </div>

          {addSugg && (
            <div className="bg-white/5 rounded-xl p-3 mb-3 space-y-2">
              <div className="flex flex-wrap gap-1">
                {Object.entries(MEAL_LABELS).map(([k, v]) => (
                  <button key={k} onClick={() => setSuggForm((p) => ({ ...p, mealType: k }))}
                    className={cn('px-2 py-1 rounded text-xs font-medium border transition-colors',
                      suggForm.mealType === k ? 'border-primary bg-primary/15 text-primary' : 'border-white/10 bg-black/20 text-muted-foreground')}
                  >{v.emoji} {isAr ? v.ar : v.en}</button>
                ))}
              </div>
              <input type="text" value={suggForm.descriptionAr} dir="rtl"
                onChange={(e) => setSuggForm((p) => ({ ...p, descriptionAr: e.target.value }))}
                className="w-full bg-black/20 border border-white/10 rounded text-xs text-white px-2 py-1.5"
                placeholder="الوصف بالعربي..."
              />
              <input type="text" value={suggForm.description}
                onChange={(e) => setSuggForm((p) => ({ ...p, description: e.target.value }))}
                className="w-full bg-black/20 border border-white/10 rounded text-xs text-white px-2 py-1.5"
                placeholder="Description in English..."
              />
              <div className="flex gap-2">
                <input type="number" value={suggForm.targetCalories}
                  onChange={(e) => setSuggForm((p) => ({ ...p, targetCalories: e.target.value }))}
                  className="flex-1 bg-black/20 border border-white/10 rounded text-xs text-white px-2 py-1.5"
                  placeholder={isAr ? 'سعرات' : 'Cal'}
                />
                <input type="number" value={suggForm.targetProtein}
                  onChange={(e) => setSuggForm((p) => ({ ...p, targetProtein: e.target.value }))}
                  className="flex-1 bg-black/20 border border-white/10 rounded text-xs text-white px-2 py-1.5"
                  placeholder={isAr ? 'بروتين (g)' : 'Protein (g)'}
                />
              </div>
              <Button size="sm" onClick={() => addSuggestion.mutate()}
                disabled={addSuggestion.isPending || (!suggForm.description && !suggForm.descriptionAr)} className="w-full">
                {addSuggestion.isPending ? <Loader2 size={12} className="animate-spin mr-1" /> : null}
                {isAr ? 'إضافة اقتراح' : 'Add Suggestion'}
              </Button>
            </div>
          )}

          {(day.suggestions ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">{isAr ? 'لا توجد اقتراحات' : 'No suggestions yet'}</p>
          ) : (
            <div className="space-y-2">
              {day.suggestions.map((s: any) => {
                const ml = MEAL_LABELS[s.mealType];
                return (
                  <div key={s.id} className="flex items-start justify-between gap-2 bg-white/5 rounded-lg p-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground">{ml?.emoji} {isAr ? ml?.ar : ml?.en}</div>
                      <p className="text-xs text-white">{isAr && s.descriptionAr ? s.descriptionAr : s.description}</p>
                      {(s.targetCalories || s.targetProtein) && (
                        <p className="text-xs text-muted-foreground">{s.targetCalories ? `${s.targetCalories} kcal` : ''}{s.targetProtein ? ` · ${s.targetProtein}g` : ''}</p>
                      )}
                    </div>
                    <button onClick={() => deleteSugg.mutate(s.id)} className="text-red-400/50 hover:text-red-400"><Trash2 size={12} /></button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DialogContent>
  );
}

// ─── Calendar Plan Section (inside MemberOverviewPanel) ───────

const DAY_STATUS_COLOR: Record<string, string> = {
  ON_TRACK: '#22C55E', UNDER: '#3B82F6', OVER: '#EF4444',
  NO_LOG: '#F59E0B', UPCOMING: 'rgba(255,255,255,0.15)', NO_TARGET: 'rgba(255,255,255,0.08)',
};

function CalendarPlanSection({ memberId, isAr }: { memberId: string; isAr: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);

  const { data: plans = [], isLoading } = useQuery<any[]>({
    queryKey: ['nutrition', 'calendar-plans', memberId],
    queryFn: () => apiFetch<any[]>(`/nutrition/calendar-plans/member/${memberId}`),
    enabled: !!memberId,
  });

  const activePlan = plans.find((p) => p.isActive) ?? plans[0];

  const { data: planDetail } = useQuery({
    queryKey: ['nutrition', 'calendar-plan-detail', activePlan?.id],
    queryFn: () => apiFetch<any>(`/nutrition/calendar-plans/${activePlan?.id}`),
    enabled: !!activePlan?.id,
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => apiFetch(`/nutrition/calendar-plans/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(isAr ? 'تم إلغاء الخطة' : 'Plan deactivated');
      qc.invalidateQueries({ queryKey: ['nutrition', 'calendar-plans', memberId] });
    },
  });

  const days: any[] = planDetail?.days ?? [];

  return (
    <div className="glass-card border-white/5 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <CalendarDays size={15} className="text-primary" />
          <span className="text-sm font-semibold text-white">
            {isAr ? 'خطة التقويم الغذائي' : 'Nutrition Calendar Plan'}
          </span>
          {activePlan && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary">
              {isAr ? 'نشطة' : 'Active'}
            </span>
          )}
        </div>
        {open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5">
          {/* Toolbar */}
          <div className="flex items-center justify-between pt-3">
            <span className="text-xs text-muted-foreground">
              {plans.length > 0
                ? (isAr ? `${plans.length} خطط` : `${plans.length} plan${plans.length !== 1 ? 's' : ''}`)
                : (isAr ? 'لا توجد خطط' : 'No plans yet')}
            </span>
            <Button size="sm" variant="outline" className="border-primary/40 text-primary h-7 text-xs"
              onClick={() => setCreateOpen(true)}>
              <Plus size={12} className="mr-1" />{isAr ? 'خطة جديدة' : 'New Plan'}
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
          ) : !activePlan ? (
            <div className="text-center py-6">
              <Calendar size={28} className="mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">{isAr ? 'أنشئ خطة تقويمية للعضو' : 'Create a calendar plan for this member'}</p>
            </div>
          ) : (
            <>
              {/* Active plan header */}
              <div className="bg-primary/8 rounded-xl p-3 border border-primary/15">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">{activePlan.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {activePlan.startDate} → {activePlan.endDate}
                    </p>
                  </div>
                  <button
                    onClick={() => deactivate.mutate(activePlan.id)}
                    className="text-xs text-red-400/50 hover:text-red-400 transition-colors"
                  >{isAr ? 'إلغاء' : 'Deactivate'}</button>
                </div>
              </div>

              {/* Day grid */}
              {days.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {isAr ? 'انقر على يوم لعرض/تعديل التفاصيل' : 'Click a day to view/edit details'}
                  </p>
                  <div className="grid grid-cols-7 gap-1">
                    {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) => (
                      <div key={d} className="text-center text-xs text-muted-foreground/50 pb-1">{d}</div>
                    ))}
                    {/* Leading empty cells */}
                    {Array.from({ length: (new Date(days[0]?.dayDate).getDay() + 6) % 7 }).map((_, i) => (
                      <div key={`e-${i}`} />
                    ))}
                    {days.map((d: any) => {
                      const dotColor = DAY_STATUS_COLOR[d.status] ?? 'rgba(255,255,255,0.08)';
                      const isToday = d.dayDate === new Date().toISOString().slice(0, 10);
                      return (
                        <button
                          key={d.id}
                          onClick={() => setSelectedDayId(d.id)}
                          title={d.dayDate}
                          className={cn(
                            'relative aspect-square rounded-lg flex flex-col items-center justify-center transition-all hover:scale-105',
                            isToday ? 'ring-1 ring-primary/60' : '',
                          )}
                          style={{ backgroundColor: `${dotColor}25`, border: `1px solid ${dotColor}40` }}
                        >
                          <span className="text-xs font-medium" style={{ color: dotColor }}>
                            {new Date(d.dayDate + 'T00:00:00').getDate()}
                          </span>
                          {d.suggestionCount > 0 && (
                            <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-primary" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {/* Legend */}
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                    {[
                      { key: 'ON_TRACK', en: 'On Track', ar: 'مناسب' },
                      { key: 'UNDER', en: 'Under', ar: 'أقل' },
                      { key: 'OVER', en: 'Over', ar: 'أكثر' },
                      { key: 'NO_LOG', en: 'No Log', ar: 'لا سجل' },
                      { key: 'UPCOMING', en: 'Upcoming', ar: 'قادم' },
                    ].map(({ key, en, ar }) => (
                      <span key={key} className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: DAY_STATUS_COLOR[key] }} />
                        {isAr ? ar : en}
                      </span>
                    ))}
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" /> {isAr ? 'يوجد اقتراح' : 'Has suggestion'}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Create plan modal */}
      <Dialog open={createOpen} onOpenChange={(v) => !v && setCreateOpen(false)}>
        <CreateCalendarPlanModal
          memberId={memberId} memberName="" isAr={isAr}
          onClose={() => setCreateOpen(false)}
        />
      </Dialog>

      {/* Day editor modal */}
      <Dialog open={!!selectedDayId} onOpenChange={(v) => !v && setSelectedDayId(null)}>
        {selectedDayId && (
          <DayEditorModal dayId={selectedDayId} isAr={isAr} onClose={() => setSelectedDayId(null)} />
        )}
      </Dialog>
    </div>
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

      {/* Calendar Plan Section */}
      <CalendarPlanSection memberId={memberId} isAr={isAr} />

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
