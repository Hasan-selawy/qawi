import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { useLanguage } from '@/hooks/use-language';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Users, CheckCircle2, XCircle, Percent, BarChart3,
  Star, Briefcase, Calendar, ChevronDown, ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

function KpiCard({ label, value, icon: Icon, iconBg, iconColor }: {
  label: string; value: string | number; icon: any; iconBg: string; iconColor: string;
}) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', iconBg)}>
          <Icon size={18} className={iconColor} />
        </div>
      </div>
      <p className="text-2xl sm:text-3xl font-extrabold text-foreground">{value}</p>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { label: string; color: string }> = {
    COACH: { label: 'Coach', color: '#22C55E' },
    RECEPTIONIST: { label: 'Reception', color: '#3B82F6' },
    ACCOUNTANT: { label: 'Accountant', color: '#F59E0B' },
    HR: { label: 'HR', color: '#EC4899' },
    GYM_ADMIN: { label: 'Admin', color: '#8B5CF6' },
  };
  const { label, color } = map[role] ?? { label: role, color: '#6B7280' };
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color, backgroundColor: color + '22' }}>
      {label}
    </span>
  );
}

function StaffRow({ s, isAr, onMarkPresent }: { s: any; isAr: boolean; onMarkPresent: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/5 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
            'bg-primary/20 text-primary'
          )}>
            {(s.name ?? '?')[0].toUpperCase()}
          </div>
          <div className="text-left rtl:text-right">
            <p className="font-semibold text-foreground text-sm">{s.name}</p>
            <p className="text-xs text-muted-foreground">{s.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <RoleBadge role={s.role} />
          {s.presentToday
            ? <CheckCircle2 size={18} className="text-green-400" />
            : <XCircle size={18} className="text-red-400 opacity-50" />}
          {open ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
        </div>
      </button>
      {open && (
        <div className="border-t border-white/5 px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex gap-6">
            {s.jobTitle && (
              <div>
                <p className="text-xs text-muted-foreground">{isAr ? 'المسمى الوظيفي' : 'Job Title'}</p>
                <p className="text-sm font-medium text-foreground">{s.jobTitle}</p>
              </div>
            )}
            {s.membersCount != null && (
              <div>
                <p className="text-xs text-muted-foreground">{isAr ? 'الأعضاء' : 'Members'}</p>
                <p className="text-sm font-medium text-foreground">{s.membersCount}</p>
              </div>
            )}
            {s.rating != null && (
              <div>
                <p className="text-xs text-muted-foreground">{isAr ? 'التقييم' : 'Rating'}</p>
                <p className="text-sm font-bold text-amber-400">⭐ {s.rating.toFixed(1)}</p>
              </div>
            )}
          </div>
          {!s.presentToday && (
            <Button size="sm" variant="outline" onClick={() => onMarkPresent(s.id)}>
              <CheckCircle2 size={14} className="mr-1 rtl:ml-1 rtl:mr-0" />
              {isAr ? 'حاضر' : 'Mark Present'}
            </Button>
          )}
        </div>
      )}
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
        <Skeleton className="h-80" />
      </div>
    </PageWrapper>
  );
}

export default function HrDashboard() {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const qc = useQueryClient();

  const todayAtt = useQuery<any>({
    queryKey: ['hr', 'today'],
    queryFn: () => apiFetch('/hr/attendance/today').catch(() => null),
    refetchInterval: 30_000,
  });
  const staff = useQuery<any[]>({
    queryKey: ['hr', 'staff'],
    queryFn: () => apiFetch<any[]>('/hr/staff').catch(() => []),
  });
  const performance = useQuery<any[]>({
    queryKey: ['hr', 'performance'],
    queryFn: () => apiFetch<any[]>('/hr/performance').catch(() => []),
  });
  const report = useQuery<any>({
    queryKey: ['hr', 'report'],
    queryFn: () => apiFetch('/hr/reports/attendance').catch(() => null),
  });

  const markPresentMut = useMutation({
    mutationFn: (userId: string) =>
      apiFetch(`/hr/staff/${userId}/attendance`, {
        method: 'POST',
        data: { type: 'PRESENT', date: new Date().toISOString().slice(0, 10) },
      }),
    onSuccess: () => {
      toast.success(isAr ? 'تم تسجيل الحضور ✅' : 'Attendance recorded ✅');
      qc.invalidateQueries({ queryKey: ['hr'] });
    },
    onError: (e: any) => toast.error(e?.body?.error ?? 'Error'),
  });

  const ratingColor = (r: number) => r >= 4 ? 'text-green-400' : r >= 3 ? 'text-amber-400' : 'text-red-400';

  if (todayAtt.isLoading && staff.isLoading) return <DashboardSkeleton />;

  return (
    <PageWrapper>
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-foreground">{isAr ? 'الموارد البشرية' : 'Human Resources'}</h1>
        <p className="text-primary text-sm font-medium mt-1">{isAr ? 'لوحة التحكم' : 'HR Dashboard'}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label={isAr ? 'إجمالي الموظفين' : 'Total Staff'} value={todayAtt.data?.totalStaff ?? 0}
          icon={Users} iconBg="bg-primary/10" iconColor="text-primary" />
        <KpiCard label={isAr ? 'حاضر اليوم' : 'Present Today'} value={todayAtt.data?.presentToday ?? 0}
          icon={CheckCircle2} iconBg="bg-green-500/10" iconColor="text-green-400" />
        <KpiCard label={isAr ? 'غائب اليوم' : 'Absent Today'} value={todayAtt.data?.absentToday ?? 0}
          icon={XCircle} iconBg="bg-red-500/10" iconColor="text-red-400" />
        <KpiCard label={isAr ? 'معدل الحضور' : 'Attend. Rate'} value={todayAtt.data?.attendanceRate != null ? `${todayAtt.data.attendanceRate}%` : '—'}
          icon={Percent} iconBg="bg-blue-500/10" iconColor="text-blue-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly report */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Calendar size={18} className="text-primary" />
            <h2 className="font-bold text-lg text-foreground">{isAr ? 'تقرير الشهر' : 'Monthly Report'}</h2>
          </div>
          {report.data ? (
            <div className="flex flex-col gap-4">
              {[
                { id: 'wd', label: isAr ? 'أيام العمل' : 'Working Days', value: report.data.workingDays ?? 0 },
                { id: 'tp', label: isAr ? 'إجمالي الحضور' : 'Total Present Entries', value: report.data.totalPresent ?? 0 },
                { id: 'ta', label: isAr ? 'إجمالي الغياب' : 'Total Absent Entries', value: report.data.totalAbsent ?? 0 },
              ].map(row => (
                <div key={row.id} className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-sm text-muted-foreground">{row.label}</span>
                  <span className="font-bold text-foreground text-lg">{row.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          )}
        </div>

        {/* Coach performance */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Star size={18} className="text-amber-400" />
            <h2 className="font-bold text-lg text-foreground">{isAr ? 'أداء المدربين' : 'Coach Performance'}</h2>
          </div>
          {performance.isLoading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : (performance.data ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">{isAr ? 'لا توجد بيانات' : 'No data'}</p>
          ) : (
            <div className="flex flex-col gap-3">
              {(performance.data ?? []).slice(0, 6).map((p: any, i: number) => (
                <div key={p.coachId ?? p.id ?? i} className="flex items-center justify-between py-2 border-b border-white/5">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{p.coachName}</p>
                    <p className="text-xs text-muted-foreground">{p.membersCount ?? 0} {isAr ? 'أعضاء' : 'members'} • {p.plansCreated ?? 0} {isAr ? 'خطط' : 'plans'}</p>
                  </div>
                  {p.rating != null && (
                    <span className={cn('text-sm font-bold', ratingColor(p.rating))}>⭐ {p.rating.toFixed(1)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Staff list */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Briefcase size={18} className="text-primary" />
          <h2 className="font-bold text-lg text-foreground">{isAr ? 'قائمة الموظفين' : 'Staff List'}</h2>
          <span className="ml-auto rtl:mr-auto text-xs text-muted-foreground">{isAr ? 'انقر للتوسع' : 'Click to expand'}</span>
        </div>
        {staff.isLoading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : (staff.data ?? []).length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-6">{isAr ? 'لا يوجد موظفون' : 'No staff found'}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {(staff.data ?? []).map((s: any, i: number) => (
              <StaffRow key={s.id ?? i} s={s} isAr={isAr} onMarkPresent={(id) => markPresentMut.mutate(id)} />
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
