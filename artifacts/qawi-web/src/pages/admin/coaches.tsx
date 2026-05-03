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
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Loader2, Plus, Mail, Trash2, Users } from 'lucide-react';
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

  const deleteCoach = useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'coaches'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'members'] });
      toast.success(t('admin.user_deleted'));
    },
    onError: (err: any) => toast.error((lang === 'ar' ? err.messageAr : err.error) || t('admin.delete_failed')),
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
            <div key={coach.id} className="glass-card p-6 hover:-translate-y-1 transition-transform group border border-white/5 flex flex-col">
              <Sheet>
                <SheetTrigger asChild>
                  <button className="flex items-center gap-4 mb-4 text-left w-full">
                    <GradientAvatar name={coach.name} size="lg" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold group-hover:text-primary transition-colors truncate">{coach.name}</h3>
                      <p className="text-sm text-muted-foreground truncate flex items-center gap-1.5"><Mail size={12} /> {coach.email}</p>
                    </div>
                  </button>
                </SheetTrigger>
                <SheetContent className="glass-card border-l-white/10 sm:max-w-md w-full p-0">
                  <CoachMembersSheet coach={coach} />
                </SheetContent>
              </Sheet>
              <div className="pt-4 border-t border-white/10 text-sm text-muted-foreground flex items-center justify-between">
                <span>Joined {coach.createdAt ? format(new Date(coach.createdAt), 'PP') : '-'}</span>
                <div className="flex items-center gap-2">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="sm" title={t('admin.view_members')}>
                        <Users size={16} />
                      </Button>
                    </SheetTrigger>
                    <SheetContent className="glass-card border-l-white/10 sm:max-w-md w-full p-0">
                      <CoachMembersSheet coach={coach} />
                    </SheetContent>
                  </Sheet>
                  <button
                    onClick={() => {
                      const msg = t('admin.delete_coach_confirm').replace('{name}', coach.name);
                      if (confirm(msg)) deleteCoach.mutate(coach.id);
                    }}
                    disabled={deleteCoach.isPending}
                    title={t('common.delete')}
                    className="text-red-500 hover:text-red-400 transition-colors p-1.5 bg-red-500/10 rounded-full hover:bg-red-500/20 disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
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

function CoachMembersSheet({ coach }: { coach: any }) {
  const { t } = useLanguage();
  const { data: members, isLoading } = useQuery<any[]>({
    queryKey: ['admin', 'coaches', coach.id, 'members'],
    queryFn: () => apiFetch(`/admin/coaches/${coach.id}/members`),
  });

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-white/10 bg-black/20">
        <div className="flex items-center gap-4">
          <GradientAvatar name={coach.name} size="lg" />
          <div>
            <h2 className="text-xl font-bold">{coach.name}</h2>
            <p className="text-sm text-muted-foreground">{coach.email}</p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <h3 className="font-medium mb-4 flex items-center gap-2"><Users size={16} /> {t('admin.assigned_members')}</h3>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary h-6 w-6" /></div>
        ) : !members || members.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8 glass-card">
            {t('admin.no_assigned_members')}
          </p>
        ) : (
          <div className="space-y-2">
            {members.map((m: any) => (
              <div key={m.id} className="glass-card p-3 flex items-center gap-3">
                <GradientAvatar name={m.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{m.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
