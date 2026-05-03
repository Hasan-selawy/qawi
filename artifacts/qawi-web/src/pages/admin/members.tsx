import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { useLanguage } from '@/hooks/use-language';
import { useGymConfig } from '@/hooks/use-gym-config';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { GradientAvatar } from '@/components/GradientAvatar';
import { StatusBadge, BadgeStatus } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RenewSubscriptionForm } from '@/components/RenewSubscriptionForm';
import { Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { getSubStatus } from '@/lib/sub-status';

export default function AdminMembers() {
  const { t, lang } = useLanguage();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isAddOpen, setIsAddOpen] = useState(false);

  const { data: members, isLoading } = useQuery<any[]>({
    queryKey: ['admin', 'members'],
    queryFn: () => apiFetch('/admin/members'),
  });

  const { data: coaches } = useQuery<any[]>({
    queryKey: ['admin', 'coaches'],
    queryFn: () => apiFetch('/admin/coaches'),
  });

  const addMember = useMutation({
    mutationFn: (data: any) => apiFetch('/admin/members', { method: 'POST', data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'members'] });
      setIsAddOpen(false);
      toast.success('Member added successfully');
    },
    onError: (err: any) => toast.error(lang === 'ar' ? err.messageAr : err.error || 'Failed'),
  });

  const deleteMember = useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'members'] });
      toast.success(t('admin.user_deleted'));
    },
    onError: (err: any) => toast.error((lang === 'ar' ? err.messageAr : err.error) || t('admin.delete_failed')),
  });

  const filteredMembers = (members || []).filter((m: any) => {
    const status = getSubStatus(m.subscriptionEndDate);
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <PageWrapper>
      <PageHeader
        title={t('common.members')}
        actions={
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="glow-hover"><Plus className="mr-2 h-4 w-4" /> {t('member.add_member')}</Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-white/10 sm:max-w-[425px]">
              <DialogHeader><DialogTitle>{t('member.add_member')}</DialogTitle></DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  addMember.mutate(Object.fromEntries(fd.entries()));
                }}
                className="space-y-4"
              >
                <Input name="name" placeholder={t('common.name')} required className="bg-black/20" />
                <Input name="email" type="email" placeholder={t('common.email')} required className="bg-black/20" />
                <Input name="password" type="password" placeholder={t('common.password')} required className="bg-black/20" />
                <Input name="subscriptionEndDate" type="date" required className="bg-black/20" />
                <Button type="submit" className="w-full" disabled={addMember.isPending}>
                  {addMember.isPending ? <Loader2 className="animate-spin" /> : t('common.save')}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="glass-card p-6 border-white/5">
        <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t('common.search')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-black/20" />
          </div>
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full md:w-auto">
            <TabsList className="bg-black/20">
              <TabsTrigger value="ALL">{t('common.all')}</TabsTrigger>
              <TabsTrigger value="ACTIVE">{t('common.active')}</TabsTrigger>
              <TabsTrigger value="EXPIRING">{t('common.expiring')}</TabsTrigger>
              <TabsTrigger value="EXPIRED">{t('common.expired')}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>
        ) : (
          <div className="rounded-md border border-white/10 overflow-hidden">
            <Table>
              <TableHeader className="bg-black/20">
                <TableRow className="border-white/10">
                  <TableHead>Member</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member: any) => {
                  const status = getSubStatus(member.subscriptionEndDate);
                  return (
                    <TableRow key={member.id} className="border-white/10 hover:bg-primary/5 transition-colors">
                      <TableCell className="flex items-center gap-3">
                        <GradientAvatar name={member.name} size="sm" />
                        <span className="font-medium">{member.name}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{member.email}</TableCell>
                      <TableCell>{member.subscriptionEndDate ? format(new Date(member.subscriptionEndDate), 'PP') : '-'}</TableCell>
                      <TableCell>
                        <StatusBadge status={status as BadgeStatus} label={t(`common.${status.toLowerCase()}`)} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Sheet>
                            <SheetTrigger asChild>
                              <Button variant="ghost" size="sm">Details</Button>
                            </SheetTrigger>
                            <SheetContent className="glass-card border-l-white/10 sm:max-w-md w-full p-0">
                              <MemberDetailsSheet member={member} coaches={coaches || []} />
                            </SheetContent>
                          </Sheet>
                          <button
                            onClick={() => {
                              const msg = t('admin.delete_user_confirm').replace('{name}', member.name);
                              if (confirm(msg)) deleteMember.mutate(member.id);
                            }}
                            disabled={deleteMember.isPending}
                            title={t('common.delete')}
                            className="text-red-500 hover:text-red-400 transition-colors p-1.5 bg-red-500/10 rounded-full hover:bg-red-500/20 disabled:opacity-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredMembers.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No members found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}

function MemberDetailsSheet({ member, coaches }: { member: any; coaches: any[] }) {
  const queryClient = useQueryClient();
  const status = getSubStatus(member.subscriptionEndDate);

  const updateSub = useMutation({
    mutationFn: (data: any) => apiFetch(`/admin/members/${member.id}/subscription`, { method: 'PUT', data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'members'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'expiring-subscriptions'] });
      toast.success(`✅ Subscription renewed for ${member.name}!`);
    },
    onError: (err: any) => toast.error(err.error || 'Failed'),
  });

  const assignCoach = useMutation({
    mutationFn: (coachId: string) => apiFetch(`/admin/members/${member.id}/assign`, { method: 'PUT', data: { coachId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'members'] });
      toast.success('Coach assigned');
    },
    onError: (err: any) => toast.error(err.error || 'Failed'),
  });

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-white/10 bg-black/20">
        <div className="flex items-center gap-4">
          <GradientAvatar name={member.name} size="lg" />
          <div>
            <h2 className="text-xl font-bold">{member.name}</h2>
            <p className="text-sm text-muted-foreground">{member.email}</p>
            <div className="mt-2"><StatusBadge status={status as BadgeStatus} label={status} /></div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <Tabs defaultValue="info">
          <TabsList className="w-full bg-black/20 mb-6">
            <TabsTrigger value="info" className="flex-1">Info</TabsTrigger>
            <TabsTrigger value="subscription" className="flex-1">Subscription</TabsTrigger>
            <TabsTrigger value="coach" className="flex-1">Coach</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card p-4">
                <p className="text-xs text-muted-foreground">Joined</p>
                <p className="font-medium mt-1">{member.createdAt ? format(new Date(member.createdAt), 'PP') : '-'}</p>
              </div>
              <div className="glass-card p-4">
                <p className="text-xs text-muted-foreground">Subscription End</p>
                <p className="font-medium mt-1">{member.subscriptionEndDate ? format(new Date(member.subscriptionEndDate), 'PP') : '-'}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="subscription" className="space-y-4">
            <div className="glass-card p-4 space-y-4">
              <h3 className="font-medium">Renew Subscription</h3>
              <RenewSubscriptionForm
                isPending={updateSub.isPending}
                onSubmit={(data) => updateSub.mutate(data)}
              />
            </div>
          </TabsContent>

          <TabsContent value="coach" className="space-y-4">
            <div className="glass-card p-4 space-y-4">
              <h3 className="font-medium">Assign Coach</h3>
              <Select onValueChange={(val) => assignCoach.mutate(val)}>
                <SelectTrigger className="bg-black/20"><SelectValue placeholder="Select a coach" /></SelectTrigger>
                <SelectContent>
                  {coaches?.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
