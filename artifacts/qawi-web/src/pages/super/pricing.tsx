import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { useLanguage } from '@/hooks/use-language';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Plus, Pencil, Trash2, Star, Check, X, DollarSign, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const PLAN_KEYS = ['BASIC', 'PRO', 'ENTERPRISE'] as const;

function TierForm({ tier, onSave, onCancel, isPending }: {
  tier?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(tier?.name ?? '');
  const [nameAr, setNameAr] = useState(tier?.nameAr ?? '');
  const [p1m, setP1m] = useState(String(tier?.price1m ?? ''));
  const [p3m, setP3m] = useState(String(tier?.price3m ?? ''));
  const [p6m, setP6m] = useState(String(tier?.price6m ?? ''));
  const [p12m, setP12m] = useState(String(tier?.price12m ?? ''));
  const [features, setFeatures] = useState((tier?.features ?? []).join('\n'));
  const [featuresAr, setFeaturesAr] = useState((tier?.featuresAr ?? []).join('\n'));
  const [highlighted, setHighlighted] = useState(tier?.highlighted ?? false);
  const [plan, setPlan] = useState(tier?.subscriptionPlan ?? 'BASIC');
  const [maxMembers, setMaxMembers] = useState(tier?.maxMembers ? String(tier.maxMembers) : '');
  const [maxCoaches, setMaxCoaches] = useState(tier?.maxCoaches ? String(tier.maxCoaches) : '');

  const handleSave = () => {
    if (!name.trim()) { toast.error('Name is required'); return; }
    onSave({
      name: name.trim(),
      nameAr: nameAr.trim() || null,
      price1m: parseInt(p1m) || 0,
      price3m: parseInt(p3m) || 0,
      price6m: parseInt(p6m) || 0,
      price12m: parseInt(p12m) || 0,
      features: features.split('\n').map((f: string) => f.trim()).filter(Boolean),
      featuresAr: featuresAr.split('\n').map((f: string) => f.trim()).filter(Boolean),
      highlighted,
      subscriptionPlan: plan,
      maxMembers: maxMembers ? parseInt(maxMembers) : null,
      maxCoaches: maxCoaches ? parseInt(maxCoaches) : null,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Name (EN)</Label><Input value={name} onChange={e => setName(e.target.value)} className="bg-black/20 mt-1" /></div>
        <div><Label>Name (AR)</Label><Input value={nameAr} onChange={e => setNameAr(e.target.value)} className="bg-black/20 mt-1" dir="rtl" /></div>
      </div>

      <div>
        <Label className="mb-2 block">Platform Plan</Label>
        <div className="flex gap-2">
          {PLAN_KEYS.map(k => (
            <button key={k} onClick={() => setPlan(k)}
              className={cn('px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all', plan === k ? 'bg-primary text-black border-primary' : 'border-white/10 hover:border-primary/50')}>
              {k}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[['1M', p1m, setP1m], ['3M', p3m, setP3m], ['6M', p6m, setP6m], ['12M', p12m, setP12m]].map(([lbl, val, set]) => (
          <div key={lbl as string}>
            <Label>{lbl as string} price (JOD)</Label>
            <Input value={val as string} onChange={e => (set as any)(e.target.value)} className="bg-black/20 mt-1" type="number" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div><Label>Max Members (blank = unlimited)</Label><Input value={maxMembers} onChange={e => setMaxMembers(e.target.value)} className="bg-black/20 mt-1" type="number" /></div>
        <div><Label>Max Coaches (blank = unlimited)</Label><Input value={maxCoaches} onChange={e => setMaxCoaches(e.target.value)} className="bg-black/20 mt-1" type="number" /></div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Features (EN, one per line)</Label>
          <textarea value={features} onChange={e => setFeatures(e.target.value)}
            className="w-full mt-1 bg-black/20 border border-input rounded-md px-3 py-2 text-sm h-32 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Up to 50 members&#10;Workout plans&#10;..." />
        </div>
        <div>
          <Label>Features (AR, one per line)</Label>
          <textarea value={featuresAr} onChange={e => setFeaturesAr(e.target.value)} dir="rtl"
            className="w-full mt-1 bg-black/20 border border-input rounded-md px-3 py-2 text-sm h-32 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="حتى 50 عضو&#10;خطط التمرين&#10;..." />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Switch checked={highlighted} onCheckedChange={setHighlighted} />
        <Label>Mark as "Most Popular"</Label>
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button onClick={handleSave} disabled={isPending} className="flex-1">
          {isPending ? <Loader2 className="animate-spin h-4 w-4" /> : 'Save Tier'}
        </Button>
      </div>
    </div>
  );
}

export default function SuperPricing() {
  const { lang } = useLanguage();
  const queryClient = useQueryClient();

  const { data: tiers = [], isLoading } = useQuery<any[]>({
    queryKey: ['super', 'platform-tiers'],
    queryFn: () => apiFetch('/super/platform-tiers'),
  });

  const { data: page, isLoading: loadingPage } = useQuery<any>({
    queryKey: ['super', 'platform-page'],
    queryFn: () => apiFetch('/super/platform-page'),
  });

  const [editTier, setEditTier] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [pageEdit, setPageEdit] = useState(false);
  const [pageForm, setPageForm] = useState<any>({});

  const createMut = useMutation({
    mutationFn: (data: any) => apiFetch('/super/platform-tiers', { method: 'POST', data }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['super', 'platform-tiers'] }); queryClient.invalidateQueries({ queryKey: ['public', 'platform-tiers'] }); setShowCreate(false); toast.success('Tier created!'); },
    onError: (e: any) => toast.error(e.error || 'Failed'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => apiFetch(`/super/platform-tiers/${id}`, { method: 'PUT', data }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['super', 'platform-tiers'] }); queryClient.invalidateQueries({ queryKey: ['public', 'platform-tiers'] }); setEditTier(null); toast.success('Tier updated!'); },
    onError: (e: any) => toast.error(e.error || 'Failed'),
  });

  const deactivateMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/super/platform-tiers/${id}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['super', 'platform-tiers'] }); queryClient.invalidateQueries({ queryKey: ['public', 'platform-tiers'] }); toast.success('Tier deactivated'); },
    onError: (e: any) => toast.error(e.error || 'Failed'),
  });

  const updatePageMut = useMutation({
    mutationFn: (data: any) => apiFetch('/super/platform-page', { method: 'PUT', data }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['super', 'platform-page'] }); queryClient.invalidateQueries({ queryKey: ['public', 'platform-page'] }); setPageEdit(false); toast.success('Page content updated!'); },
    onError: (e: any) => toast.error(e.error || 'Failed'),
  });

  const openPageEdit = () => {
    setPageForm({ ...page });
    setPageEdit(true);
  };

  return (
    <PageWrapper>
      <PageHeader
        title="Platform Pricing"
        subtitle="Manage platform subscription tiers shown during gym registration"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={openPageEdit}>
              <FileText size={16} className="mr-2" /> Edit Page Content
            </Button>
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus size={16} className="mr-2" /> Add Tier
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {tiers.map((tier: any) => (
            <div key={tier.id} className={cn(
              'glass-card p-6 border relative flex flex-col',
              tier.highlighted ? 'border-primary shadow-[0_0_24px_rgba(34,197,94,0.15)]' : 'border-white/10',
              !tier.active && 'opacity-50'
            )}>
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary text-black px-3 py-1 text-xs font-bold flex items-center gap-1">
                  <Star size={10} fill="black" /> Most Popular
                </div>
              )}
              {!tier.active && (
                <div className="absolute top-3 right-3 bg-destructive/20 text-destructive px-2 py-0.5 rounded-full text-xs font-medium border border-destructive/30">
                  Inactive
                </div>
              )}

              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-lg">{tier.name}</h3>
                  <p className="text-muted-foreground text-sm" dir="rtl">{tier.nameAr}</p>
                  <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">{tier.subscriptionPlan}</span>
                </div>
              </div>

              {/* Pricing grid */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  { lbl: '1M', val: tier.price1m },
                  { lbl: '3M', val: tier.price3m },
                  { lbl: '6M', val: tier.price6m, save: tier.save6mPercent },
                  { lbl: '12M', val: tier.price12m, save: tier.save12mPercent },
                ].map(({ lbl, val, save }: any) => (
                  <div key={lbl} className="bg-white/5 rounded-lg p-2 text-center">
                    <div className="text-xs text-muted-foreground">{lbl}</div>
                    <div className="font-bold text-primary">{val} <span className="text-xs font-normal text-muted-foreground">JOD</span></div>
                    {save > 0 && <div className="text-[10px] text-green-400">Save {save}%</div>}
                  </div>
                ))}
              </div>

              {/* Features */}
              <ul className="space-y-1.5 mb-4 flex-1">
                {(tier.features ?? []).map((f: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check size={13} className="text-primary shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="flex gap-2 mt-auto pt-4 border-t border-white/5">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditTier(tier)}>
                  <Pencil size={14} className="mr-1.5" /> Edit
                </Button>
                {tier.active && (
                  <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => deactivateMut.mutate(tier.id)}
                    disabled={deactivateMut.isPending}>
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="glass-card border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add New Pricing Tier</DialogTitle></DialogHeader>
          <TierForm onSave={(d) => createMut.mutate(d)} onCancel={() => setShowCreate(false)} isPending={createMut.isPending} />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTier} onOpenChange={(o) => !o && setEditTier(null)}>
        <DialogContent className="glass-card border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Tier — {editTier?.name}</DialogTitle></DialogHeader>
          {editTier && (
            <TierForm
              tier={editTier}
              onSave={(d) => updateMut.mutate({ id: editTier.id, data: d })}
              onCancel={() => setEditTier(null)}
              isPending={updateMut.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Page Content dialog */}
      <Dialog open={pageEdit} onOpenChange={setPageEdit}>
        <DialogContent className="glass-card border-white/10 max-w-xl">
          <DialogHeader><DialogTitle>Edit Registration Page Content</DialogTitle></DialogHeader>
          {loadingPage ? <Loader2 className="animate-spin h-6 w-6 mx-auto" /> : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Title (EN)</Label><Input value={pageForm.title || ''} onChange={e => setPageForm((p: any) => ({ ...p, title: e.target.value }))} className="bg-black/20 mt-1" /></div>
                <div><Label>Title (AR)</Label><Input value={pageForm.titleAr || ''} onChange={e => setPageForm((p: any) => ({ ...p, titleAr: e.target.value }))} className="bg-black/20 mt-1" dir="rtl" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Subtitle (EN)</Label><Input value={pageForm.subtitle || ''} onChange={e => setPageForm((p: any) => ({ ...p, subtitle: e.target.value }))} className="bg-black/20 mt-1" /></div>
                <div><Label>Subtitle (AR)</Label><Input value={pageForm.subtitleAr || ''} onChange={e => setPageForm((p: any) => ({ ...p, subtitleAr: e.target.value }))} className="bg-black/20 mt-1" dir="rtl" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Footer Text (EN)</Label><Input value={pageForm.footerText || ''} onChange={e => setPageForm((p: any) => ({ ...p, footerText: e.target.value }))} className="bg-black/20 mt-1" /></div>
                <div><Label>Footer Text (AR)</Label><Input value={pageForm.footerTextAr || ''} onChange={e => setPageForm((p: any) => ({ ...p, footerTextAr: e.target.value }))} className="bg-black/20 mt-1" dir="rtl" /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setPageEdit(false)}>Cancel</Button>
                <Button className="flex-1" disabled={updatePageMut.isPending} onClick={() => updatePageMut.mutate(pageForm)}>
                  {updatePageMut.isPending ? <Loader2 className="animate-spin h-4 w-4" /> : 'Save'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
