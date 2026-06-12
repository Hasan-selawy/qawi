import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { GradientAvatar } from '@/components/GradientAvatar';
import { StatusBadge, BadgeStatus } from '@/components/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { Calendar, Activity, ChevronRight, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDaysSince } from '@/lib/sub-status';

function NutritionDot({ status }: { status?: string }) {
  const { lang } = useLanguage();
  const label = status === 'LOGGED'
    ? (lang === 'ar' ? 'سجّل التغذية اليوم' : 'Logged today')
    : status === 'NOT_LOGGED'
    ? (lang === 'ar' ? 'لم يسجل التغذية اليوم' : 'Not logged today')
    : (lang === 'ar' ? 'لا يوجد خطة تغذية' : 'No plan assigned');

  const dot = status === 'LOGGED'
    ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.7)]'
    : status === 'NOT_LOGGED'
    ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.7)]'
    : 'bg-gray-500';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn('inline-block w-2.5 h-2.5 rounded-full shrink-0 cursor-help', dot)} />
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">{label}</TooltipContent>
    </Tooltip>
  );
}

function CoachSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="glass-card p-6 space-y-4">
          <div className="flex items-start gap-3">
            <Skeleton className="h-12 w-12 rounded-full shrink-0" />
            <div className="space-y-2 flex-1"><Skeleton className="h-5 w-32" /><Skeleton className="h-3 w-40" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4"><Skeleton className="h-16 rounded-lg" /><Skeleton className="h-16 rounded-lg" /></div>
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export default function CoachDashboard() {
  const { t, lang } = useLanguage();
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
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">{t('coach.welcome')} {user?.name} 👋</h1>
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Calendar size={16} /> {format(new Date(), 'EEEE, MMMM do, yyyy')}
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 mb-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> {lang === 'ar' ? 'سجّل التغذية' : 'Nutrition logged'}</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> {lang === 'ar' ? 'لم يسجل' : 'Not logged'}</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-500 inline-block" /> {lang === 'ar' ? 'بلا خطة' : 'No plan'}</span>
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
        <CoachSkeleton />
      ) : members?.length === 0 ? (
        <div className="glass-card p-16 text-center border-dashed border-white/10">
          <Users className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-1">🏋️ No members assigned yet</h3>
          <p className="text-muted-foreground text-sm">Your gym admin will assign members to you.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredMembers.map((member: any) => {
            const days = getDaysSince(member.lastCheckinDate);
            const checkinText = days === null ? 'Never' : days === 0 ? 'Today' : days === 1 ? 'Yesterday' : `${days} days ago`;
            const checkinColor = days === null ? 'text-red-500 bg-red-500/10' : days === 0 ? 'text-green-500 bg-green-500/10' : days <= 3 ? 'text-orange-500 bg-orange-500/10' : 'text-red-500 bg-red-500/10';

            return (
              <div key={member.id} className="glass-card p-6 flex flex-col hover:border-primary/30 transition-colors group">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <GradientAvatar name={member.name} size="lg" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{member.name}</h3>
                        <NutritionDot status={member.nutritionStatus} />
                      </div>
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
                <Button className="w-full mt-auto group-hover:bg-primary/90" variant="outline" onClick={() => setLocation(`/coach/members/${member.id}`)}>
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
