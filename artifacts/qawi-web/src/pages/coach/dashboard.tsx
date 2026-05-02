import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { GradientAvatar } from '@/components/GradientAvatar';
import { StatusBadge, BadgeStatus } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { Loader2, Calendar, Activity, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDaysSince } from '@/lib/sub-status';

export default function CoachDashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState('ALL');

  const { data: members, isLoading } = useQuery<any[]>({
    queryKey: ['coach', 'members'],
    queryFn: () => apiFetch('/coach/members'),
  });

  const filteredMembers = (members || []).filter((m: any) => {
    const days = getDaysSince(m.lastCheckinDate);
    if (filter === 'ALL') return true;
    if (filter === 'ACTIVE') return m.subscriptionStatus === 'ACTIVE';
    if (filter === 'INACTIVE') return days === null || days > 7;
    if (filter === 'EXPIRING') return m.subscriptionStatus === 'EXPIRING';
    return true;
  });

  return (
    <PageWrapper>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('coach.welcome')} {user?.name} 👋</h1>
        <p className="text-muted-foreground flex items-center gap-2">
          <Calendar size={16} /> {format(new Date(), 'EEEE, MMMM do, yyyy')}
        </p>
      </div>

      <Tabs value={filter} onValueChange={setFilter} className="mb-8">
        <TabsList className="bg-black/20 p-1 w-full md:w-auto overflow-x-auto justify-start">
          <TabsTrigger value="ALL">{t('common.all')}</TabsTrigger>
          <TabsTrigger value="ACTIVE">{t('common.active')}</TabsTrigger>
          <TabsTrigger value="INACTIVE">{t('common.inactive')}</TabsTrigger>
          <TabsTrigger value="EXPIRING">{t('common.expiring')}</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredMembers.map((member: any) => {
            const days = getDaysSince(member.lastCheckinDate);
            const checkinText = days === null
              ? 'Never'
              : days === 0
                ? 'Today'
                : days === 1
                  ? 'Yesterday'
                  : `${days} days ago`;
            const checkinColor = days === null
              ? 'text-red-500 bg-red-500/10'
              : days === 0
                ? 'text-green-500 bg-green-500/10'
                : days <= 3
                  ? 'text-orange-500 bg-orange-500/10'
                  : 'text-red-500 bg-red-500/10';

            return (
              <div key={member.id} className="glass-card p-6 flex flex-col hover:border-primary/30 transition-colors group">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <GradientAvatar name={member.name} size="lg" />
                    <div>
                      <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{member.name}</h3>
                      <p className="text-xs text-muted-foreground">{member.currentWorkoutPlanName || 'No active plan'}</p>
                    </div>
                  </div>
                  {member.subscriptionStatus && (
                    <StatusBadge status={member.subscriptionStatus as BadgeStatus} label={member.subscriptionStatus} />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-black/20 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Activity size={12} /> Weekly</p>
                    <p className="font-semibold text-lg">{member.workoutsCompletedThisWeek ?? 0} <span className="text-xs font-normal">sessions</span></p>
                  </div>
                  <div className="bg-black/20 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Last Visit</p>
                    <p className={cn('font-semibold text-sm px-2 py-0.5 rounded-md inline-block', checkinColor)}>{checkinText}</p>
                  </div>
                </div>

                <Button
                  className="w-full mt-auto group-hover:bg-primary/90"
                  variant="outline"
                  onClick={() => setLocation(`/coach/members/${member.id}`)}
                >
                  {t('coach.view_profile')} <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            );
          })}
          {filteredMembers.length === 0 && (
            <div className="col-span-full text-center py-16 text-muted-foreground glass-card border-dashed">
              No members found matching the filter.
            </div>
          )}
        </div>
      )}
    </PageWrapper>
  );
}
