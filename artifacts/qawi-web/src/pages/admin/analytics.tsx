import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { useLanguage } from '@/hooks/use-language';
import { useGymConfig } from '@/hooks/use-gym-config';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { AttendanceChart } from '@/components/charts/AttendanceChart';
import { MemberGrowthChart } from '@/components/charts/MemberGrowthChart';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Activity, Medal, Lock } from 'lucide-react';
import { GradientAvatar } from '@/components/GradientAvatar';

function AnalyticsSkeleton() {
  return (
    <PageWrapper>
      <div className="mb-6"><Skeleton className="h-8 w-32" /></div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="glass-card p-6 flex flex-col items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-20" />
          </div>
        ))}
      </div>
      <div className="glass-card p-6 mb-8 space-y-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    </PageWrapper>
  );
}

export default function AdminAnalytics() {
  const { t, lang } = useLanguage();
  const { features } = useGymConfig();
  const advanced = features.analyticsAdvancedEnabled;

  const { data: stats, isLoading } = useQuery<any>({
    queryKey: ['admin', 'analytics'],
    queryFn: () => apiFetch('/admin/analytics'),
  });

  if (isLoading) return <AnalyticsSkeleton />;

  const attendanceData = (stats?.attendanceThisWeek || []).map((d: any) => ({ date: d.day, count: d.count }));
  const growthData = (stats?.memberGrowth || []).map((d: any) => ({ month: d.month, count: d.count }));
  const topPerformers: any[] = stats?.topPerformingMembers || [];
  const revenue = stats?.revenueThisMonth ?? 0;
  const avgWorkouts = stats?.avgWorkoutsPerMember ?? 0;
  const inactiveCount = stats?.inactiveMembers ?? 0;
  const expiredCount = stats?.expiredMembers ?? 0;

  return (
    <PageWrapper>
      <PageHeader title={t('common.analytics')} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {advanced && (
          <div className="glass-card p-6 flex flex-col justify-center items-center text-center border-primary/20">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-muted-foreground font-medium mb-1">Revenue This Month</h3>
            <p className="text-4xl font-bold text-white mb-2">{revenue.toFixed(0)} JOD</p>
            <p className="text-sm text-primary">Live data</p>
          </div>
        )}
        {advanced && (
          <div className="glass-card p-6 flex flex-col justify-center items-center text-center">
            <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mb-4">
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
            <h3 className="text-muted-foreground font-medium mb-1">Avg Workouts / Member</h3>
            <p className="text-4xl font-bold text-white mb-2">{avgWorkouts.toFixed(1)}</p>
            <p className="text-sm text-muted-foreground">per week</p>
          </div>
        )}
        <div className={`glass-card p-6 flex flex-col justify-center items-center text-center ${advanced ? '' : 'lg:col-span-3'}`}>
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
            <Activity className="h-8 w-8 text-red-500" />
          </div>
          <h3 className="text-muted-foreground font-medium mb-1">At-Risk Members</h3>
          <p className="text-4xl font-bold text-white mb-2">{inactiveCount + expiredCount}</p>
          <p className="text-sm text-muted-foreground">{inactiveCount} inactive · {expiredCount} expired</p>
        </div>
      </div>

      {advanced ? (
        <>
          <div className="glass-card p-6 mb-8">
            <h3 className="text-lg font-semibold mb-6">Attendance Trends (This Week)</h3>
            <div className="h-[280px]">
              <AttendanceChart data={attendanceData} />
            </div>
          </div>
          <div className="glass-card p-6 mb-8">
            <h3 className="text-lg font-semibold mb-6">Member Growth Trajectory</h3>
            <div className="h-[300px]">
              <MemberGrowthChart data={growthData} />
            </div>
          </div>
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Medal className="text-yellow-500" /> Top Performing Members
            </h3>
            <div className="space-y-4">
              {topPerformers.length === 0 ? (
                <div className="text-center py-8">
                  <Medal className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground text-sm">No performance data yet. Members need to log workouts first.</p>
                </div>
              ) : topPerformers.slice(0, 10).map((member: any, i: number) => (
                <div key={i} className="flex items-center gap-4 p-3 bg-black/20 rounded-lg">
                  <div className="font-bold text-xl w-6 text-center text-muted-foreground">{i + 1}</div>
                  <GradientAvatar name={member.name} size="sm" />
                  <div className="flex-1">
                    <p className="font-medium">{member.name}</p>
                  </div>
                  <div className="font-bold text-primary">{member.workoutsLogged} workouts</div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="glass-card p-10 border-dashed border-primary/30 text-center">
          <Lock className="h-10 w-10 mx-auto mb-4 text-primary/70" />
          <h3 className="text-xl font-semibold mb-2">Advanced Analytics — Pro feature</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            {lang === 'ar'
              ? 'تتبع الإيرادات، اتجاهات الحضور، نمو الأعضاء وقوائم أفضل المتدربين متاحة في خطة Pro. تواصل مع مسؤول قوي للترقية.'
              : 'Revenue tracking, attendance trends, member growth charts and top performer leaderboards are available on the Pro plan. Contact your Qawi administrator to upgrade.'}
          </p>
        </div>
      )}
    </PageWrapper>
  );
}
