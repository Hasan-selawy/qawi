import { useEffect, useState } from 'react';
import { useParams, Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, ArrowLeft, Sparkles, Users, Palette, KeyRound, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

type GymDetail = {
  id: string;
  name: string;
  adminId: string | null;
  adminEmail: string;
  subscriptionPlan: string;
  totalMembers: number;
  totalCoaches: number;
  nutritionEnabled: boolean;
  pushNotificationsEnabled: boolean;
  customBrandingEnabled: boolean;
  classBookingEnabled: boolean;
  analyticsAdvancedEnabled: boolean;
  maxMembers: number | null;
  logoUrl: string | null;
  primaryColor: string | null;
};

const FEATURE_LIST: Array<{ key: keyof GymDetail; label: string; help: string }> = [
  { key: 'nutritionEnabled',          label: 'Nutrition Plans',      help: 'Coaches can build meal plans for members.' },
  { key: 'pushNotificationsEnabled',  label: 'Push Notifications',   help: 'In-app inbox + push delivery (when off, no notifications are recorded).' },
  { key: 'customBrandingEnabled',     label: 'Custom Branding',      help: 'Gym can set their own logo + primary brand colour on mobile.' },
  { key: 'classBookingEnabled',       label: 'Class Booking',        help: 'Group class scheduling (placeholder — feature ships later).' },
  { key: 'analyticsAdvancedEnabled',  label: 'Advanced Analytics',   help: 'Revenue, growth charts, top performers, weekly attendance breakdown.' },
];

export default function SuperGymDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<GymDetail>({
    queryKey: ['super', 'gym', id],
    queryFn: () => apiFetch(`/super/gyms/${id}`),
  });

  const [features, setFeatures] = useState<Partial<GymDetail>>({});
  const [maxMembers, setMaxMembers] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [primaryColor, setPrimaryColor] = useState<string>('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [showAdminPw, setShowAdminPw] = useState(false);

  useEffect(() => {
    if (!data) return;
    setFeatures({
      nutritionEnabled: data.nutritionEnabled,
      pushNotificationsEnabled: data.pushNotificationsEnabled,
      customBrandingEnabled: data.customBrandingEnabled,
      classBookingEnabled: data.classBookingEnabled,
      analyticsAdvancedEnabled: data.analyticsAdvancedEnabled,
    });
    setMaxMembers(data.maxMembers != null ? String(data.maxMembers) : '');
    setLogoUrl(data.logoUrl ?? '');
    setPrimaryColor(data.primaryColor ?? '');
  }, [data]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['super', 'gym', id] });
    queryClient.invalidateQueries({ queryKey: ['super', 'gyms'] });
  };

  const saveFeatures = useMutation({
    mutationFn: () => apiFetch(`/super/gyms/${id}/features`, { method: 'PUT', data: features }),
    onSuccess: () => { toast.success('Feature flags saved'); invalidate(); },
    onError: (err: any) => toast.error(err.error || 'Failed to save features'),
  });

  const saveLimits = useMutation({
    mutationFn: () => apiFetch(`/super/gyms/${id}/limits`, {
      method: 'PUT',
      data: { maxMembers: maxMembers.trim() === '' ? null : Number(maxMembers) },
    }),
    onSuccess: () => { toast.success('Member cap saved'); invalidate(); },
    onError: (err: any) => toast.error(err.error || 'Failed to save limits'),
  });

  const resetAdminPassword = useMutation({
    mutationFn: () => apiFetch(`/super/users/${data!.adminId}/reset-password`, {
      method: 'PUT',
      data: { newPassword: newAdminPassword },
    }),
    onSuccess: () => {
      toast.success('Admin password reset successfully');
      setNewAdminPassword('');
    },
    onError: (err: any) => toast.error(err.error || 'Failed to reset password'),
  });

  const saveBranding = useMutation({
    mutationFn: () => apiFetch(`/super/gyms/${id}/branding`, {
      method: 'PUT',
      data: {
        logoUrl: logoUrl.trim() === '' ? null : logoUrl.trim(),
        primaryColor: primaryColor.trim() === '' ? null : primaryColor.trim(),
      },
    }),
    onSuccess: () => { toast.success('Branding saved'); invalidate(); },
    onError: (err: any) => toast.error(err.error || 'Failed to save branding'),
  });

  if (isLoading || !data) {
    return <PageWrapper><div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div></PageWrapper>;
  }

  const toggle = (k: keyof GymDetail) =>
    setFeatures((f) => ({ ...f, [k]: !(f as any)[k] }));

  return (
    <PageWrapper>
      <PageHeader
        title={`Configure — ${data.name}`}
        actions={
          <Link href="/super/gyms">
            <Button variant="outline" size="sm"><ArrowLeft size={14} className="mr-1" /> Back to gyms</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Features */}
        <section className="glass-card border border-white/10 rounded-xl p-4 sm:p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={18} className="text-primary" />
            <h2 className="text-lg font-semibold">Pro Features</h2>
          </div>
          <div className="space-y-4">
            {FEATURE_LIST.map((f) => (
              <div key={f.key} className="flex items-start justify-between gap-4 py-2 border-b border-white/5 last:border-0">
                <div className="min-w-0">
                  <div className="font-medium">{f.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{f.help}</div>
                </div>
                <Switch
                  checked={!!(features as any)[f.key]}
                  onCheckedChange={() => toggle(f.key)}
                />
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={() => saveFeatures.mutate()} disabled={saveFeatures.isPending}>
              {saveFeatures.isPending && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
              Save features
            </Button>
          </div>
        </section>

        {/* Limits */}
        <section className="glass-card border border-white/10 rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-primary" />
            <h2 className="text-lg font-semibold">Limits</h2>
          </div>
          <div className="space-y-3">
            <Label htmlFor="maxMembers">Max members (blank = unlimited)</Label>
            <Input
              id="maxMembers"
              type="number"
              min={0}
              placeholder="Unlimited"
              value={maxMembers}
              onChange={(e) => setMaxMembers(e.target.value)}
              className="bg-black/20"
            />
            <div className="text-xs text-muted-foreground">Currently: {data.totalMembers} members</div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={() => saveLimits.mutate()} disabled={saveLimits.isPending}>
              {saveLimits.isPending && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
              Save limits
            </Button>
          </div>
        </section>

        {/* Reset Admin Password */}
        {data.adminId && (
          <section className="glass-card border border-white/10 rounded-xl p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <KeyRound size={18} className="text-primary" />
              <h2 className="text-lg font-semibold">Reset Admin Password</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Set a new password for <span className="text-foreground font-medium">{data.adminEmail}</span>. The admin will need to use this new password on their next login.
            </p>
            <div className="space-y-3">
              <Label htmlFor="adminPw">New password</Label>
              <div className="relative">
                <Input
                  id="adminPw"
                  type={showAdminPw ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  className="bg-black/20 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showAdminPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button
                onClick={() => resetAdminPassword.mutate()}
                disabled={resetAdminPassword.isPending || newAdminPassword.length < 8}
                variant="destructive"
              >
                {resetAdminPassword.isPending && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                Reset password
              </Button>
            </div>
          </section>
        )}

        {/* Branding */}
        <section className="glass-card border border-white/10 rounded-xl p-6 lg:col-span-3">
          <div className="flex items-center gap-2 mb-4">
            <Palette size={18} className="text-primary" />
            <h2 className="text-lg font-semibold">Branding</h2>
            {!features.customBrandingEnabled && (
              <span className="text-xs text-amber-400 ml-2">(Custom Branding feature is OFF — values are stored but not applied on mobile.)</span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input
                id="logoUrl"
                placeholder="https://..."
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="bg-black/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary colour (hex)</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="primaryColor"
                  placeholder="#22c55e"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="bg-black/20"
                />
                <div
                  className="w-10 h-10 rounded border border-white/10"
                  style={{ background: primaryColor || 'transparent' }}
                />
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={() => saveBranding.mutate()} disabled={saveBranding.isPending}>
              {saveBranding.isPending && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
              Save branding
            </Button>
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}
