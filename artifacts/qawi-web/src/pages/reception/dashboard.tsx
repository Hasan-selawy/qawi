import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  LogIn, Users, UserPlus, AlertCircle, Search, CheckCircle2,
  Clock, Wifi, Activity, RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

function KpiCard({ label, value, icon: Icon, color }: { label: string; value: any; icon: any; color: string }) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', `bg-[${color}]/10`)}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
      <p className="text-3xl font-extrabold text-foreground">{value ?? 0}</p>
    </div>
  );
}

function subColor(s: string) {
  if (s === 'ACTIVE') return 'text-green-400';
  if (s === 'EXPIRING') return 'text-amber-400';
  return 'text-red-400';
}

function subDot(s: string) {
  if (s === 'ACTIVE') return 'bg-green-400';
  if (s === 'EXPIRING') return 'bg-amber-400';
  return 'bg-red-400';
}

function DashboardSkeleton() {
  return (
    <PageWrapper>
      <div className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    </PageWrapper>
  );
}

export default function ReceptionDashboard() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const qc = useQueryClient();
  const [searchQ, setSearchQ] = useState('');

  const todayStats = useQuery<any>({
    queryKey: ['reception', 'today'],
    queryFn: () => apiFetch('/reception/today').catch(() => null),
    refetchInterval: 30_000,
  });
  const feed = useQuery<any[]>({
    queryKey: ['reception', 'feed'],
    queryFn: () => apiFetch<any[]>('/reception/live-feed').catch(() => []),
    refetchInterval: 15_000,
  });
  const alerts = useQuery<any[]>({
    queryKey: ['reception', 'alerts'],
    queryFn: () => apiFetch<any[]>('/reception/alerts').catch(() => []),
  });
  const searchResults = useQuery<any[]>({
    queryKey: ['reception', 'search', searchQ],
    queryFn: () => apiFetch<any[]>(`/reception/members/search${searchQ ? `?q=${encodeURIComponent(searchQ)}` : ''}`).catch(() => []),
    enabled: searchQ.length >= 2,
  });

  const checkinMut = useMutation({
    mutationFn: (memberId: string) => apiFetch(`/reception/checkin/${memberId}`, { method: 'POST' }),
    onSuccess: () => {
      toast.success(isAr ? '✅ تم تسجيل الدخول!' : '✅ Checked in!');
      qc.invalidateQueries({ queryKey: ['reception'] });
    },
    onError: (e: any) => toast.error(e?.body?.error ?? 'Error'),
  });

  const formatTime = (iso?: string) => {
    if (!iso) return '';
    try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
  };

  const firstName = user?.name?.split(' ')[0] ?? '';
  const hour = new Date().getHours();
  const greeting = isAr
    ? (hour < 12 ? 'صباح الخير' : hour < 18 ? 'مساء الخير' : 'مساء النور')
    : (hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening');

  if (todayStats.isLoading) return <DashboardSkeleton />;

  return (
    <PageWrapper>
      {/* Header */}
      <div className="mb-8">
        <p className="text-muted-foreground text-sm mb-1">{greeting} 👋</p>
        <h1 className="text-3xl font-extrabold text-foreground">{isAr ? 'الاستقبال' : 'Reception'}</h1>
        <p className="text-primary text-sm font-medium mt-1">{isAr ? 'لوحة التحكم' : 'Live Dashboard'}</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground">{isAr ? 'دخول اليوم' : "Today's Check-ins"}</p>
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <LogIn size={18} className="text-primary" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-foreground">{todayStats.data?.checkInsToday ?? 0}</p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground">{isAr ? 'داخل الآن' : 'Currently In'}</p>
            <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Activity size={18} className="text-green-400" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-foreground">{todayStats.data?.currentlyInGym ?? 0}</p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground">{isAr ? 'أعضاء جدد' : 'Walk-ins Today'}</p>
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <UserPlus size={18} className="text-blue-400" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-foreground">{todayStats.data?.walkInsToday ?? 0}</p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground">{isAr ? 'تنبيهات' : 'Alerts'}</p>
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <AlertCircle size={18} className="text-amber-400" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-foreground">{(alerts.data ?? []).length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Member Search + Check-in */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Search size={18} className="text-primary" />
            <h2 className="font-bold text-lg text-foreground">{isAr ? 'بحث وتسجيل الدخول' : 'Search & Check-in'}</h2>
          </div>
          <div className="relative mb-4">
            <Search size={15} className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder={isAr ? 'اكتب الاسم أو البريد...' : 'Type name or email...'}
              className="pl-9 rtl:pl-4 rtl:pr-9"
            />
          </div>
          {searchQ.length < 2 ? (
            <p className="text-muted-foreground text-sm text-center py-6">
              {isAr ? 'اكتب حرفين على الأقل للبحث' : 'Type at least 2 characters to search'}
            </p>
          ) : searchResults.isLoading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : (searchResults.data ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">{isAr ? 'لا توجد نتائج' : 'No results found'}</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
              {(searchResults.data ?? []).map((m: any) => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                  <div>
                    <p className="font-semibold text-foreground text-sm">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className={cn('w-2 h-2 rounded-full', subDot(m.subscriptionStatus))} />
                      <span className={cn('text-xs font-medium', subColor(m.subscriptionStatus))}>
                        {m.subscriptionStatus === 'ACTIVE' ? (isAr ? 'نشط' : 'Active')
                          : m.subscriptionStatus === 'EXPIRING' ? (isAr ? 'ينتهي قريباً' : 'Expiring')
                          : (isAr ? 'منتهي' : 'Expired')}
                      </span>
                      {m.checkedInToday && (
                        <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-semibold ml-1">
                          {isAr ? 'دخل' : 'In Gym'}
                        </span>
                      )}
                    </div>
                  </div>
                  {!m.checkedInToday && m.subscriptionStatus !== 'EXPIRED' && (
                    <Button size="sm" onClick={() => checkinMut.mutate(m.id)} disabled={checkinMut.isPending}>
                      <LogIn size={14} className="mr-1 rtl:ml-1 rtl:mr-0" />
                      {isAr ? 'دخول' : 'Check In'}
                    </Button>
                  )}
                  {m.checkedInToday && <CheckCircle2 size={22} className="text-primary shrink-0" />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alerts */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size={18} className="text-amber-400" />
            <h2 className="font-bold text-lg text-foreground">{isAr ? 'التنبيهات' : 'Alerts'}</h2>
          </div>
          {(alerts.data ?? []).length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <CheckCircle2 size={36} className="mx-auto mb-3 text-green-400 opacity-60" />
              <p className="font-medium">{isAr ? 'لا توجد تنبيهات 🎉' : 'No alerts — all clear! 🎉'}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-h-72 overflow-y-auto">
              {(alerts.data ?? []).map((a: any, i: number) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{a.memberName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Live Feed */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <h2 className="font-bold text-lg text-foreground">{isAr ? 'حركة حية' : 'Live Feed'}</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={() => feed.refetch()}>
            <RefreshCw size={14} className="mr-1 rtl:ml-1 rtl:mr-0" />
            {isAr ? 'تحديث' : 'Refresh'}
          </Button>
        </div>
        {(feed.data ?? []).length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-6">{isAr ? 'لا توجد حركة بعد' : 'No activity yet today'}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {(feed.data ?? []).slice(0, 16).map((f: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                <div className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
                  f.type === 'CHECKIN' ? 'bg-primary/20' : 'bg-white/10'
                )}>
                  {f.type === 'CHECKIN'
                    ? <LogIn size={16} className="text-primary" />
                    : <LogIn size={16} className="text-muted-foreground rotate-180" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{f.memberName}</p>
                  <p className="text-xs text-muted-foreground">
                    {f.type === 'CHECKIN' ? (isAr ? 'دخل' : 'Checked in') : (isAr ? 'خرج' : 'Checked out')}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <Clock size={11} />
                  {formatTime(f.timestamp)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
