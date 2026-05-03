import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { useLanguage } from '@/hooks/use-language';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { GradientAvatar } from '@/components/GradientAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, AlertTriangle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getDaysRemaining } from '@/lib/sub-status';
import { format, addDays } from 'date-fns';
import { RenewSubscriptionForm } from '@/components/RenewSubscriptionForm';

export default function AdminSubscriptions() {
  const { t, lang } = useLanguage();
  const queryClient = useQueryClient();

  const { data: expiring, isLoading } = useQuery<any[]>({
    queryKey: ['admin', 'expiring-subscriptions'],
    queryFn: () => apiFetch('/admin/expiring-subscriptions'),
  });

  const [openId, setOpenId] = useState<string | null>(null);
  const renew = useMutation({
    mutationFn: ({ memberId, data }: { memberId: string; data: any }) =>
      apiFetch(`/admin/members/${memberId}/subscription`, { method: 'PUT', data }),
    onSuccess: (_d, vars) => {
      const m = expiring?.find((x: any) => x.id === vars.memberId);
      queryClient.invalidateQueries({ queryKey: ['admin', 'expiring-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'members'] });
      toast.success(`✅ Subscription renewed for ${m?.name ?? 'member'}!`);
      setOpenId(null);
    },
    onError: (err: any) => toast.error(lang === 'ar' ? err.messageAr : err.error || 'Failed'),
  });

  return (
    <PageWrapper>
      <PageHeader title={t('admin.expiring_subscriptions')} subtitle="Manage members needing renewal soon" />

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {expiring?.map((member: any) => {
            const days = getDaysRemaining(member.subscriptionEndDate);
            const urgencyColor = days < 0
              ? 'text-destructive border-destructive/30 bg-destructive/10'
              : days < 3
                ? 'text-destructive border-destructive/30 bg-destructive/10'
                : days < 7
                  ? 'text-orange-500 border-orange-500/30 bg-orange-500/10'
                  : 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10';

            return (
              <div key={member.id} className="glass-card p-6 border-l-4" style={{ borderLeftColor: days < 3 ? 'hsl(var(--destructive))' : days < 7 ? '#f97316' : '#eab308' }}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <GradientAvatar name={member.name} />
                    <div>
                      <h3 className="font-bold">{member.name}</h3>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <div className={cn('px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1', urgencyColor)}>
                    {days < 3 ? <AlertTriangle size={12} /> : <Clock size={12} />}
                    {days < 0 ? `Expired ${Math.abs(days)}d` : `${days} days left`}
                  </div>
                </div>

                <Dialog open={openId === member.id} onOpenChange={(o) => setOpenId(o ? member.id : null)}>
                  <DialogTrigger asChild>
                    <Button className="w-full mt-2 glow-hover" variant={days < 3 ? 'destructive' : 'default'}>
                      {t('admin.renew')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="glass-card border-white/10 max-w-lg">
                    <DialogHeader><DialogTitle>Renew {member.name}'s Subscription</DialogTitle></DialogHeader>
                    <RenewSubscriptionForm
                      isPending={renew.isPending}
                      onSubmit={(data) => renew.mutate({ memberId: member.id, data })}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            );
          })}
          {(!expiring || expiring.length === 0) && (
            <div className="col-span-full text-center py-16 text-muted-foreground glass-card border-dashed border-white/20">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <p className="text-lg font-medium">All subscriptions are healthy</p>
              <p className="text-sm">No members are expiring within the next 14 days.</p>
            </div>
          )}
        </div>
      )}
    </PageWrapper>
  );
}
