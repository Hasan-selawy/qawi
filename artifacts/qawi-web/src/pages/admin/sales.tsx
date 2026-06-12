import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { useLanguage } from '@/hooks/use-language';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Plus, Search, Trash2, Edit2, UserPlus, MessageCircle,
  RefreshCw, StickyNote, Users, TrendingDown, Clock, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type CrmRecord = {
  id: string; gymId: string;
  type: 'PROSPECT' | 'MEMBER';
  memberId?: string;
  name: string; phoneNumber?: string; email?: string;
  status: string; notes?: string;
  coachId?: string; coachName?: string;
  subscriptionStartDate?: string; subscriptionEndDate?: string;
  daysRemaining?: number;
  lastContactedAt?: string; nextFollowUpAt?: string; createdAt: string;
  canConvert: boolean; canRenew: boolean; canDelete: boolean;
};
type Coach = { id: string; name: string; email: string };

const STATUS_CFG: Record<string, { en: string; ar: string; color: string; bg: string }> = {
  NEW:             { en: 'New',            ar: 'جديد',         color: '#3B82F6', bg: '#3B82F618' },
  CONTACTED:       { en: 'Contacted',      ar: 'تم التواصل',   color: '#F59E0B', bg: '#F59E0B18' },
  VISIT_SCHEDULED: { en: 'Visit Scheduled',ar: 'موعد زيارة',  color: '#8B5CF6', bg: '#8B5CF618' },
  SIGNED_UP:       { en: 'Signed Up',      ar: 'انتسب',        color: '#06B6D4', bg: '#06B6D418' },
  ACTIVE:          { en: 'Active',         ar: 'نشط',          color: '#22C55E', bg: '#22C55E18' },
  EXPIRING_SOON:   { en: 'Expiring Soon',  ar: 'ينتهي قريباً', color: '#F59E0B', bg: '#F59E0B18' },
  EXPIRED:         { en: 'Expired',        ar: 'منتهي',        color: '#EF4444', bg: '#EF444418' },
  LOST:            { en: 'Lost',           ar: 'خسرناه',       color: '#6B7280', bg: '#6B728018' },
};
const PROSPECT_STATUSES = ['NEW', 'CONTACTED', 'VISIT_SCHEDULED', 'SIGNED_UP', 'LOST'];

const FILTER_TABS = [
  { id: 'all',                 en: 'All',          ar: 'الكل' },
  { id: 'type:PROSPECT',       en: 'Leads',        ar: 'عملاء محتملون' },
  { id: 'status:ACTIVE',       en: 'Active',       ar: 'نشطون' },
  { id: 'status:EXPIRING_SOON',en: 'Expiring Soon',ar: 'تنتهي قريباً' },
  { id: 'status:EXPIRED',      en: 'Expired',      ar: 'منتهيون' },
  { id: 'status:LOST',         en: 'Lost',         ar: 'خسرناهم' },
];

function fmtDate(d?: string | null) {
  if (!d) return '—';
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
}

function normalizePhone(phone: string): string {
  const p = (phone || '').replace(/[\s\-()]/g, '');
  if (p.startsWith('00')) return p.slice(2);
  if (p.startsWith('+'))  return p.slice(1);
  if (p.startsWith('07')) return '962' + p.slice(1);
  return p;
}

function makeWaUrl(rec: CrmRecord, gymName: string): string {
  const phone = normalizePhone(rec.phoneNumber ?? '');
  let msg: string;
  if (rec.type === 'PROSPECT') {
    msg = `مرحبا ${rec.name}، معك فريق ${gymName}. حابين نساعدك تبدأ معنا في النادي 💪`;
  } else if (rec.status === 'EXPIRING_SOON') {
    msg = `مرحبا ${rec.name}، اشتراكك في ${gymName} سينتهي بتاريخ ${fmtDate(rec.subscriptionEndDate)}. يسعدنا تجديد اشتراكك 💪`;
  } else if (rec.status === 'EXPIRED' || rec.status === 'LOST') {
    msg = `مرحبا ${rec.name}، اشتراكك في ${gymName} انتهى. يمكنك التجديد في أي وقت، ونرحب برجعتك 💪`;
  } else {
    msg = `مرحبا ${rec.name}، نتمنى تكون مستمتع بتدريبك في ${gymName}. إذا تحتاج أي مساعدة احنا جاهزين 💪`;
  }
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

function StatusBadge({ status, lang }: { status: string; lang: string }) {
  const cfg = STATUS_CFG[status] ?? { en: status, ar: status, color: '#6B7280', bg: '#6B728018' };
  return (
    <span className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}>
      {lang === 'ar' ? cfg.ar : cfg.en}
    </span>
  );
}

function TypeBadge({ type, lang }: { type: string; lang: string }) {
  const isProspect = type === 'PROSPECT';
  return (
    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full',
      isProspect ? 'bg-violet-500/15 text-violet-400' : 'bg-green-500/15 text-green-400')}>
      {lang === 'ar' ? (isProspect ? 'محتمل' : 'عضو') : (isProspect ? 'Lead' : 'Member')}
    </span>
  );
}

function DaysLeft({ days }: { days?: number }) {
  if (days === undefined || days === null) return <span className="text-muted-foreground">—</span>;
  if (days < 0) return <span className="text-red-400 text-xs font-semibold">{days}d</span>;
  if (days <= 7) return <span className="text-yellow-400 text-xs font-semibold">{days}d</span>;
  return <span className="text-green-400 text-xs font-semibold">{days}d</span>;
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <div className="glass-card p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

// ── Add Lead Dialog ────────────────────────────────────────────────────────────
function AddLeadDialog({ open, onClose, lang }: { open: boolean; onClose: () => void; lang: string }) {
  const qc = useQueryClient();
  const isAr = lang === 'ar';
  const [name, setName]   = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  const mut = useMutation({
    mutationFn: () => apiFetch('/gym/leads', {
      method: 'POST',
      data: { name, phoneNumber: phone, email: email || null, notes: notes || null },
    }),
    onSuccess: () => {
      toast.success(isAr ? 'تمت الإضافة ✅' : 'Lead added ✅');
      qc.invalidateQueries({ queryKey: ['gym','leads'] });
      onClose();
      setName(''); setPhone(''); setEmail(''); setNotes('');
    },
    onError: (e: any) => toast.error(e?.body?.error ?? 'Error'),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-background border-white/10">
        <DialogHeader>
          <DialogTitle className="text-foreground">{isAr ? 'إضافة عميل محتمل' : 'Add Lead'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder={isAr ? 'الاسم (مطلوب)' : 'Name (required)'}
            value={name} onChange={e => setName(e.target.value)} className="bg-white/5 border-white/10 text-foreground" />
          <Input placeholder={isAr ? 'رقم الهاتف (مطلوب)' : 'Phone (required)'}
            value={phone} onChange={e => setPhone(e.target.value)} className="bg-white/5 border-white/10 text-foreground" />
          <Input placeholder={isAr ? 'البريد الإلكتروني (اختياري)' : 'Email (optional)'}
            type="email" value={email} onChange={e => setEmail(e.target.value)} className="bg-white/5 border-white/10 text-foreground" />
          <Textarea placeholder={isAr ? 'ملاحظات (اختياري)' : 'Notes (optional)'}
            value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="bg-white/5 border-white/10 text-foreground" />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
          <Button onClick={() => mut.mutate()} disabled={!name.trim() || !phone.trim() || mut.isPending}>
            {mut.isPending ? '...' : (isAr ? 'إضافة' : 'Add')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Lead Dialog (PROSPECT only) ──────────────────────────────────────────
function EditLeadDialog({ lead, onClose, lang }: { lead: CrmRecord | null; onClose: () => void; lang: string }) {
  const qc = useQueryClient();
  const isAr = lang === 'ar';
  const [status, setStatus] = useState(lead?.status ?? 'NEW');
  const [notes, setNotes]   = useState(lead?.notes ?? '');
  const [followUp, setFollowUp] = useState(lead?.nextFollowUpAt?.slice(0,10) ?? '');

  const mut = useMutation({
    mutationFn: () => apiFetch(`/gym/leads/${lead!.id}`, {
      method: 'PUT',
      data: { status, notes: notes || null, nextFollowUpAt: followUp || null },
    }),
    onSuccess: () => {
      toast.success(isAr ? 'تم التحديث' : 'Updated');
      qc.invalidateQueries({ queryKey: ['gym','leads'] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.body?.error ?? 'Error'),
  });

  if (!lead) return null;
  return (
    <Dialog open={!!lead} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-background border-white/10">
        <DialogHeader>
          <DialogTitle className="text-foreground">{isAr ? 'تعديل العميل' : 'Edit Lead'} — {lead.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="bg-white/5 border-white/10 text-foreground"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-background border-white/10">
              {PROSPECT_STATUSES.map(s => (
                <SelectItem key={s} value={s} className="text-foreground">
                  {isAr ? STATUS_CFG[s]?.ar : STATUS_CFG[s]?.en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea placeholder={isAr ? 'ملاحظات' : 'Notes'}
            value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="bg-white/5 border-white/10 text-foreground" />
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{isAr ? 'تاريخ المتابعة التالي' : 'Next Follow-up'}</label>
            <Input type="date" value={followUp} onChange={e => setFollowUp(e.target.value)} className="bg-white/5 border-white/10 text-foreground" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>{isAr ? 'حفظ' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Convert to Member Dialog ───────────────────────────────────────────────────
function ConvertDialog({ lead, coaches, onClose, lang }: { lead: CrmRecord | null; coaches: Coach[]; onClose: () => void; lang: string }) {
  const qc = useQueryClient();
  const isAr = lang === 'ar';
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [coachId, setCoachId] = useState('none');
  const [subEnd, setSubEnd]   = useState('');

  const mut = useMutation({
    mutationFn: () => apiFetch(`/gym/leads/${lead!.id}/convert`, {
      method: 'POST',
      data: { email, password, coachId: coachId !== 'none' ? coachId : null, subscriptionEndDate: subEnd || null },
    }),
    onSuccess: () => {
      toast.success(isAr ? `${lead!.name} أصبح عضواً! ✅` : `${lead!.name} converted to member! ✅`);
      qc.invalidateQueries({ queryKey: ['gym','leads'] });
      qc.invalidateQueries({ queryKey: ['admin','members'] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.body?.error ?? 'Error'),
  });

  if (!lead) return null;
  return (
    <Dialog open={!!lead} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-background border-white/10">
        <DialogHeader>
          <DialogTitle className="text-foreground">{isAr ? 'تحويل إلى عضو' : 'Convert to Member'}</DialogTitle>
          <p className="text-sm text-muted-foreground">{lead.name} · {lead.phoneNumber}</p>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder={isAr ? 'البريد الإلكتروني' : 'Email'} type="email"
            value={email} onChange={e => setEmail(e.target.value)} className="bg-white/5 border-white/10 text-foreground" />
          <Input placeholder={isAr ? 'كلمة المرور (6+ أحرف)' : 'Password (6+ chars)'} type="password"
            value={password} onChange={e => setPassword(e.target.value)} className="bg-white/5 border-white/10 text-foreground" />
          <Select value={coachId} onValueChange={setCoachId}>
            <SelectTrigger className="bg-white/5 border-white/10 text-foreground">
              <SelectValue placeholder={isAr ? 'تعيين مدرب (اختياري)' : 'Assign coach (optional)'} />
            </SelectTrigger>
            <SelectContent className="bg-background border-white/10">
              <SelectItem value="none" className="text-foreground">{isAr ? 'بدون مدرب' : 'No coach'}</SelectItem>
              {coaches.map(c => <SelectItem key={c.id} value={c.id} className="text-foreground">{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{isAr ? 'تاريخ انتهاء الاشتراك' : 'Subscription End Date'}</label>
            <Input type="date" value={subEnd} onChange={e => setSubEnd(e.target.value)} className="bg-white/5 border-white/10 text-foreground" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
          <Button onClick={() => mut.mutate()} disabled={!email.trim() || password.length < 6 || mut.isPending}>
            {mut.isPending ? '...' : (isAr ? 'تحويل إلى عضو' : 'Convert to Member')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Add Note Dialog (MEMBER only) ─────────────────────────────────────────────
function AddNoteDialog({ lead, onClose, lang }: { lead: CrmRecord | null; onClose: () => void; lang: string }) {
  const qc = useQueryClient();
  const isAr = lang === 'ar';
  const [note, setNote] = useState('');

  const mut = useMutation({
    mutationFn: () => apiFetch(`/gym/leads/${lead!.id}/note`, { method: 'POST', data: { note } }),
    onSuccess: () => {
      toast.success(isAr ? 'تمت إضافة الملاحظة' : 'Note added');
      qc.invalidateQueries({ queryKey: ['gym','leads'] });
      onClose();
      setNote('');
    },
    onError: (e: any) => toast.error(e?.body?.error ?? 'Error'),
  });

  if (!lead) return null;
  return (
    <Dialog open={!!lead} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-background border-white/10">
        <DialogHeader>
          <DialogTitle className="text-foreground">{isAr ? 'إضافة ملاحظة' : 'Add Note'} — {lead.name}</DialogTitle>
        </DialogHeader>
        {lead.notes && (
          <div className="bg-white/5 rounded-lg p-3 text-sm text-muted-foreground border border-white/10">
            <p className="text-xs text-muted-foreground/60 mb-1">{isAr ? 'الملاحظة الحالية:' : 'Current note:'}</p>
            {lead.notes}
          </div>
        )}
        <Textarea placeholder={isAr ? 'اكتب الملاحظة...' : 'Write a note...'}
          value={note} onChange={e => setNote(e.target.value)} rows={4} className="bg-white/5 border-white/10 text-foreground" />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
          <Button onClick={() => mut.mutate()} disabled={!note.trim() || mut.isPending}>
            {mut.isPending ? '...' : (isAr ? 'حفظ' : 'Save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Renew Dialog (MEMBER with canRenew) ───────────────────────────────────────
function RenewDialog({ lead, onClose, lang }: { lead: CrmRecord | null; onClose: () => void; lang: string }) {
  const qc = useQueryClient();
  const isAr = lang === 'ar';
  const [subEnd, setSubEnd] = useState('');

  const mut = useMutation({
    mutationFn: () => apiFetch(`/gym/leads/${lead!.id}/renew`, { method: 'POST', data: { subscriptionEndDate: subEnd } }),
    onSuccess: () => {
      toast.success(isAr ? 'تم التجديد ✅' : 'Renewed ✅');
      qc.invalidateQueries({ queryKey: ['gym','leads'] });
      onClose();
      setSubEnd('');
    },
    onError: (e: any) => toast.error(e?.body?.error ?? 'Error'),
  });

  if (!lead) return null;
  return (
    <Dialog open={!!lead} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-background border-white/10">
        <DialogHeader>
          <DialogTitle className="text-foreground">{isAr ? 'تجديد الاشتراك' : 'Renew Subscription'} — {lead.name}</DialogTitle>
          {lead.subscriptionEndDate && (
            <p className="text-sm text-muted-foreground">
              {isAr ? `الاشتراك الحالي ينتهي: ${fmtDate(lead.subscriptionEndDate)}` : `Current end: ${fmtDate(lead.subscriptionEndDate)}`}
            </p>
          )}
        </DialogHeader>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{isAr ? 'تاريخ انتهاء الاشتراك الجديد' : 'New Subscription End Date'}</label>
          <Input type="date" value={subEnd} onChange={e => setSubEnd(e.target.value)} className="bg-white/5 border-white/10 text-foreground" />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
          <Button onClick={() => mut.mutate()} disabled={!subEnd || mut.isPending}>
            {mut.isPending ? '...' : (isAr ? 'تجديد' : 'Renew')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminSalesPage() {
  const { lang } = useLanguage();
  const qc = useQueryClient();
  const isAr = lang === 'ar';

  const [search, setSearch]       = useState('');
  const [filter, setFilter]       = useState('all');
  const [addOpen, setAddOpen]     = useState(false);
  const [editLead, setEditLead]   = useState<CrmRecord | null>(null);
  const [convertLead, setConvert] = useState<CrmRecord | null>(null);
  const [noteLead, setNoteLead]   = useState<CrmRecord | null>(null);
  const [renewLead, setRenewLead] = useState<CrmRecord | null>(null);

  const { data: leads = [], isLoading } = useQuery<CrmRecord[]>({
    queryKey: ['gym', 'leads'],
    queryFn: () => apiFetch('/gym/leads'),
  });
  const { data: coaches = [] } = useQuery<Coach[]>({
    queryKey: ['admin', 'coaches'],
    queryFn: () => apiFetch('/admin/coaches'),
  });
  const { data: gymConfig } = useQuery({
    queryKey: ['me', 'gym-config'],
    queryFn: () => apiFetch('/me/gym-config'),
    staleTime: Infinity,
  });
  const gymName: string = (gymConfig as any)?.gymName ?? 'Qawi';

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/gym/leads/${id}`, { method: 'DELETE' }),
    onSuccess: () => { toast.success(isAr ? 'تم الحذف' : 'Deleted'); qc.invalidateQueries({ queryKey: ['gym','leads'] }); },
    onError: (e: any) => toast.error(e?.body?.error ?? 'Error'),
  });

  const stats = useMemo(() => ({
    total:      leads.length,
    active:     leads.filter(l => l.status === 'ACTIVE').length,
    expiring:   leads.filter(l => l.status === 'EXPIRING_SOON').length,
    expired:    leads.filter(l => l.status === 'EXPIRED').length,
    prospects:  leads.filter(l => l.type === 'PROSPECT').length,
  }), [leads]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return leads.filter(l => {
      const matchSearch = !q || l.name.toLowerCase().includes(q) ||
        (l.phoneNumber ?? '').includes(q) || (l.email ?? '').toLowerCase().includes(q);
      if (!matchSearch) return false;
      if (filter === 'all') return true;
      if (filter.startsWith('type:')) return l.type === filter.slice(5);
      if (filter.startsWith('status:')) return l.status === filter.slice(7);
      return true;
    });
  }, [leads, search, filter]);

  return (
    <PageWrapper>
      <PageHeader
        title={isAr ? 'المبيعات — CRM' : 'Sales CRM'}
        subtitle={isAr ? 'تتبع العملاء المحتملين والأعضاء النشطين' : 'Track leads and active members'}
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus size={16} className="mr-2" />{isAr ? 'إضافة عميل' : 'Add Lead'}
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <StatCard label={isAr ? 'الإجمالي' : 'Total'} value={stats.total} icon={Users} color="#3B82F6" />
        <StatCard label={isAr ? 'نشطون' : 'Active'} value={stats.active} icon={UserPlus} color="#22C55E" />
        <StatCard label={isAr ? 'ينتهي قريباً' : 'Expiring Soon'} value={stats.expiring} icon={Clock} color="#F59E0B" />
        <StatCard label={isAr ? 'منتهيون' : 'Expired'} value={stats.expired} icon={AlertTriangle} color="#EF4444" />
        <StatCard label={isAr ? 'عملاء محتملون' : 'Leads'} value={stats.prospects} icon={TrendingDown} color="#8B5CF6" />
      </div>

      {/* Filters + search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={isAr ? 'بحث بالاسم أو الهاتف...' : 'Search by name or phone...'}
            value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-white/5 border-white/10 text-foreground" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTER_TABS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                filter === f.id ? 'bg-primary text-black' : 'bg-white/5 text-muted-foreground hover:bg-white/10')}>
              {isAr ? f.ar : f.en}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(6)].map((_,i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card flex flex-col items-center py-16 gap-4">
          <UserPlus size={40} className="text-muted-foreground/30" />
          <p className="text-muted-foreground">{isAr ? 'لا توجد نتائج' : 'No records found'}</p>
          <Button size="sm" onClick={() => { setFilter('all'); setSearch(''); setAddOpen(true); }}>
            <Plus size={14} className="mr-1" />{isAr ? 'إضافة عميل محتمل' : 'Add Lead'}
          </Button>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  {[
                    isAr ? 'الاسم' : 'Name',
                    isAr ? 'الهاتف' : 'Phone',
                    isAr ? 'النوع' : 'Type',
                    isAr ? 'الحالة' : 'Status',
                    isAr ? 'انتهاء الاشتراك' : 'Sub. End',
                    isAr ? 'الأيام المتبقية' : 'Days Left',
                    isAr ? 'ملاحظات' : 'Notes',
                    isAr ? 'الإجراءات' : 'Actions',
                  ].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(l => (
                  <tr key={l.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">{l.name}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{l.phoneNumber || '—'}</td>
                    <td className="px-4 py-3"><TypeBadge type={l.type} lang={lang} /></td>
                    <td className="px-4 py-3"><StatusBadge status={l.status} lang={lang} /></td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{fmtDate(l.subscriptionEndDate)}</td>
                    <td className="px-4 py-3"><DaysLeft days={l.daysRemaining} /></td>
                    <td className="px-4 py-3 text-muted-foreground text-xs max-w-[160px] truncate">{l.notes || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {/* WhatsApp */}
                        {l.phoneNumber && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-400 hover:text-green-300 hover:bg-green-400/10"
                            title="WhatsApp" onClick={() => window.open(makeWaUrl(l, gymName), '_blank')}>
                            <MessageCircle size={13} />
                          </Button>
                        )}
                        {/* PROSPECT actions */}
                        {l.type === 'PROSPECT' && (
                          <>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                              title={isAr ? 'تعديل' : 'Edit'} onClick={() => setEditLead(l)}>
                              <Edit2 size={13} />
                            </Button>
                            {l.canConvert && (
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-primary hover:text-primary/80 hover:bg-primary/10 text-xs"
                                onClick={() => setConvert(l)}>
                                <UserPlus size={12} className="mr-1" />{isAr ? 'تحويل' : 'Convert'}
                              </Button>
                            )}
                          </>
                        )}
                        {/* MEMBER actions */}
                        {l.type === 'MEMBER' && (
                          <>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10"
                              title={isAr ? 'ملاحظة' : 'Note'} onClick={() => setNoteLead(l)}>
                              <StickyNote size={13} />
                            </Button>
                            {l.canRenew && (
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-green-400 hover:text-green-300 hover:bg-green-400/10 text-xs"
                                onClick={() => setRenewLead(l)}>
                                <RefreshCw size={12} className="mr-1" />{isAr ? 'تجديد' : 'Renew'}
                              </Button>
                            )}
                          </>
                        )}
                        {/* Delete */}
                        {l.canDelete && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                            title={isAr ? 'حذف' : 'Delete'}
                            onClick={() => { if (confirm(isAr ? `حذف "${l.name}"؟` : `Delete "${l.name}"?`)) deleteMut.mutate(l.id); }}>
                            <Trash2 size={13} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AddLeadDialog   open={addOpen}     onClose={() => setAddOpen(false)} lang={lang} />
      <EditLeadDialog  lead={editLead}    onClose={() => setEditLead(null)} lang={lang} />
      <ConvertDialog   lead={convertLead} coaches={coaches as Coach[]} onClose={() => setConvert(null)} lang={lang} />
      <AddNoteDialog   lead={noteLead}    onClose={() => setNoteLead(null)} lang={lang} />
      <RenewDialog     lead={renewLead}   onClose={() => setRenewLead(null)} lang={lang} />
    </PageWrapper>
  );
}
