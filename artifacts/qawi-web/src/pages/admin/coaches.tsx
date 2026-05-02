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
import { Loader2, Plus, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AdminCoaches() {
  const { t, lang } = useLanguage();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const { data: coaches, isLoading } = useQuery<any[]>({
    queryKey: ['admin', 'coaches'],
    queryFn: () => apiFetch('/admin/coaches'),
  });

  const addCoach = useMutation({
    mutationFn: (data: any) => apiFetch('/admin/coaches', { method: 'POST', data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'coaches'] });
      setIsAddOpen(false);
      toast.success('Coach added successfully');
    },
    onError: (err: any) => toast.error(lang === 'ar' ? err.messageAr : err.error || 'Failed'),
  });

  return (
    <PageWrapper>
      <PageHeader
        title={t('common.coaches')}
        actions={
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="glow-hover"><Plus className="mr-2 h-4 w-4" /> Add Coach</Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-white/10 sm:max-w-[425px]">
              <DialogHeader><DialogTitle>Add New Coach</DialogTitle></DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  addCoach.mutate(Object.fromEntries(fd.entries()));
                }}
                className="space-y-4"
              >
                <Input name="name" placeholder={t('common.name')} required className="bg-black/20" />
                <Input name="email" type="email" placeholder={t('common.email')} required className="bg-black/20" />
                <Input name="password" type="password" placeholder={t('common.password')} required className="bg-black/20" />
                <Button type="submit" className="w-full" disabled={addCoach.isPending}>
                  {addCoach.isPending ? <Loader2 className="animate-spin" /> : t('common.save')}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coaches?.map((coach: any) => (
            <div key={coach.id} className="glass-card p-6 hover:-translate-y-1 transition-transform group border border-white/5">
              <div className="flex items-center gap-4 mb-4">
                <GradientAvatar name={coach.name} size="lg" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold group-hover:text-primary transition-colors truncate">{coach.name}</h3>
                  <p className="text-sm text-muted-foreground truncate flex items-center gap-1.5"><Mail size={12} /> {coach.email}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-white/10 text-sm text-muted-foreground">
                Joined {coach.createdAt ? format(new Date(coach.createdAt), 'PP') : '-'}
              </div>
            </div>
          ))}
          {coaches?.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground glass-card">
              No coaches found. Add one to get started.
            </div>
          )}
        </div>
      )}
    </PageWrapper>
  );
}
