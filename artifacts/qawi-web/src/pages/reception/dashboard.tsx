import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { useGymConfig } from '@/hooks/use-gym-config';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  LayoutDashboard, Search, UserPlus, AlertCircle, Cpu,
  LogIn, CheckCircle2, Clock, RefreshCw, MessageCircle, Activity,
  Wifi, WifiOff, Plus, RotateCcw, Phone, Fingerprint, CreditCard,
  ChevronRight, Zap, XCircle, User
} from 'lucide-react';

type Tab = 'overview' | 'search' | 'add' | 'alerts' | 'devices';

const TABS: { id: Tab; labelEn: string; labelAr: string; icon: any }[] = [
  { id: 'overview',  labelEn: 'Overview',    labelAr: 'النظرة العامة', icon: LayoutDashboard },
  { id: 'search',   labelEn: 'Check-in',     labelAr: 'تسجيل الدخول',  icon: LogIn },
  { id: 'add',      labelEn: 'Add Member',   labelAr: 'إضافة عضو',     icon: UserPlus },
  { id: 'alerts',   labelEn: 'Alerts',       labelAr: 'التنبيهات',     icon: AlertCircle },
  { id: 'devices',  labelEn: 'Devices',      labelAr: 'الأجهزة',       icon: Cpu },
];

// ---------- helpers ----------
function waLink(phone: string | null | undefined, name: string, gymName: string, expiry?: string): string {
  if (!phone) return '#';
  const normalized = phone.replace(/\s+/g, '').replace(/^07/, '9627').replace(/^\+/, '');
  const msg = expiry
    ? `مرحباً ${name}، اشتراكك في ${gymName} سينتهي بتاريخ ${expiry}. نسعد بتجديد اشتراكك 💪`
    : `مرحباً ${name}، نرجو التواصل معنا لأي استفسار في ${gymName} 🏋️`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(msg)}`;
}

function subInfo(status: string) {
  if (status === 'ACTIVE')       return { label: 'Active',   labelAr: 'نشط',         dotCls: 'bg-green-400',  badgeCls: 'bg-green-500/20 text-green-400 border-green-500/30' };
  if (status === 'EXPIRING_SOON') return { label: 'Expiring', labelAr: 'ينتهي قريباً', dotCls: 'bg-amber-400',  badgeCls: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
  if (status === 'EXPIRED')       return { label: 'Expired',  labelAr: 'منتهي',        dotCls: 'bg-red-400',    badgeCls: 'bg-red-500/20 text-red-400 border-red-500/30' };
  return                          { label: 'No Plan',  labelAr: 'بلا خطة',     dotCls: 'bg-white/30',   badgeCls: 'bg-white/10 text-muted-foreground border-white/10' };
}

function fmtDate(d: any): string {
  if (!d) return '—';
  try { return format(new Date(d), 'PP'); } catch { return String(d); }
}

function fmtTime(iso: any): string {
  if (!iso) return '';
  try { return format(new Date(iso), 'HH:mm'); } catch { return ''; }
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

// ---------- Renew Modal ----------
function RenewModal({ memberId, memberName, isAr, open, onClose, onSuccess }: {
  memberId: string; memberName: string; isAr: boolean;
  open: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const [months, setMonths] = useState('1');
  const mut = useMutation({
    mutationFn: () => apiFetch(`/reception/members/${memberId}/renew`, {
      method: 'PUT', data: { durationMonths: parseInt(months) },
    }),
    onSuccess: (data: any) => {
      toast.success(isAr
        ? `✅ تم التجديد حتى ${fmtDate(data?.newSubscriptionEndDate)}`
        : `✅ Renewed until ${fmtDate(data?.newSubscriptionEndDate)}`);
      onSuccess();
      onClose();
    },
    onError: (e: any) => toast.error(e?.body?.error ?? (isAr ? 'فشل التجديد' : 'Renewal failed')),
  });
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isAr ? `تجديد اشتراك ${memberName}` : `Renew — ${memberName}`}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              {isAr ? 'مدة التجديد' : 'Duration'}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 3, 6, 12].map(m => (
                <button key={m} type="button" onClick={() => setMonths(String(m))}
                  className={cn('py-2 rounded-lg text-sm font-medium border transition-colors',
                    months === String(m)
                      ? 'border-primary/60 bg-primary/15 text-primary'
                      : 'border-white/10 bg-black/20 text-muted-foreground hover:bg-white/5 hover:border-white/20')}>
                  {m}{isAr ? 'ش' : 'M'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={onClose}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
              <RotateCcw size={14} className="mr-1.5" />
              {isAr ? 'تجديد' : 'Renew'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Overview Tab ----------
function OverviewTab({ gymName, isAr }: { gymName: string; isAr: boolean }) {
  const qc = useQueryClient();
  const [renewTarget, setRenewTarget] = useState<{ id: string; name: string } | null>(null);

  const stats = useQuery<any>({
    queryKey: ['reception', 'today'],
    queryFn: () => apiFetch('/reception/today').catch(() => ({})),
    refetchInterval: 30_000,
  });
  const feed = useQuery<any[]>({
    queryKey: ['reception', 'feed'],
    queryFn: () => apiFetch<any[]>('/reception/live-feed').catch(() => []),
    refetchInterval: 15_000,
  });

  const s = stats.data ?? {};
  const kpis = [
    { label: isAr ? 'دخول اليوم'   : "Today's Check-ins", value: s.checkedInToday ?? 0,   color: '#22C55E', Icon: LogIn },
    { label: isAr ? 'توقعت اليوم'  : 'Expected Active',   value: s.expectedToday ?? 0,    color: '#3B82F6', Icon: Activity },
    { label: isAr ? 'ينتهي الأسبوع' : 'Expiring This Week', value: s.expiringThisWeek ?? 0, color: '#F59E0B', Icon: Clock },
    { label: isAr ? 'منتهي الاشتراك' : 'Expired Members',  value: s.expiredMembersCount ?? 0, color: '#EF4444', Icon: XCircle },
    { label: isAr ? 'أعضاء جدد'   : 'New This Week',      value: s.newMembersThisWeek ?? 0, color: '#8B5CF6', Icon: UserPlus },
    { label: isAr ? 'إجمالي الحضور' : 'Total Check-ins',   value: s.totalCheckins ?? 0,    color: '#06B6D4', Icon: CheckCircle2 },
  ];

  if (stats.isLoading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <Skeleton className="h-64" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map(({ label, value, color, Icon }) => (
          <div key={label} className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
                <Icon size={16} style={{ color }} />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* Expiring this week */}
      {(s.expiringMembers ?? []).length > 0 && (
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={17} className="text-amber-400" />
            <h3 className="font-bold text-foreground">{isAr ? 'ينتهي اشتراكهم هذا الأسبوع' : 'Expiring This Week'}</h3>
            <span className="ml-auto text-xs text-amber-400 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-full">
              {(s.expiringMembers ?? []).length}
            </span>
          </div>
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
            {(s.expiringMembers ?? []).map((m: any) => (
              <div key={m.memberId} className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
                <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 text-xs font-bold text-amber-400">
                  {initials(m.memberName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{m.memberName}</p>
                  <p className="text-xs text-amber-400">
                    {isAr
                      ? `ينتهي خلال ${m.daysUntilExpiry} ${m.daysUntilExpiry === 1 ? 'يوم' : 'أيام'}`
                      : `Expires in ${m.daysUntilExpiry} day${m.daysUntilExpiry !== 1 ? 's' : ''}`}
                    {' · '}{fmtDate(m.subscriptionEndDate)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {m.phoneNumber && (
                    <a href={waLink(m.phoneNumber, m.memberName, gymName, fmtDate(m.subscriptionEndDate))}
                       target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-400 hover:text-green-300">
                        <MessageCircle size={15} />
                      </Button>
                    </a>
                  )}
                  <Button size="sm" variant="outline" className="h-8 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                    onClick={() => setRenewTarget({ id: m.memberId, name: m.memberName })}>
                    <RotateCcw size={12} className="mr-1" />
                    {isAr ? 'جدد' : 'Renew'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live feed */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <h3 className="font-bold text-foreground">{isAr ? 'الحركة الحية' : 'Live Feed'}</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={() => feed.refetch()}>
            <RefreshCw size={13} className="mr-1" />
            {isAr ? 'تحديث' : 'Refresh'}
          </Button>
        </div>
        {(feed.data ?? []).length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">{isAr ? 'لا توجد حركة بعد اليوم' : 'No activity yet today'}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto">
            {(feed.data ?? []).slice(0, 20).map((f: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                  {initials(f.memberName ?? '?')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{f.memberName}</p>
                  {f.streak > 0 && (
                    <p className="text-xs text-amber-400">🔥 {f.streak} {isAr ? 'يوم متتالي' : 'day streak'}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <Clock size={11} />
                  {fmtTime(f.checkedInAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {renewTarget && (
        <RenewModal memberId={renewTarget.id} memberName={renewTarget.name} isAr={isAr}
          open={!!renewTarget} onClose={() => setRenewTarget(null)}
          onSuccess={() => { qc.invalidateQueries({ queryKey: ['reception'] }); setRenewTarget(null); }} />
      )}
    </div>
  );
}

// ---------- Search / Check-in Tab ----------
function SearchTab({ gymName, isAr }: { gymName: string; isAr: boolean }) {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [renewTarget, setRenewTarget] = useState<{ id: string; name: string } | null>(null);

  const results = useQuery<any[]>({
    queryKey: ['reception', 'search', q],
    queryFn: () => apiFetch<any[]>(`/reception/members/search${q ? `?q=${encodeURIComponent(q)}` : ''}`).catch(() => []),
    enabled: q.length >= 2,
  });

  const checkin = useMutation({
    mutationFn: (id: string) => apiFetch(`/reception/checkin/${id}`, { method: 'POST' }),
    onSuccess: (data: any) => {
      const streak = data?.streak ?? 0;
      toast.success(
        isAr
          ? `✅ تم تسجيل دخول ${data?.memberName ?? ''}${streak > 1 ? ` 🔥 ${streak} يوم متتالي` : ''}`
          : `✅ Checked in ${data?.memberName ?? ''}${streak > 1 ? ` 🔥 ${streak}-day streak` : ''}`
      );
      qc.invalidateQueries({ queryKey: ['reception'] });
    },
    onError: (e: any) => toast.error(e?.body?.error ?? (isAr ? 'فشل تسجيل الدخول' : 'Check-in failed')),
  });

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search size={16} className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder={isAr ? 'ابحث بالاسم أو الهاتف أو البريد...' : 'Search by name, phone or email...'}
          className="pl-10 rtl:pl-4 rtl:pr-10 h-12 text-base"
          autoFocus
        />
      </div>

      {q.length < 2 ? (
        <div className="glass-card p-10 text-center text-muted-foreground">
          <Search size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">{isAr ? 'اكتب حرفين على الأقل للبحث' : 'Type at least 2 characters to search'}</p>
        </div>
      ) : results.isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : (results.data ?? []).length === 0 ? (
        <div className="glass-card p-10 text-center text-muted-foreground">
          <p className="text-sm">{isAr ? 'لا توجد نتائج' : 'No results found'}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {(results.data ?? []).map((m: any) => {
            const info = subInfo(m.subscriptionStatus);
            return (
              <div key={m.id} className="glass-card p-4 flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                  {initials(m.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground">{m.name}</p>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', info.badgeCls)}>
                      {isAr ? info.labelAr : info.label}
                    </span>
                    {m.checkedInToday && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 font-medium">
                        {isAr ? '✓ دخل' : '✓ In Gym'}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {m.phone && <span className="flex items-center gap-1"><Phone size={11}/>{m.phone}</span>}
                    {m.subscriptionEndDate && <span>{isAr ? 'ينتهي' : 'Exp.'} {fmtDate(m.subscriptionEndDate)}</span>}
                    {m.coachName && <span>{isAr ? 'مع' : 'w/'} {m.coachName}</span>}
                    {m.attendanceStreak > 0 && <span>🔥 {m.attendanceStreak}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                  {m.phone && (
                    <a href={waLink(m.phone, m.name, gymName)} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-400 hover:text-green-300">
                        <MessageCircle size={14} />
                      </Button>
                    </a>
                  )}
                  {m.subscriptionStatus !== 'ACTIVE' && (
                    <Button size="sm" variant="outline" className="h-8 text-xs"
                      onClick={() => setRenewTarget({ id: m.id, name: m.name })}>
                      <RotateCcw size={12} className="mr-1" />{isAr ? 'جدد' : 'Renew'}
                    </Button>
                  )}
                  {m.checkedInToday ? (
                    <CheckCircle2 size={22} className="text-primary" />
                  ) : m.subscriptionStatus !== 'EXPIRED' ? (
                    <Button size="sm" onClick={() => checkin.mutate(m.id)} disabled={checkin.isPending}>
                      <LogIn size={14} className="mr-1 rtl:ml-1 rtl:mr-0" />
                      {isAr ? 'دخول' : 'Check In'}
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {renewTarget && (
        <RenewModal memberId={renewTarget.id} memberName={renewTarget.name} isAr={isAr}
          open={!!renewTarget} onClose={() => setRenewTarget(null)}
          onSuccess={() => { qc.invalidateQueries({ queryKey: ['reception'] }); setRenewTarget(null); }} />
      )}
    </div>
  );
}

// ---------- Add Member Tab ----------
function AddMemberTab({ isAr }: { isAr: boolean }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', coachId: '', subscriptionEndDate: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<{ name: string; email: string; temporaryPassword: string } | null>(null);

  const coaches = useQuery<any[]>({
    queryKey: ['gym', 'coaches'],
    queryFn: () => apiFetch<any[]>('/gym/coaches').catch(() => []),
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 2) e.name = isAr ? 'الاسم مطلوب (حرفان على الأقل)' : 'Name required (min 2 chars)';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = isAr ? 'بريد إلكتروني صحيح مطلوب' : 'Valid email required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const mut = useMutation({
    mutationFn: () => apiFetch('/reception/members', {
      method: 'POST',
      data: {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim().toLowerCase(),
        coachId: form.coachId || undefined,
        subscriptionEndDate: form.subscriptionEndDate || undefined,
      },
    }),
    onSuccess: (data: any) => {
      setSuccess({ name: data.name, email: data.email, temporaryPassword: data.temporaryPassword });
      setForm({ name: '', phone: '', email: '', coachId: '', subscriptionEndDate: '' });
    },
    onError: (e: any) => {
      const body = (e as any)?.body;
      if (body?.fields) setErrors(body.fields);
      toast.error(body?.error ?? (isAr ? 'فشل الحفظ' : 'Failed to save'));
    },
  });

  const f = (k: keyof typeof form) => (e: any) => {
    setForm(p => ({ ...p, [k]: e.target.value }));
    if (errors[k]) setErrors(p => { const n = { ...p }; delete n[k]; return n; });
  };

  return (
    <div className="max-w-lg space-y-5">
      <h2 className="text-xl font-bold text-foreground">{isAr ? 'تسجيل عضو جديد (زيارة)' : 'Register Walk-in Member'}</h2>

      <div className="glass-card p-6 space-y-4">
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">{isAr ? 'الاسم الكامل *' : 'Full Name *'}</label>
          <Input value={form.name} onChange={f('name')} placeholder={isAr ? 'أحمد محمد' : 'John Doe'} />
          {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">{isAr ? 'رقم الهاتف' : 'Phone'}</label>
          <Input value={form.phone} onChange={f('phone')} placeholder="07XXXXXXXX" dir="ltr" />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">{isAr ? 'البريد الإلكتروني *' : 'Email *'}</label>
          <Input value={form.email} onChange={f('email')} placeholder="member@example.com" dir="ltr" type="email" />
          {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">{isAr ? 'تاريخ انتهاء الاشتراك' : 'Subscription End Date'}</label>
          <div className="grid grid-cols-4 gap-1.5 mb-2">
            {[1, 3, 6, 12].map(m => {
              const d = new Date(); d.setMonth(d.getMonth() + m);
              const val = d.toISOString().slice(0, 10);
              return (
                <button key={m} type="button"
                  onClick={() => setForm(p => ({ ...p, subscriptionEndDate: val }))}
                  className={cn('py-1.5 text-xs rounded-lg border transition-colors',
                    form.subscriptionEndDate === val
                      ? 'border-primary/60 bg-primary/15 text-primary font-semibold'
                      : 'border-white/10 bg-black/20 text-muted-foreground hover:bg-primary/10 hover:text-primary/80 hover:border-primary/30')}>
                  {m}{isAr ? 'ش' : 'M'}
                </button>
              );
            })}
          </div>
          <Input value={form.subscriptionEndDate} onChange={f('subscriptionEndDate')} type="date"
            min={new Date().toISOString().slice(0, 10)} />
        </div>
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">{isAr ? 'المدرب (اختياري)' : 'Assign Coach (optional)'}</label>
          <Select value={form.coachId} onValueChange={v => setForm(p => ({ ...p, coachId: v === 'none' ? '' : v }))}>
            <SelectTrigger>
              <SelectValue placeholder={isAr ? 'اختر مدرباً...' : 'Select coach...'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{isAr ? 'بدون مدرب' : 'No coach'}</SelectItem>
              {(coaches.data ?? []).map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button className="w-full" onClick={() => validate() && mut.mutate()} disabled={mut.isPending}>
          <UserPlus size={16} className="mr-2 rtl:ml-2 rtl:mr-0" />
          {isAr ? 'تسجيل العضو' : 'Register Member'}
        </Button>
      </div>

      {/* Success dialog */}
      <Dialog open={!!success} onOpenChange={() => setSuccess(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{isAr ? '✅ تم التسجيل بنجاح!' : '✅ Member Registered!'}</DialogTitle>
          </DialogHeader>
          {success && (
            <div className="space-y-3 pt-2">
              <p className="text-sm text-muted-foreground">{isAr ? 'أعطِ العضو هذه البيانات المؤقتة:' : 'Share these temporary credentials with the member:'}</p>
              <div className="bg-white/5 rounded-xl p-4 space-y-2 font-mono text-sm border border-white/10">
                <p className="text-muted-foreground text-xs">{isAr ? 'البريد:' : 'Email:'} <span className="text-foreground">{success.email}</span></p>
                <p className="text-muted-foreground text-xs">{isAr ? 'كلمة المرور المؤقتة:' : 'Temp Password:'} <span className="text-primary font-bold">{success.temporaryPassword}</span></p>
              </div>
              <p className="text-xs text-muted-foreground">{isAr ? 'ينبغي للعضو تغيير كلمة المرور عند أول تسجيل دخول.' : 'Member should change their password on first login.'}</p>
              <Button className="w-full" onClick={() => setSuccess(null)}>{isAr ? 'تم' : 'Done'}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- Alerts Tab ----------
function AlertsTab({ gymName, isAr }: { gymName: string; isAr: boolean }) {
  const qc = useQueryClient();
  const [renewTarget, setRenewTarget] = useState<{ id: string; name: string } | null>(null);

  const alertsQ = useQuery<any[]>({
    queryKey: ['reception', 'alerts'],
    queryFn: () => apiFetch<any[]>('/reception/alerts').catch(() => []),
  });
  const alerts = alertsQ.data ?? [];

  const alertMeta: Record<string, { color: string; bg: string; border: string; icon: any; labelEn: string; labelAr: string }> = {
    EXPIRED:  { color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20',    icon: XCircle,     labelEn: 'Expired',    labelAr: 'منتهي الاشتراك' },
    INACTIVE: { color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  icon: Clock,       labelEn: 'Inactive',   labelAr: 'غير نشط' },
    NO_COACH: { color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   icon: User,        labelEn: 'No Coach',   labelAr: 'بدون مدرب' },
  };

  if (alertsQ.isLoading) return <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;

  if (alerts.length === 0) return (
    <div className="glass-card p-16 text-center text-muted-foreground">
      <CheckCircle2 size={44} className="mx-auto mb-4 text-green-400 opacity-60" />
      <p className="font-semibold text-foreground">{isAr ? 'لا توجد تنبيهات 🎉' : 'No alerts — all clear! 🎉'}</p>
      <p className="text-sm mt-1">{isAr ? 'جميع الأعضاء في وضع ممتاز' : 'All members are in good standing'}</p>
    </div>
  );

  const groups = ['EXPIRED', 'INACTIVE', 'NO_COACH'];

  return (
    <div className="space-y-6">
      {groups.map(type => {
        const group = alerts.filter((a: any) => a.type === type);
        if (group.length === 0) return null;
        const meta = alertMeta[type];
        const Icon = meta.icon;
        return (
          <div key={type} className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Icon size={17} className={meta.color} />
              <h3 className={cn('font-bold', meta.color)}>{isAr ? meta.labelAr : meta.labelEn}</h3>
              <span className={cn('ml-auto text-xs px-2 py-0.5 rounded-full border font-medium', meta.color, meta.bg, meta.border)}>{group.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {group.map((a: any) => (
                <div key={a.memberId} className={cn('flex items-center gap-3 p-3 rounded-xl border', meta.bg, meta.border)}>
                  <div className={cn('w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold', meta.bg, meta.color)}>
                    {initials(a.memberName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{a.memberName}</p>
                    <p className="text-xs text-muted-foreground">{isAr ? a.messageAr : a.message}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {a.phone && (
                      <a href={waLink(a.phone, a.memberName, gymName)} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-400 hover:text-green-300">
                          <MessageCircle size={14} />
                        </Button>
                      </a>
                    )}
                    {type === 'EXPIRED' && (
                      <Button size="sm" variant="outline" className="h-8 text-xs"
                        onClick={() => setRenewTarget({ id: a.memberId, name: a.memberName })}>
                        <RotateCcw size={12} className="mr-1" />{isAr ? 'جدد' : 'Renew'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {renewTarget && (
        <RenewModal memberId={renewTarget.id} memberName={renewTarget.name} isAr={isAr}
          open={!!renewTarget} onClose={() => setRenewTarget(null)}
          onSuccess={() => { qc.invalidateQueries({ queryKey: ['reception'] }); setRenewTarget(null); }} />
      )}
    </div>
  );
}

// ---------- Devices Tab ----------
function DevicesTab({ isAr }: { isAr: boolean }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'GYM_ADMIN';
  const qc = useQueryClient();

  const [registerOpen, setRegisterOpen] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [regForm, setRegForm] = useState({ deviceSerial: '', deviceName: '', deviceModel: '', location: '' });
  const [enrollForm, setEnrollForm] = useState({ memberId: '', deviceSerial: '', deviceUserId: '', templateType: 'FINGERPRINT', memberSearch: '' });

  const devices = useQuery<any[]>({
    queryKey: ['zkteco', 'devices'],
    queryFn: () => apiFetch<any[]>('/zkteco/devices').catch(() => []),
    refetchInterval: 30_000,
  });
  const enrollments = useQuery<any[]>({
    queryKey: ['zkteco', 'enrollments'],
    queryFn: () => apiFetch<any[]>('/zkteco/enrollments').catch(() => []),
  });
  const membersQ = useQuery<any[]>({
    queryKey: ['reception', 'search', enrollForm.memberSearch],
    queryFn: () => apiFetch<any[]>(`/reception/members/search${enrollForm.memberSearch ? `?q=${encodeURIComponent(enrollForm.memberSearch)}` : ''}`).catch(() => []),
    enabled: enrollOpen,
  });

  const registerMut = useMutation({
    mutationFn: () => apiFetch('/zkteco/devices/register', { method: 'POST', data: regForm }),
    onSuccess: () => {
      toast.success(isAr ? '✅ تم تسجيل الجهاز' : '✅ Device registered');
      qc.invalidateQueries({ queryKey: ['zkteco'] });
      setRegisterOpen(false);
      setRegForm({ deviceSerial: '', deviceName: '', deviceModel: '', location: '' });
    },
    onError: (e: any) => toast.error(e?.body?.error ?? (isAr ? 'فشل التسجيل' : 'Registration failed')),
  });

  const enrollMut = useMutation({
    mutationFn: () => apiFetch(`/zkteco/members/${enrollForm.memberId}/enroll`, {
      method: 'POST',
      data: { deviceSerial: enrollForm.deviceSerial, deviceUserId: enrollForm.deviceUserId, templateType: enrollForm.templateType },
    }),
    onSuccess: () => {
      toast.success(isAr ? '✅ تم تسجيل البصمة' : '✅ Member enrolled');
      qc.invalidateQueries({ queryKey: ['zkteco'] });
      setEnrollOpen(false);
    },
    onError: (e: any) => toast.error(e?.body?.error ?? (isAr ? 'فشل التسجيل' : 'Enrollment failed')),
  });

  const rf = (k: keyof typeof regForm) => (e: any) => setRegForm(p => ({ ...p, [k]: e.target.value }));
  const ef = (k: keyof typeof enrollForm) => (e: any) => setEnrollForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="space-y-6">
      {/* Devices list */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Cpu size={17} className="text-primary" />
            <h3 className="font-bold text-foreground">{isAr ? 'أجهزة البصمة' : 'Biometric Devices'}</h3>
          </div>
          {isAdmin && (
            <Button size="sm" onClick={() => setRegisterOpen(true)}>
              <Plus size={14} className="mr-1" />{isAr ? 'إضافة جهاز' : 'Register Device'}
            </Button>
          )}
        </div>
        {devices.isLoading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : (devices.data ?? []).length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Cpu size={36} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">{isAr ? 'لا توجد أجهزة مسجلة' : 'No devices registered yet'}</p>
            {isAdmin && (
              <p className="text-xs mt-1">{isAr ? 'سجّل جهاز ZKTeco لتفعيل تسجيل الدخول التلقائي' : 'Register a ZKTeco device to enable auto check-in'}</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {(devices.data ?? []).map((d: any) => (
              <div key={d.id} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                  d.onlineStatus === 'ONLINE' ? 'bg-green-500/20' : 'bg-white/10')}>
                  {d.onlineStatus === 'ONLINE' ? <Wifi size={18} className="text-green-400" /> : <WifiOff size={18} className="text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-foreground">{d.deviceName}</p>
                    <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium',
                      d.onlineStatus === 'ONLINE' ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-muted-foreground')}>
                      {d.onlineStatus === 'ONLINE' ? (isAr ? 'متصل' : 'Online') : (isAr ? 'غير متصل' : 'Offline')}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    SN: {d.deviceSerial}{d.location ? ` · ${d.location}` : ''}{d.deviceModel ? ` · ${d.deviceModel}` : ''}
                  </p>
                  {d.lastSeenAt && <p className="text-xs text-muted-foreground">{isAr ? 'آخر اتصال:' : 'Last seen:'} {fmtTime(d.lastSeenAt)}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Enrollments list */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Fingerprint size={17} className="text-primary" />
            <h3 className="font-bold text-foreground">{isAr ? 'البصمات المسجلة' : 'Enrolled Members'}</h3>
          </div>
          <Button size="sm" variant="outline" onClick={() => setEnrollOpen(true)}>
            <Plus size={14} className="mr-1" />{isAr ? 'تسجيل بصمة' : 'Enroll Member'}
          </Button>
        </div>
        {enrollments.isLoading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : (enrollments.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">{isAr ? 'لا توجد بصمات مسجلة' : 'No enrollments yet'}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {(enrollments.data ?? []).map((e: any) => (
              <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  {e.templateType === 'FINGERPRINT' ? <Fingerprint size={16} className="text-primary" />
                    : e.templateType === 'FACE' ? <User size={16} className="text-primary" />
                    : <CreditCard size={16} className="text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">{e.memberName}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.templateType} · SN: {e.deviceSerial} · ID: {e.deviceUserId}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Setup guide */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={17} className="text-amber-400" />
          <h3 className="font-bold text-foreground">{isAr ? 'دليل الإعداد السريع' : 'Quick Setup Guide'}</h3>
        </div>
        <ol className="space-y-2 text-sm text-muted-foreground list-none">
          {[
            isAr ? 'على الجهاز: اذهب إلى الإعدادات → الاتصال → ADMS' : 'On device: Settings → Communication → ADMS',
            isAr ? `أدخل عنوان الخادم: ${window.location.origin}/api/v1/zkteco/adms` : `Server URL: ${window.location.origin}/api/v1/zkteco/adms`,
            isAr ? 'فعّل ADMS وأدخل الرقم التسلسلي للجهاز' : 'Enable ADMS and enter device serial number',
            isAr ? 'سجّل الجهاز هنا بنفس الرقم التسلسلي' : 'Register the device here with the same serial',
            isAr ? 'سجّل بصمة كل عضو مع تحديد معرف المستخدم في الجهاز' : 'Enroll each member with their device user ID',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Register Device Modal */}
      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{isAr ? 'تسجيل جهاز ZKTeco' : 'Register ZKTeco Device'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{isAr ? 'الرقم التسلسلي *' : 'Serial Number *'}</label>
              <Input value={regForm.deviceSerial} onChange={rf('deviceSerial')} placeholder="CBKD240700123" dir="ltr" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{isAr ? 'اسم الجهاز *' : 'Device Name *'}</label>
              <Input value={regForm.deviceName} onChange={rf('deviceName')} placeholder={isAr ? 'مدخل رئيسي' : 'Main Entrance'} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{isAr ? 'الموقع' : 'Location'}</label>
              <Input value={regForm.location} onChange={rf('location')} placeholder={isAr ? 'الباب الأمامي' : 'Front door'} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{isAr ? 'الموديل' : 'Model'}</label>
              <Input value={regForm.deviceModel} onChange={rf('deviceModel')} placeholder="ZKTeco F22" dir="ltr" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setRegisterOpen(false)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
              <Button onClick={() => registerMut.mutate()} disabled={registerMut.isPending || !regForm.deviceSerial || !regForm.deviceName}>
                <Plus size={14} className="mr-1" />{isAr ? 'تسجيل' : 'Register'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enroll Member Modal */}
      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{isAr ? 'تسجيل بصمة عضو' : 'Enroll Member Biometric'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{isAr ? 'بحث عن عضو' : 'Search Member'}</label>
              <Input value={enrollForm.memberSearch} onChange={ef('memberSearch')} placeholder={isAr ? 'اكتب الاسم...' : 'Type name...'} />
              {enrollForm.memberSearch.length >= 2 && (membersQ.data ?? []).length > 0 && (
                <div className="mt-1 rounded-xl border border-white/10 bg-background overflow-hidden max-h-40 overflow-y-auto">
                  {(membersQ.data ?? []).map((m: any) => (
                    <button key={m.id} className={cn('w-full text-left px-3 py-2 text-sm hover:bg-white/5 flex items-center gap-2',
                      enrollForm.memberId === m.id && 'bg-primary/10 text-primary')}
                      onClick={() => setEnrollForm(p => ({ ...p, memberId: m.id, memberSearch: m.name }))}>
                      <User size={12} />{m.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{isAr ? 'الجهاز' : 'Device'}</label>
              <Select value={enrollForm.deviceSerial} onValueChange={v => setEnrollForm(p => ({ ...p, deviceSerial: v }))}>
                <SelectTrigger><SelectValue placeholder={isAr ? 'اختر جهازاً...' : 'Select device...'} /></SelectTrigger>
                <SelectContent>
                  {(devices.data ?? []).map((d: any) => (
                    <SelectItem key={d.deviceSerial} value={d.deviceSerial}>{d.deviceName} ({d.deviceSerial})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{isAr ? 'معرف المستخدم في الجهاز' : 'Device User ID'}</label>
              <Input value={enrollForm.deviceUserId} onChange={ef('deviceUserId')} placeholder="001" dir="ltr" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{isAr ? 'نوع القالب' : 'Template Type'}</label>
              <Select value={enrollForm.templateType} onValueChange={v => setEnrollForm(p => ({ ...p, templateType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FINGERPRINT">👆 {isAr ? 'بصمة إصبع' : 'Fingerprint'}</SelectItem>
                  <SelectItem value="FACE">👤 {isAr ? 'التعرف على الوجه' : 'Face Recognition'}</SelectItem>
                  <SelectItem value="CARD">💳 {isAr ? 'بطاقة' : 'Card'}</SelectItem>
                  <SelectItem value="UNKNOWN">{isAr ? 'غير محدد' : 'Unknown'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setEnrollOpen(false)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
              <Button onClick={() => enrollMut.mutate()}
                disabled={enrollMut.isPending || !enrollForm.memberId || !enrollForm.deviceSerial || !enrollForm.deviceUserId}>
                <Fingerprint size={14} className="mr-1" />{isAr ? 'تسجيل' : 'Enroll'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- Main Page ----------
export default function ReceptionDashboard() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const cfg = useGymConfig();
  const gymName = cfg?.gymName ?? 'Qawi';
  const [tab, setTab] = useState<Tab>('overview');

  const hour = new Date().getHours();
  const greeting = isAr
    ? (hour < 12 ? 'صباح الخير' : hour < 18 ? 'مساء الخير' : 'مساء النور')
    : (hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening');
  const firstName = user?.name?.split(' ')[0] ?? '';

  return (
    <PageWrapper>
      {/* Header */}
      <div className="mb-6">
        <p className="text-muted-foreground text-sm mb-0.5">{greeting}, {firstName} 👋</p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">{isAr ? 'الاستقبال' : 'Reception'}</h1>
        <p className="text-primary text-sm font-medium mt-0.5">{gymName}</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-white/5 p-1 rounded-xl border border-white/10 overflow-x-auto">
        {TABS.map(({ id, labelEn, labelAr, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
              tab === id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            )}
          >
            <Icon size={15} />
            {isAr ? labelAr : labelEn}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && <OverviewTab gymName={gymName} isAr={isAr} />}
      {tab === 'search'   && <SearchTab gymName={gymName} isAr={isAr} />}
      {tab === 'add'      && <AddMemberTab isAr={isAr} />}
      {tab === 'alerts'   && <AlertsTab gymName={gymName} isAr={isAr} />}
      {tab === 'devices'  && <DevicesTab isAr={isAr} />}
    </PageWrapper>
  );
}
