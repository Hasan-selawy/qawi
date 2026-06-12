import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { useLanguage } from '@/hooks/use-language';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { StatCard } from '@/components/StatCard';
import { StatusBadge, BadgeStatus } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Building2, Users, ShieldCheck, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Link } from 'wouter';

export default function SuperDashboard() {
  const { t, lang } = useLanguage();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const { data: stats } = useQuery<any>({ queryKey: ['super', 'stats'], queryFn: () => apiFetch('/super/stats') });
  const { data: gyms, isLoading: loadingGyms } = useQuery<any[]>({ queryKey: ['super', 'gyms'], queryFn: () => apiFetch('/super/gyms') });
  const { data: plans } = useQuery<any[]>({ queryKey: ['public', 'plans'], queryFn: () => apiFetch('/public/plans') });

  const addGym = useMutation({
    mutationFn: (data: any) => apiFetch('/super/gyms', { method: 'POST', data }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['super', 'gyms'] }); queryClient.invalidateQueries({ queryKey: ['super', 'stats'] }); setIsAddOpen(false); toast.success('Gym created successfully'); },
    onError: (err: any) => toast.error(lang === 'ar' ? err.messageAr : err.error || 'Failed'),
  });

  const renewGym = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiFetch(`/super/gyms/${id}/subscription`, { method: 'PUT', data }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['super', 'gyms'] }); toast.success('Gym subscription renewed'); },
    onError: (err: any) => toast.error(err.error || 'Failed'),
  });

  return (
    <PageWrapper>
      <PageHeader title="Super Admin Portal" actions={<div className="flex gap-2"><Link href="/super/leads"><Button variant="outline">Leads</Button></Link><Dialog open={isAddOpen} onOpenChange={setIsAddOpen}><DialogTrigger asChild><Button className="bg-white text-black hover:bg-white/90 glow-hover"><Plus className="mr-2 h-4 w-4" /> Add New Gym</Button></DialogTrigger><DialogContent className="glass-card border-white/10 sm:max-w-lg"><DialogHeader><DialogTitle>Onboard New Gym</DialogTitle></DialogHeader><form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); addGym.mutate(Object.fromEntries(fd.entries())); }} className="space-y-4"><Input name="gymName" placeholder="Gym Name" required className="bg-black/20" /><Input name="adminName" placeholder="Owner / Admin Name" required className="bg-black/20" /><Input name="adminEmail" type="email" placeholder="Admin Email" required className="bg-black/20" /><Input name="adminPassword" type="password" placeholder="Admin Initial Password" required className="bg-black/20" /><Select name="subscriptionPlan" required defaultValue="BASIC"><SelectTrigger className="bg-black/20"><SelectValue placeholder="Subscription Plan" /></SelectTrigger><SelectContent>{plans?.map((p: any) => <SelectItem key={p.plan} value={p.plan}>{p.plan} — {p.price} JOD/{p.billingCycle === 'yearly' ? 'year' : 'mo'}</SelectItem>)}</SelectContent></Select><Button type="submit" className="w-full h-12" disabled={addGym.isPending}>{addGym.isPending ? <Loader2 className="animate-spin" /> : 'Create Gym & Provision Owner'}</Button></form></DialogContent></Dialog></div>} />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8"><StatCard title={t('super.total_gyms')} value={stats?.totalGyms || 0} icon={<Building2 />} glowColor="blue" /><StatCard title="Active Gyms" value={stats?.activeGyms || 0} icon={<ShieldCheck />} glowColor="green" /><StatCard title="Total Members" value={stats?.totalMembers || 0} icon={<Users />} glowColor="purple" /><StatCard title="Total Coaches" value={stats?.totalCoaches || 0} icon={<Activity />} glowColor="orange" /><StatCard title="Expiring Gyms" value={stats?.expiringGyms || 0} icon={<ShieldCheck className="text-red-500" />} glowColor="red" /></div>
      <div className="glass-card p-4 sm:p-6 border-white/5"><h3 className="font-semibold text-lg mb-6">Registered Gyms</h3>{loadingGyms ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary h-8 w-8" /></div> : <div className="rounded-md border border-white/10 overflow-hidden overflow-x-auto"><Table><TableHeader className="bg-black/20"><TableRow className="border-white/10"><TableHead>Gym Name</TableHead><TableHead>Admin Email</TableHead><TableHead>Plan</TableHead><TableHead>Members / Coaches</TableHead><TableHead>Expires</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{gyms?.map((gym: any) => (<TableRow key={gym.id} className="border-white/10"><TableCell className="font-medium">{gym.name}</TableCell><TableCell className="text-muted-foreground text-sm">{gym.adminEmail}</TableCell><TableCell><span className="text-xs font-mono bg-white/5 px-2 py-1 rounded">{gym.subscriptionPlan}</span></TableCell><TableCell className="text-sm"><span className="text-blue-400">{gym.totalMembers ?? 0}</span> / <span className="text-orange-400">{gym.totalCoaches ?? 0}</span></TableCell><TableCell className="text-xs text-muted-foreground">{gym.subscriptionExpiresAt ? format(new Date(gym.subscriptionExpiresAt), 'PP') : '-'}</TableCell><TableCell><StatusBadge status={(gym.subscriptionStatus || 'ACTIVE') as BadgeStatus} label={gym.subscriptionStatus || 'ACTIVE'} /></TableCell><TableCell className="text-right space-x-2"><Link href={`/super/gyms/${gym.id}`}><Button variant="outline" size="sm" title="Configure features, limits & branding"><Plus size={14} className="mr-1" /> Configure</Button></Link><Dialog><DialogTrigger asChild><Button variant="outline" size="sm">Renew</Button></DialogTrigger><DialogContent className="glass-card border-white/10"><DialogHeader><DialogTitle>Renew License — {gym.name}</DialogTitle></DialogHeader><form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); renewGym.mutate({ id: gym.id, data: { subscriptionPlan: fd.get('subscriptionPlan'), subscriptionExpiresAt: fd.get('expiresAt') } }); }} className="space-y-4"><Select name="subscriptionPlan" required defaultValue={gym.subscriptionPlan}><SelectTrigger className="bg-black/20"><SelectValue placeholder="New Plan" /></SelectTrigger><SelectContent>{plans?.map((p: any) => <SelectItem key={p.plan} value={p.plan}>{p.plan} — {p.price} JOD/{p.billingCycle === 'yearly' ? 'year' : 'mo'}</SelectItem>)}</SelectContent></Select><Input name="expiresAt" type="date" required className="bg-black/20" /><Button type="submit" className="w-full" disabled={renewGym.isPending}>Renew License</Button></form></DialogContent></Dialog></TableCell></TableRow>))}{gyms?.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No gyms registered</TableCell></TableRow>}</TableBody></Table></div>}</div>
    </PageWrapper>
  );
}
