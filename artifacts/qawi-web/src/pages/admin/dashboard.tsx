import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { useLanguage } from '@/hooks/use-language';
import { useGymConfig } from '@/hooks/use-gym-config';
import { useLocation } from 'wouter';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { StatCard } from '@/components/StatCard';
import { AttendanceChart } from '@/components/charts/AttendanceChart';
import { MemberGrowthChart } from '@/components/charts/MemberGrowthChart';
import { Loader2, Users, Activity, Clock, UserSquare2, Medal, Lock } from 'lucide-react';
import { GradientAvatar } from '@/components/GradientAvatar';
import { Button } from '@/components/ui/button';
import { getDaysRemaining } from '@/lib/sub-status';

export default function AdminDashboard() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const { features } = useGymConfig();
  const advanced = features.analyticsAdvancedEnabled;

  const { data: stats, isLoading } = useQuery<any>({
    queryKey: ['admin', 'analytics'],
    queryFn: () => apiFetch('/admin/analytics'),
  });

  const { data: expiring } = useQuery<any[]>({
    queryKey: ['admin', 'expiring-subscriptions'],
    queryFn: () => apiFetch('/admin/expiring-subscriptions'),
  });

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const attendanceData = (stats?.attendanceThisWeek || []).map((d: any) => ({ date: d.day, count: d.count }));
  const growthData = (stats?.memberGrowth || []).map((d: any) => ({ month: d.month, count: d.count }));
  const topPerformers: any[] = stats?.topPerformingMembers || [];
  const maxWorkouts = Math.max(1, ...topPerformers.map((m: any) => m.workoutsLogged || 0));

  return (
    <PageWrapper>
      <PageHeader title={t('common.dashboard')} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title={t('admin.total_members')} value={stats?.totalMembers ?? 0} icon={<Users size={24} />} glowColor="blue" />
        <StatCard title={t('admin.active_this_week')} value={stats?.activeMembers ?? 0} icon={<Activity size={24} />} glowColor="green" />
        <StatCard title={t('admin.expiring_this_week')} value={stats?.expiringThisWeek ?? 0} icon={<Clock size={24} />} glowColor="orange" onClick={() => setLocation('/admin/subscriptions')} />
        <StatCard title={t('admin.total_coaches')} value={stats?.totalCoaches ?? 0} icon={<UserSquare2 size={24} />} glowColor="purple" />
      </div>

      {advanced ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
          <div className="glass-card p-6 lg:col-span-3">
            <h3 className="text-lg font-semibold mb-6">Attendance (This Week)</h3>
            <AttendanceChart data={attendanceData} />
          </div>
          <div className="glass-card p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold mb-6">Member Growth</h3>
            <MemberGrowthChart data={growthData} />
          </div>
        </div>
      ) : (
        <div className="glass-card p-8 mb-8 border-dashed border-primary/30 text-center">
          <Lock className="h-8 w-8 mx-auto mb-3 text-primary/70" />
          <h3 className="text-lg font-semibold mb-1">Charts available on the Pro plan</h3>
          <p className="text-sm text-muted-foreground">
            Attendance trends and member growth charts unlock with Advanced Analytics.
          </p>
        </div>
      )}

      <div className={`grid grid-cols-1 ${advanced ? 'lg:grid-cols-2' : ''} gap-6`}>
        {advanced && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-6">{t('admin.top_performers')}</h3>
          <div className="space-y-4">
            {topPerformers.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">No data available</p>
            ) : (
              topPerformers.map((member: any, i: number) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="w-8 flex justify-center">
                    {i === 0 ? <Medal className="text-yellow-500" /> : i === 1 ? <Medal className="text-gray-400" /> : i === 2 ? <Medal className="text-amber-700" /> : <span className="text-muted-foreground font-bold">{i + 1}</span>}
                  </div>
                  <GradientAvatar name={member.name} size="sm" />
                  <div className="flex-1">
                    <p className="font-medium">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.workoutsLogged} workouts logged</p>
                  </div>
                  <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${Math.min(100, (member.workoutsLogged / maxWorkouts) * 100)}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        )}

        <div className={`glass-card p-6 ${advanced ? '' : 'lg:max-w-2xl lg:mx-auto w-full'}`}>
          <h3 className="text-lg font-semibold mb-6">{t('admin.expiring_subscriptions')}</h3>
          <div className="space-y-4">
            {(!expiring || expiring.length === 0) ? (
              <p className="text-muted-foreground text-sm text-center py-4">No expiring subscriptions</p>
            ) : (
              expiring.slice(0, 5).map((m: any) => {
                const days = getDaysRemaining(m.subscriptionEndDate);
                return (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border border-white/5 hover:border-orange-500/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <GradientAvatar name={m.name} size="sm" />
                      <div>
                        <p className="font-medium text-sm">{m.name}</p>
                        <p className="text-xs text-orange-500">{days < 0 ? `Expired ${Math.abs(days)}d ago` : `${days} days remaining`}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setLocation('/admin/subscriptions')}>{t('admin.renew')}</Button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
