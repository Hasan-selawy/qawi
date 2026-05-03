import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { useLanguage } from '@/hooks/use-language';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { GradientAvatar } from '@/components/GradientAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Plus, Mail, Trash2, Users, UserSquare2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

function CoachesSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-full shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
          <Skeleton className="h-px w-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

export default function AdminCoaches() {
  const { t, lang } = useLanguage();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

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

  const validateCoachForm = (fd: FormData): Record<string, string> => {
    const errors: Record<string, string> = {};
    const name = String(fd.get('name') || '').trim();
    const email = String(fd.get('email') || '').trim();
    const password = String(fd.get('password') || '').trim();
    if (name.length < 2) errors.name = 'Name must be at least 2 characters';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address';
    if (password.length < 6) errors.password = 'Password must be at least 6 characters';
    return errors;
  };

  return (
    <PageWrapper>
      <PageHeader
        title={t('common.coaches')}
        actions={
          <Dialog open={isAddOpen} onOpenChange={(v) => { setIsAddOpen(v); setFormErrors({}); }}>
            <DialogTrigger asChild>
              <Button className="glow-hover"><Plus className="mr-2 h-4 w-4" /> Add Coach</Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-white/10 sm:max-w-[425px]">
              <DialogHeader><DialogTitle>Add New Coach</DialogTitle></DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const errors = validateCoachForm(fd);
                  if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
                  setFormErrors({});
                  addCoach.mutate(Object.fromEntries(fd.entries()));
                }}
                className="space-y-4"
              >
                <div>
                  <Input name="name" placeholder={t('common.name')} className={`bg-black/20 ${formErrors.name ? 'border-red-500' : ''}`} />
                  {formErrors.name && <p className="text-red-400 text-xs mt-1">{formErrors.name}</p>}
                </div>
                <div>
                  <Input name="email" type="email" placeholder={t('common.email')} className={`bg-black/20 ${formErrors.email ? 'border-red-500' : ''}`} />
                  {formErrors.email && <p className="text-red-400 text-xs mt-1">{formErrors.email}</p>}
                </div>
                <div>
                  <Input name="password" type="password" placeholder={t('common.password')} className={`bg-black/20 ${formErrors.password ? 'border-red-500' : ''}`} />
                  {formErrors.password && <p className="text-red-400 text-xs mt-1">{formErrors.password}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={addCoach.isPending}>
                  {addCoach.isPending ? 'Saving…' : t('common.save')}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <CoachesSkeleton />
      ) : coaches?.length === 0 ? (
        <div className="glass-card p-16 text-center border-dashed border-white/10">
          <UserSquare2 className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-1">🏋️ No coaches yet</h3>
          <p className="text-muted-foreground text-sm mb-4">Add your first coach to get started!</p>
          <Button onClick={() => setIsAddOpen(true)} className="glow-hover">
            <Plus className="mr-2 h-4 w-4" /> Add Coach
          </Button>
        </div>
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
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            ))}
          </div>
        ) : !members || members.length === 0 ? (
          <div className="text-center py-10 glass-card">
            <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{t('admin.no_assigned_members')}</p>
          </div>
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
