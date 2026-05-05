import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { useLanguage } from '@/hooks/use-language';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Plus, Pencil, EyeOff, Clock, CheckCircle2, XCircle, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const DURATIONS = [
  { key: 'ONE_MONTH', labelEn: '1 Month', labelAr: 'شهر واحد' },
  { key: 'THREE_MONTHS', labelEn: '3 Months', labelAr: '3 أشهر' },
  { key: 'SIX_MONTHS', labelEn: '6 Months', labelAr: '6 أشهر' },
  { key: 'TWELVE_MONTHS', labelEn: '12 Months', labelAr: '12 شهراً' },
];

function PlanForm({ plan, onSave, onCancel, isPending }: {
  plan?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const { lang } = useLanguage();
  const [name, setName] = useState(plan?.name ?? '');
  const [nameAr, setNameAr] = useState(plan?.nameAr ?? '');
  const [duration, setDuration] = useState(plan?.duration ?? 'ONE_MONTH');
  const [price, setPrice] = useState(plan?.price != null ? String(plan.price) : '');
  const [desc, setDesc] = useState(plan?.description ?? '');
  const [descAr, setDescAr] = useState(plan?.descriptionAr ?? '');

  const handleSave = () => {
    if (!name.trim()) { toast.error('Plan name is required'); return; }
    onSave({
      name: name.trim(),
      nameAr: nameAr.trim() || null,
      duration,
      price: parseFloat(price) || 0,
      description: desc.trim() || null,
      descriptionAr: descAr.trim() || null,
      active: true,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Name (EN)</Label><Input value={name} onChange={e => setName(e.target.value)} className="bg-black/20 mt-1" /></div>
        <div><Label>Name (AR)</Label><Input value={nameAr} onChange={e => setNameAr(e.target.value)} className="bg-black/20 mt-1" dir="rtl" /></div>
      </div>

      <div>
        <Label className="mb-2 block">Duration</Label>
        <div className="grid grid-cols-2 gap-2">
          {DURATIONS.map(d => (
            <button key={d.key} onClick={() => setDuration(d.key)}
              className={cn('px-3 py-2 rounded-lg text-sm font-medium border transition-all',
                duration === d.key ? 'bg-primary text-black border-primary' : 'border-white/10 hover:border-primary/40')}>
              {lang === 'ar' ? d.labelAr : d.labelEn}
            </button>
          ))}
        </div>
      </div>

      <div><Label>Price (JOD)</Label><Input value={price} onChange={e => setPrice(e.target.value)} className="bg-black/20 mt-1" type="number" step="0.001" /></div>

      <div className="grid grid-cols-2 gap-4">
        <div><Label>Description (EN)</Label><Input value={desc} onChange={e => setDesc(e.target.value)} className="bg-black/20 mt-1" /></div>
        <div><Label>Description (AR)</Label><Input value={descAr} onChange={e => setDescAr(e.target.value)} className="bg-black/20 mt-1" dir="rtl" /></div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button onClick={handleSave} disabled={isPending} className="flex-1">
          {isPending ? <Loader2 className="animate-spin h-4 w-4" /> : 'Save Plan'}
        </Button>
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  APPROVED: 'text-green-400 bg-green-400/10 border-green-400/30',
  REJECTED: 'text-destructive bg-destructive/10 border-destructive/30',
};

const STATUS_ICONS: Record<string, any> = {
  PENDING: Clock,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
};

export default function AdminPricing() {
  const { t, lang } = useLanguage();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'plans' | 'requests'>('plans');
  const [editPlan, setEditPlan] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data: plans = [], isLoading: loadingPlans } = useQuery<any[]>({
    queryKey: ['admin', 'member-plans'],
    queryFn: () => apiFetch('/admin/member-plans'),
  });

  const { data: requests = [], isLoading: loadingRequests } = useQuery<any[]>({
    queryKey: ['admin', 'renewal-requests'],
    queryFn: () => apiFetch('/admin/renewal-requests'),
  });

  const createMut = useMutation({
    mutationFn: (data: any) => apiFetch('/admin/member-plans', { method: 'POST', data }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'member-plans'] }); setShowCreate(false); toast.success('Plan created!'); },
    onError: (e: any) => toast.error(lang === 'ar' ? e.messageAr : e.error || 'Failed'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => apiFetch(`/admin/member-plans/${id}`, { method: 'PUT', data }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'member-plans'] }); setEditPlan(null); toast.success('Plan updated!'); },
    onError: (e: any) => toast.error(lang === 'ar' ? e.messageAr : e.error || 'Failed'),
  });

  const deactivateMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/member-plans/${id}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'member-plans'] }); toast.success('Plan deactivated'); },
    onError: (e: any) => toast.error(lang === 'ar' ? e.messageAr : e.error || 'Failed'),
  });

  const updateStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch(`/admin/renewal-requests/${id}/status`, { method: 'PUT', data: { status } }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'renewal-requests'] }); toast.success('Status updated'); },
    onError: (e: any) => toast.error(lang === 'ar' ? e.messageAr : e.error || 'Failed'),
  });

  const pendingCount = requests.filter((r: any) => r.status === 'PENDING').length;

  const groupedPlans: Record<string, any[]> = {};
  plans.forEach((p: any) => {
    const lbl = p.durationLabel || p.duration;
    if (!groupedPlans[lbl]) groupedPlans[lbl] = [];
    groupedPlans[lbl].push(p);
  });

  return (
    <PageWrapper>
      <PageHeader
        title={lang === 'ar' ? 'إدارة خطط الأعضاء' : 'Member Pricing Plans'}
        subtitle={lang === 'ar' ? 'أضف وعدّل خطط الاشتراك للأعضاء' : 'Set pricing plans visible to members in the mobile app'}
        action={
          tab === 'plans' ? (
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus size={16} className="mr-2" />
              {lang === 'ar' ? 'إضافة خطة' : 'Add Plan'}
            </Button>
          ) : undefined
        }
      />

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('plans')}
          className={cn('px-5 py-2 rounded-full text-sm font-semibold transition-all border',
            tab === 'plans' ? 'bg-primary text-black border-primary' : 'border-white/10 text-muted-foreground hover:border-primary/40')}>
          {lang === 'ar' ? 'الخطط' : 'Plans'} ({plans.filter(p => p.active).length})
        </button>
        <button onClick={() => setTab('requests')}
          className={cn('px-5 py-2 rounded-full text-sm font-semibold transition-all border relative',
            tab === 'requests' ? 'bg-primary text-black border-primary' : 'border-white/10 text-muted-foreground hover:border-primary/40')}>
          <Bell size={14} className="inline mr-1" />
          {lang === 'ar' ? 'طلبات التجديد' : 'Renewal Requests'}
          {pendingCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-destructive text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* Plans Tab */}
      {tab === 'plans' && (
        loadingPlans ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedPlans).map(([duration, dPlans]) => (
              <div key={duration}>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{duration}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {dPlans.map((plan: any) => (
                    <div key={plan.id} className={cn(
                      'glass-card p-5 border transition-all',
                      plan.active ? 'border-white/10 hover:border-primary/30' : 'border-white/5 opacity-50'
                    )}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-bold">{lang === 'ar' ? (plan.nameAr || plan.name) : plan.name}</p>
                          {lang === 'en' && plan.nameAr && <p className="text-xs text-muted-foreground" dir="rtl">{plan.nameAr}</p>}
                          {plan.description && <p className="text-xs text-muted-foreground mt-0.5">{lang === 'ar' ? (plan.descriptionAr || plan.description) : plan.description}</p>}
                        </div>
                        {!plan.active && <span className="text-[10px] text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full">Inactive</span>}
                      </div>
                      <div className="text-2xl font-extrabold text-primary mb-4">
                        {Number(plan.price).toFixed(3)} <span className="text-sm font-normal text-muted-foreground">JOD</span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditPlan(plan)}>
                          <Pencil size={13} className="mr-1" /> Edit
                        </Button>
                        {plan.active && (
                          <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10"
                            onClick={() => deactivateMut.mutate(plan.id)} disabled={deactivateMut.isPending}>
                            <EyeOff size={13} />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {plans.length === 0 && (
              <div className="text-center py-16 glass-card border-dashed border-white/20 text-muted-foreground">
                <Plus size={40} className="mx-auto mb-3 opacity-30" />
                <p>No plans yet. Add your first pricing plan.</p>
              </div>
            )}
          </div>
        )
      )}

      {/* Requests Tab */}
      {tab === 'requests' && (
        loadingRequests ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>
        ) : (
          <div className="space-y-4">
            {requests.map((req: any) => {
              const StatusIcon = STATUS_ICONS[req.status] ?? Clock;
              return (
                <div key={req.id} className="glass-card p-5 border border-white/10 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-bold">{req.memberName}</span>
                      <span className={cn('inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border', STATUS_COLORS[req.status] ?? '')}>
                        <StatusIcon size={11} /> {req.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {lang === 'ar' ? (req.planNameAr || req.planName) : req.planName}
                      {req.planDuration && <span className="ml-2 text-xs">· {req.planDuration}</span>}
                    </p>
                    {req.notes && <p className="text-xs text-muted-foreground mt-1 italic">"{req.notes}"</p>}
                    <p className="text-xs text-muted-foreground mt-1">{req.createdAt ? format(new Date(req.createdAt), 'dd MMM yyyy, HH:mm') : ''}</p>
                  </div>
                  {req.status === 'PENDING' && (
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="outline" className="text-green-400 border-green-400/30 hover:bg-green-400/10"
                        onClick={() => updateStatusMut.mutate({ id: req.id, status: 'APPROVED' })}
                        disabled={updateStatusMut.isPending}>
                        <CheckCircle2 size={14} className="mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={() => updateStatusMut.mutate({ id: req.id, status: 'REJECTED' })}
                        disabled={updateStatusMut.isPending}>
                        <XCircle size={14} className="mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
            {requests.length === 0 && (
              <div className="text-center py-16 glass-card border-dashed border-white/20 text-muted-foreground">
                <Bell size={40} className="mx-auto mb-3 opacity-30" />
                <p>No renewal requests yet.</p>
              </div>
            )}
          </div>
        )
      )}

      {/* Create Plan dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="glass-card border-white/10 max-w-lg">
          <DialogHeader><DialogTitle>{lang === 'ar' ? 'إضافة خطة جديدة' : 'Add New Plan'}</DialogTitle></DialogHeader>
          <PlanForm onSave={(d) => createMut.mutate(d)} onCancel={() => setShowCreate(false)} isPending={createMut.isPending} />
        </DialogContent>
      </Dialog>

      {/* Edit Plan dialog */}
      <Dialog open={!!editPlan} onOpenChange={(o) => !o && setEditPlan(null)}>
        <DialogContent className="glass-card border-white/10 max-w-lg">
          <DialogHeader><DialogTitle>{lang === 'ar' ? 'تعديل الخطة' : 'Edit Plan'}</DialogTitle></DialogHeader>
          {editPlan && (
            <PlanForm
              plan={editPlan}
              onSave={(d) => updateMut.mutate({ id: editPlan.id, data: d })}
              onCancel={() => setEditPlan(null)}
              isPending={updateMut.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
