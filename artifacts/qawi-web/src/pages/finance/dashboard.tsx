import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { useLanguage } from '@/hooks/use-language';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  TrendingUp, DollarSign, CreditCard, Users, Download,
  Search, CheckCircle2, AlertTriangle, XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

function KpiCard({ label, value, icon: Icon, iconBg, iconColor, sub }: {
  label: string; value: string | number; icon: any;
  iconBg: string; iconColor: string; sub?: string;
}) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', iconBg)}>
          <Icon size={18} className={iconColor} />
        </div>
      </div>
      <p className="text-2xl font-extrabold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function ProgressBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-bold text-foreground">{value} <span className="text-muted-foreground font-normal">/ {max}</span></span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <p className="text-xs text-muted-foreground mt-1">{pct}%</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <PageWrapper>
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-72" />
      </div>
    </PageWrapper>
  );
}

export default function FinanceDashboard() {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const [search, setSearch] = useState('');

  const revenue = useQuery<any>({
    queryKey: ['finance', 'revenue'],
    queryFn: () => apiFetch('/finance/revenue').catch(() => null),
  });
  const subs = useQuery<any>({
    queryKey: ['finance', 'subscriptions'],
    queryFn: () => apiFetch('/finance/subscriptions').catch(() => null),
  });
  const summary = useQuery<any>({
    queryKey: ['finance', 'summary'],
    queryFn: () => apiFetch('/finance/summary').catch(() => null),
  });
  const members = useQuery<any[]>({
    queryKey: ['finance', 'members'],
    queryFn: () => apiFetch<any[]>('/finance/members').catch(() => []),
  });

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('qawi_token') ?? '';
      const base = import.meta.env.BASE_URL?.replace(/\/$/, '') ?? '';
      const res = await fetch(`${base}/api/v1/finance/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'members-finance.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* silent */
    }
  };

  const fmt = (n?: number) => n != null ? `${n.toLocaleString()} SAR` : '—';

  const filtered = (members.data ?? []).filter((m: any) =>
    !search || m.name?.toLowerCase().includes(search.toLowerCase()) || m.email?.toLowerCase().includes(search.toLowerCase())
  );

  const subStatusColor = (s: string) => {
    if (s === 'ACTIVE') return 'text-green-400';
    if (s === 'EXPIRING') return 'text-amber-400';
    return 'text-red-400';
  };

  if (revenue.isLoading && subs.isLoading) return <DashboardSkeleton />;

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground">{isAr ? 'المالية' : 'Finance'}</h1>
          <p className="text-primary text-sm font-medium mt-1">{isAr ? 'لوحة التحكم المالية' : 'Financial Dashboard'}</p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download size={15} className="mr-2 rtl:ml-2 rtl:mr-0" />
          {isAr ? 'تصدير CSV' : 'Export CSV'}
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label={isAr ? 'هذا الشهر' : 'This Month'}
          value={fmt(revenue.data?.currentMonthRevenue)}
          icon={TrendingUp} iconBg="bg-green-500/10" iconColor="text-green-400"
        />
        <KpiCard
          label={isAr ? 'الشهر الماضي' : 'Last Month'}
          value={fmt(revenue.data?.lastMonthRevenue)}
          icon={DollarSign} iconBg="bg-blue-500/10" iconColor="text-blue-400"
        />
        <KpiCard
          label={isAr ? 'إجمالي الإيرادات' : 'Total Revenue'}
          value={fmt(revenue.data?.totalRevenue)}
          icon={CreditCard} iconBg="bg-amber-500/10" iconColor="text-amber-400"
        />
        <KpiCard
          label={isAr ? 'متوسط/عضو' : 'Avg / Member'}
          value={fmt(revenue.data?.avgPerMember)}
          icon={Users} iconBg="bg-primary/10" iconColor="text-primary"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Subscriptions breakdown */}
        <div className="glass-card p-6">
          <h2 className="font-bold text-lg text-foreground mb-5">{isAr ? 'الاشتراكات' : 'Subscriptions'}</h2>
          <div className="flex flex-col gap-5">
            <ProgressBar
              label={isAr ? '✅ نشط' : '✅ Active'}
              value={subs.data?.active ?? 0}
              max={subs.data?.total ?? 1}
              color="#22C55E"
            />
            <ProgressBar
              label={isAr ? '⚠️ ينتهي قريباً' : '⚠️ Expiring Soon'}
              value={subs.data?.expiringSoon ?? 0}
              max={subs.data?.total ?? 1}
              color="#F59E0B"
            />
            <ProgressBar
              label={isAr ? '❌ منتهي' : '❌ Expired'}
              value={subs.data?.expired ?? 0}
              max={subs.data?.total ?? 1}
              color="#EF4444"
            />
          </div>
          <div className="mt-5 pt-5 border-t border-white/5 flex justify-between">
            <span className="text-sm text-muted-foreground">{isAr ? 'إجمالي الأعضاء' : 'Total Members'}</span>
            <span className="font-bold text-foreground">{subs.data?.total ?? 0}</span>
          </div>
        </div>

        {/* Finance summary */}
        <div className="glass-card p-6">
          <h2 className="font-bold text-lg text-foreground mb-5">{isAr ? 'ملخص مالي' : 'Finance Summary'}</h2>
          {summary.data ? (
            <div className="flex flex-col gap-4">
              {[
                { label: isAr ? 'إجمالي الأعضاء' : 'Total Members', value: summary.data.totalMembers ?? 0, icon: Users, color: '#22C55E' },
                { label: isAr ? 'طلبات التجديد المعلقة' : 'Pending Renewals', value: summary.data.pendingRenewals ?? 0, icon: AlertTriangle, color: '#F59E0B' },
                { label: isAr ? 'المنتهية (تحتاج تجديد)' : 'Expired (need renewal)', value: subs.data?.expired ?? 0, icon: XCircle, color: '#EF4444' },
                { label: isAr ? 'الإيرادات السنوية المتوقعة' : 'Est. Annual Revenue', value: fmt((revenue.data?.currentMonthRevenue ?? 0) * 12), icon: TrendingUp, color: '#3B82F6' },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <row.icon size={15} style={{ color: row.color }} />
                    <span className="text-sm text-muted-foreground">{row.label}</span>
                  </div>
                  <span className="font-bold text-foreground">{row.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
          )}
        </div>
      </div>

      {/* Members finance table */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg text-foreground">{isAr ? 'تفاصيل الأعضاء' : 'Member Details'}</h2>
          <div className="relative w-64">
            <Search size={14} className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={isAr ? 'بحث...' : 'Search...'}
              className="pl-8 rtl:pl-4 rtl:pr-8 h-8 text-sm"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left rtl:text-right py-2 px-3 text-muted-foreground font-medium">{isAr ? 'الاسم' : 'Name'}</th>
                <th className="text-left rtl:text-right py-2 px-3 text-muted-foreground font-medium">{isAr ? 'الخطة' : 'Plan'}</th>
                <th className="text-left rtl:text-right py-2 px-3 text-muted-foreground font-medium">{isAr ? 'السعر' : 'Price'}</th>
                <th className="text-left rtl:text-right py-2 px-3 text-muted-foreground font-medium">{isAr ? 'الانتهاء' : 'Expires'}</th>
                <th className="text-left rtl:text-right py-2 px-3 text-muted-foreground font-medium">{isAr ? 'الحالة' : 'Status'}</th>
              </tr>
            </thead>
            <tbody>
              {members.isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan={5} className="py-2 px-3"><Skeleton className="h-8" /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-muted-foreground py-8">{isAr ? 'لا توجد بيانات' : 'No data'}</td></tr>
              ) : (
                filtered.map((m: any) => (
                  <tr key={m.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-2.5 px-3">
                      <div>
                        <p className="font-medium text-foreground">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.email}</p>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      {m.planName ? (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-semibold">{m.planName}</span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-foreground">
                      {m.planPrice != null ? `${m.planPrice} SAR` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground text-xs">
                      {(m.subscriptionExpiresAt ?? '').slice(0, 10) || '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={cn('text-xs font-semibold', subStatusColor(m.subscriptionStatus))}>
                        {m.subscriptionStatus === 'ACTIVE' ? (isAr ? 'نشط' : 'Active')
                          : m.subscriptionStatus === 'EXPIRING' ? (isAr ? 'ينتهي قريباً' : 'Expiring')
                          : (isAr ? 'منتهي' : 'Expired')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageWrapper>
  );
}
