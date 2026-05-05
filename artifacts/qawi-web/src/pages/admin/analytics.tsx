import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { useLanguage } from '@/hooks/use-language';
import { useGymConfig } from '@/hooks/use-gym-config';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { AttendanceChart } from '@/components/charts/AttendanceChart';
import { MemberGrowthChart } from '@/components/charts/MemberGrowthChart';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { GradientAvatar } from '@/components/GradientAvatar';
import {
  TrendingUp, Activity, Medal, Lock, Users, UserCheck, AlertTriangle,
  Printer, Download, BarChart2
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import { format } from 'date-fns';

function StatCard({ icon: Icon, label, value, sub, color = 'primary', className = '' }: {
  icon: any; label: string; value: string | number; sub?: string; color?: string; className?: string;
}) {
  const colorMap: Record<string, string> = {
    primary: 'text-primary bg-primary/20',
    blue: 'text-blue-400 bg-blue-400/20',
    red: 'text-red-400 bg-red-400/20',
    yellow: 'text-yellow-400 bg-yellow-400/20',
    orange: 'text-orange-400 bg-orange-400/20',
  };
  return (
    <div className={`glass-card p-6 flex flex-col items-center text-center ${className}`}>
      <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${colorMap[color] || colorMap.primary}`}>
        <Icon className="h-7 w-7" />
      </div>
      <p className="text-sm text-muted-foreground font-medium mb-1">{label}</p>
      <p className="text-4xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <PageWrapper>
      <div className="mb-6"><Skeleton className="h-8 w-32" /></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
      <Skeleton className="h-72 rounded-xl mb-6" />
      <Skeleton className="h-60 rounded-xl" />
    </PageWrapper>
  );
}

const CustomTooltip = ({ active, payload, label, prefix = '', suffix = '' }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900/95 border border-white/10 rounded-lg px-3 py-2 text-sm shadow-xl">
      <p className="text-muted-foreground text-xs mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-semibold" style={{ color: p.color }}>
          {prefix}{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}{suffix}
        </p>
      ))}
    </div>
  );
};

function RevenueBarChart({ data }: { data: any[] }) {
  if (!data.length) return <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">No revenue data yet</div>;
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22C55E" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#22C55E" stopOpacity={0.3} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
          <Tooltip content={<CustomTooltip suffix=" JOD" />} />
          <Bar dataKey="revenue" fill="url(#revGrad)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function WeeklyAttendanceChart({ data }: { data: any[] }) {
  if (!data.length) return <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">No attendance data yet</div>;
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.3} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
          <Tooltip content={<CustomTooltip suffix=" visits" />} />
          <Bar dataKey="count" fill="url(#attGrad)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function AdminAnalytics() {
  const { t, lang } = useLanguage();
  const { features, gymName } = useGymConfig();
  const advanced = features.analyticsAdvancedEnabled;
  const printRef = useRef<HTMLDivElement>(null);

  const { data: stats, isLoading } = useQuery<any>({
    queryKey: ['admin', 'analytics'],
    queryFn: () => apiFetch('/admin/analytics'),
  });

  if (isLoading) return <AnalyticsSkeleton />;

  const attendanceData = (stats?.attendanceThisWeek || []).map((d: any) => ({ date: d.day, count: d.count }));
  const growthData = (stats?.memberGrowth || []).map((d: any) => ({ month: d.month, count: d.count }));
  const monthlyRevenue = (stats?.monthlyRevenue || []).map((d: any) => ({ month: d.month, revenue: Number(d.revenue) }));
  const weeklyByDay = (stats?.weeklyAttendanceByDay || []);
  const topPerformers: any[] = stats?.topPerformingMembers || [];
  const revenue = stats?.revenueThisMonth ?? 0;
  const avgWorkouts = stats?.avgWorkoutsPerMember ?? 0;
  const inactiveCount = stats?.inactiveMembers ?? 0;
  const expiredCount = stats?.expiredMembers ?? 0;
  const totalMembers = stats?.totalMembers ?? 0;
  const activeMembers = stats?.activeMembers ?? 0;

  const handlePrint = () => {
    const printContent = document.getElementById('print-report');
    if (!printContent) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html dir="${lang === 'ar' ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="UTF-8" />
        <title>${gymName || 'Gym'} — Analytics Report</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #111; padding: 32px; }
          h1 { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
          .sub { color: #666; font-size: 13px; margin-bottom: 24px; }
          .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
          .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; text-align: center; }
          .card-label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
          .card-value { font-size: 28px; font-weight: 700; color: #111; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th { background: #f9fafb; padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb; }
          td { padding: 8px 12px; font-size: 13px; border-bottom: 1px solid #f3f4f6; }
          h2 { font-size: 16px; font-weight: 600; margin: 24px 0 12px; }
          .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
          @media print { body { padding: 16px; } }
        </style>
      </head>
      <body>
        <h1>${gymName || 'Gym'} — Analytics Report</h1>
        <p class="sub">Generated: ${format(new Date(), 'MMMM d, yyyy HH:mm')}</p>
        <div class="grid">
          <div class="card"><div class="card-label">Total Members</div><div class="card-value">${totalMembers}</div></div>
          <div class="card"><div class="card-label">Active (7d)</div><div class="card-value">${activeMembers}</div></div>
          <div class="card"><div class="card-label">Revenue This Month</div><div class="card-value">${revenue.toFixed(0)} JOD</div></div>
          <div class="card"><div class="card-label">At-Risk Members</div><div class="card-value">${inactiveCount + expiredCount}</div></div>
        </div>
        <h2>Monthly Revenue (Last 6 Months)</h2>
        <table>
          <thead><tr><th>Month</th><th>Revenue (JOD)</th></tr></thead>
          <tbody>
            ${monthlyRevenue.map((r: any) => `<tr><td>${r.month}</td><td>${r.revenue.toFixed(2)}</td></tr>`).join('')}
          </tbody>
        </table>
        <h2>Weekly Attendance by Day</h2>
        <table>
          <thead><tr><th>Day</th><th>Check-ins</th></tr></thead>
          <tbody>
            ${weeklyByDay.map((d: any) => `<tr><td>${d.day}</td><td>${d.count}</td></tr>`).join('')}
          </tbody>
        </table>
        ${topPerformers.length ? `
        <h2>Top Performing Members</h2>
        <table>
          <thead><tr><th>#</th><th>Name</th><th>Workouts Logged</th></tr></thead>
          <tbody>
            ${topPerformers.map((m: any, i: number) => `<tr><td>${i + 1}</td><td>${m.name}</td><td>${m.workoutsLogged}</td></tr>`).join('')}
          </tbody>
        </table>` : ''}
        <div class="footer">Qawi Gym Management · ${format(new Date(), 'yyyy')}</div>
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const handleExportCSV = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Total Members', totalMembers],
      ['Active Members (7d)', activeMembers],
      ['Inactive Members', inactiveCount],
      ['Expired Members', expiredCount],
      ['Revenue This Month (JOD)', revenue.toFixed(2)],
      ['Avg Workouts / Member', avgWorkouts.toFixed(1)],
      [''],
      ['Month', 'Revenue (JOD)'],
      ...monthlyRevenue.map((r: any) => [r.month, r.revenue.toFixed(2)]),
      [''],
      ['Day', 'Check-ins'],
      ...weeklyByDay.map((d: any) => [d.day, d.count]),
      [''],
      ['Rank', 'Member', 'Workouts Logged'],
      ...topPerformers.map((m: any, i: number) => [i + 1, m.name, m.workoutsLogged]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${gymName || 'gym'}-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PageWrapper>
      <PageHeader
        title={t('common.analytics')}
        actions={
          advanced ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCSV} className="text-xs">
                <Download className="mr-2 h-3.5 w-3.5" />
                {lang === 'ar' ? 'تصدير CSV' : 'Export CSV'}
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} className="text-xs">
                <Printer className="mr-2 h-3.5 w-3.5" />
                {lang === 'ar' ? 'طباعة التقرير' : 'Print Report'}
              </Button>
            </div>
          ) : null
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label={lang === 'ar' ? 'إجمالي الأعضاء' : 'Total Members'} value={totalMembers} color="primary" />
        <StatCard icon={UserCheck} label={lang === 'ar' ? 'نشطون (7 أيام)' : 'Active (7 days)'} value={activeMembers} color="blue" />
        {advanced ? (
          <StatCard icon={TrendingUp} label={lang === 'ar' ? 'الإيراد هذا الشهر' : 'Revenue This Month'} value={`${revenue.toFixed(0)} JOD`} color="primary" />
        ) : (
          <div className="glass-card p-6 flex flex-col items-center text-center opacity-40 cursor-not-allowed border-dashed">
            <Lock className="h-8 w-8 mb-3 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Revenue (Pro)</p>
          </div>
        )}
        <StatCard icon={AlertTriangle} label={lang === 'ar' ? 'أعضاء في خطر' : 'At-Risk Members'} value={inactiveCount + expiredCount} sub={`${inactiveCount} inactive · ${expiredCount} expired`} color="red" />
      </div>

      {advanced ? (
        <>
          {/* Revenue + Weekly Attendance side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="glass-card p-6">
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                {lang === 'ar' ? 'الإيراد الشهري (6 أشهر)' : 'Monthly Revenue (6 months)'}
              </h3>
              <RevenueBarChart data={monthlyRevenue} />
            </div>
            <div className="glass-card p-6">
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-blue-400" />
                {lang === 'ar' ? 'الحضور الأسبوعي حسب اليوم' : 'Weekly Attendance by Day'}
              </h3>
              <WeeklyAttendanceChart data={weeklyByDay} />
            </div>
          </div>

          {/* Daily attendance trend */}
          <div className="glass-card p-6 mb-6">
            <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              {lang === 'ar' ? 'اتجاه الحضور (هذا الأسبوع)' : 'Attendance Trend (This Week)'}
            </h3>
            <AttendanceChart data={attendanceData} />
          </div>

          {/* Growth + Top performers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="glass-card p-6">
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-400" />
                {lang === 'ar' ? 'مسار نمو الأعضاء' : 'Member Growth Trajectory'}
              </h3>
              <MemberGrowthChart data={growthData} />
            </div>
            <div className="glass-card p-6">
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                <Medal className="h-4 w-4 text-yellow-400" />
                {lang === 'ar' ? 'أفضل المتدربين أداءً' : 'Top Performing Members'}
              </h3>
              {topPerformers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                  <Medal className="h-10 w-10 mb-3 opacity-20" />
                  <p className="text-sm">{lang === 'ar' ? 'لا يوجد بيانات أداء بعد' : 'No performance data yet'}</p>
                </div>
              ) : (
                <div className="space-y-3 mt-2">
                  {topPerformers.slice(0, 5).map((member: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                      <span className={`font-bold text-lg w-6 text-center ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-muted-foreground'}`}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                      </span>
                      <GradientAvatar name={member.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{member.name}</p>
                      </div>
                      <div className="font-bold text-primary text-sm">{member.workoutsLogged}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Avg workouts */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">{lang === 'ar' ? 'متوسط التمارين / عضو' : 'Avg Workouts / Member'}</h3>
                <p className="text-muted-foreground text-sm">{lang === 'ar' ? 'آخر 7 أيام' : 'Last 7 days'}</p>
              </div>
              <div className="text-5xl font-bold text-primary">{avgWorkouts.toFixed(1)}</div>
            </div>
          </div>
        </>
      ) : (
        <div className="glass-card p-12 border-dashed border-primary/30 text-center">
          <Lock className="h-12 w-12 mx-auto mb-4 text-primary/50" />
          <h3 className="text-xl font-semibold mb-2">{lang === 'ar' ? 'التحليلات المتقدمة — ميزة Pro' : 'Advanced Analytics — Pro Feature'}</h3>
          <p className="text-muted-foreground max-w-md mx-auto text-sm">
            {lang === 'ar'
              ? 'تتبع الإيرادات، اتجاهات الحضور، نمو الأعضاء وتقارير الطباعة متاحة في خطة Pro.'
              : 'Revenue tracking, attendance trends, member growth, and printable financial reports are available on the Pro plan.'}
          </p>
        </div>
      )}
    </PageWrapper>
  );
}
