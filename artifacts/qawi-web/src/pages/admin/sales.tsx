import { useState } from 'react';
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
import { Plus, Search, Phone, Trash2, Edit2, UserPlus, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type MemberLead = {
  id: string; gymId: string; name: string; phoneNumber: string;
  notes?: string; status: string; createdBy: string;
  createdAt: string; lastUpdatedAt: string;
};
type Coach = { id: string; name: string; email: string };

const STATUS_CFG: Record<string, { en: string; ar: string; color: string; bg: string }> = {
  NEW:             { en: 'New',             ar: 'جديد',         color: '#3B82F6', bg: '#3B82F618' },
  CONTACTED:       { en: 'Contacted',       ar: 'تم التواصل',   color: '#F59E0B', bg: '#F59E0B18' },
  VISIT_SCHEDULED: { en: 'Visit Scheduled', ar: 'موعد زيارة',  color: '#8B5CF6', bg: '#8B5CF618' },
  SIGNED_UP:       { en: 'Signed Up',       ar: 'انتسب',        color: '#22C55E', bg: '#22C55E18' },
  LOST:            { en: 'Lost',            ar: 'خسرناه',       color: '#EF4444', bg: '#EF444418' },
};
const STATUSES = Object.keys(STATUS_CFG);

function StatusBadge({ status, lang }: { status: string; lang: string }) {
  const cfg = STATUS_CFG[status] ?? { en: status, ar: status, color: '#6B7280', bg: '#6B728018' };
  return (
    <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}>
      {lang === 'ar' ? cfg.ar : cfg.en}
    </span>
  );
}

function fmtDate(d?: string) {
  if (!d) return '—';
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
}

// ── Add Lead Dialog ───────────────────────────────────────────────────────────
function AddLeadDialog({ open, onClose, lang }: { open: boolean; onClose: () => void; lang: string }) {
  const qc = useQueryClient();
  const isAr = lang === 'ar';
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  const mut = useMutation({
    mutationFn: () => apiFetch('/gym/leads', { method: 'POST', data: { name, phoneNumber: phone, notes: notes || null } }),
    onSuccess: () => { toast.success(isAr ? 'تمت الإضافة ✅' : 'Lead added ✅'); qc.invalidateQueries({ queryKey: ['gym','leads'] }); onClose(); setName(''); setPhone(''); setNotes(''); },
    onError: (e: any) => toast.error(e?.body?.error ?? 'Error'),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-background border-white/10">
        <DialogHeader><DialogTitle className="text-foreground">{isAr ? 'إضافة عميل محتمل' : 'Add Lead'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder={isAr ? 'الاسم (مطلوب)' : 'Name (required)'} value={name} onChange={e => setName(e.target.value)} className="bg-white/5 border-white/10 text-foreground" />
          <Input placeholder={isAr ? 'رقم الهاتف (مطلوب)' : 'Phone (required)'} value={phone} onChange={e => setPhone(e.target.value)} className="bg-white/5 border-white/10 text-foreground" />
          <Textarea placeholder={isAr ? 'ملاحظات (اختياري)' : 'Notes (optional)'} value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="bg-white/5 border-white/10 text-foreground" />
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

// ── Edit Lead Dialog ──────────────────────────────────────────────────────────
function EditLeadDialog({ lead, onClose, lang }: { lead: MemberLead | null; onClose: () => void; lang: string }) {
  const qc = useQueryClient();
  const isAr = lang === 'ar';
  const [status, setStatus] = useState(lead?.status ?? 'NEW');
  const [notes, setNotes] = useState(lead?.notes ?? '');

  const mut = useMutation({
    mutationFn: () => apiFetch(`/gym/leads/${lead!.id}`, { method: 'PUT', data: { status, notes: notes || null } }),
    onSuccess: () => { toast.success(isAr ? 'تم التحديث' : 'Updated'); qc.invalidateQueries({ queryKey: ['gym','leads'] }); onClose(); },
    onError: (e: any) => toast.error(e?.body?.error ?? 'Error'),
  });

  if (!lead) return null;
  return (
    <Dialog open={!!lead} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-background border-white/10">
        <DialogHeader><DialogTitle className="text-foreground">{isAr ? 'تعديل العميل' : 'Edit Lead'} — {lead.name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="bg-white/5 border-white/10 text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border-white/10">
              {STATUSES.map(s => <SelectItem key={s} value={s} className="text-foreground">{isAr ? STATUS_CFG[s].ar : STATUS_CFG[s].en}</SelectItem>)}
            </SelectContent>
          </Select>
          <Textarea placeholder={isAr ? 'ملاحظات' : 'Notes'} value={notes} onChange={e => setNotes(e.target.value)} rows={4} className="bg-white/5 border-white/10 text-foreground" />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>{isAr ? 'حفظ' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Convert to Member Dialog ──────────────────────────────────────────────────
function ConvertDialog({ lead, coaches, onClose, lang }: { lead: MemberLead | null; coaches: Coach[]; onClose: () => void; lang: string }) {
  const qc = useQueryClient();
  const isAr = lang === 'ar';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [coachId, setCoachId] = useState('none');
  const [subEnd, setSubEnd] = useState('');

  const mut = useMutation({
    mutationFn: () => apiFetch(`/gym/leads/${lead!.id}/convert`, {
      method: 'POST',
      data: { email, password, coachId: coachId !== 'none' ? coachId : null, subscriptionEndDate: subEnd || null },
    }),
    onSuccess: () => {
      toast.success(isAr ? `${lead!.name} أصبح عضواً! ✅` : `${lead!.name} has been added as a member! ✅`);
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
          <Input placeholder={isAr ? 'البريد الإلكتروني' : 'Email'} type="email" value={email} onChange={e => setEmail(e.target.value)} className="bg-white/5 border-white/10 text-foreground" />
          <Input placeholder={isAr ? 'كلمة المرور (6+ أحرف)' : 'Password (6+ chars)'} type="password" value={password} onChange={e => setPassword(e.target.value)} className="bg-white/5 border-white/10 text-foreground" />
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminSalesPage() {
  const { lang } = useLanguage();
  const qc = useQueryClient();
  const isAr = lang === 'ar';
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [addOpen, setAddOpen] = useState(false);
  const [editLead, setEditLead] = useState<MemberLead | null>(null);
  const [convertLead, setConvertLead] = useState<MemberLead | null>(null);

  const { data: leads = [], isLoading } = useQuery<MemberLead[]>({
    queryKey: ['gym','leads'],
    queryFn: () => apiFetch('/gym/leads'),
  });
  const { data: coaches = [] } = useQuery<Coach[]>({
    queryKey: ['admin','coaches'],
    queryFn: () => apiFetch('/admin/coaches'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/gym/leads/${id}`, { method: 'DELETE' }),
    onSuccess: () => { toast.success(isAr ? 'تم الحذف' : 'Deleted'); qc.invalidateQueries({ queryKey: ['gym','leads'] }); },
    onError: (e: any) => toast.error(e?.body?.error ?? 'Error'),
  });

  const filtered = leads.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !q || l.name.toLowerCase().includes(q) || l.phoneNumber.includes(q);
    if (!matchSearch) return false;
    if (filter === 'all') return true;
    return l.status === filter;
  });

  const filters = [
    { id: 'all', en: 'All', ar: 'الكل' },
    { id: 'NEW', en: 'New', ar: 'جديد' },
    { id: 'CONTACTED', en: 'Contacted', ar: 'تم التواصل' },
    { id: 'VISIT_SCHEDULED', en: 'Visit Scheduled', ar: 'موعد زيارة' },
    { id: 'SIGNED_UP', en: 'Signed Up', ar: 'انتسب' },
    { id: 'LOST', en: 'Lost', ar: 'خسرناه' },
  ];

  return (
    <PageWrapper>
      <PageHeader
        title={isAr ? 'المبيعات — العملاء المحتملين' : 'Sales — Member Leads'}
        subtitle={isAr ? 'تتبع الزوار والعملاء المحتملين وحولهم إلى أعضاء' : 'Track walk-ins and convert them to members'}
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus size={16} className="mr-2" />{isAr ? 'إضافة عميل' : 'Add Lead'}
          </Button>
        }
      />

      {/* Filters + search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={isAr ? 'بحث بالاسم أو الهاتف...' : 'Search by name or phone...'} value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-white/5 border-white/10 text-foreground" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {filters.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors', filter === f.id ? 'bg-primary text-black' : 'bg-white/5 text-muted-foreground hover:bg-white/10')}>
              {isAr ? f.ar : f.en}
            </button>
          ))}
        </div>
      </div>

      {/* Leads table */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_,i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card flex flex-col items-center py-16 gap-4">
          <UserPlus size={40} className="text-muted-foreground/30" />
          <p className="text-muted-foreground">{isAr ? 'لا يوجد عملاء محتملون' : 'No leads yet'}</p>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={14} className="mr-1" />{isAr ? 'إضافة أول عميل' : 'Add first lead'}
          </Button>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  {[isAr ? 'الاسم' : 'Name', isAr ? 'الهاتف' : 'Phone', isAr ? 'الحالة' : 'Status',
                    isAr ? 'ملاحظات' : 'Notes', isAr ? 'تاريخ الإضافة' : 'Added', isAr ? 'الإجراءات' : 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(l => {
                  const waUrl = `https://wa.me/+962${l.phoneNumber.replace(/^0/,'')}`;
                  return (
                    <tr key={l.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 font-semibold text-foreground">{l.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{l.phoneNumber}</td>
                      <td className="px-4 py-3"><StatusBadge status={l.status} lang={lang} /></td>
                      <td className="px-4 py-3 text-muted-foreground text-xs max-w-[200px] truncate">{l.notes || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{fmtDate(l.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-400 hover:text-green-300 hover:bg-green-400/10"
                            title="WhatsApp" onClick={() => window.open(waUrl,'_blank')}>
                            <MessageCircle size={14} />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                            title={isAr ? 'تعديل' : 'Edit'} onClick={() => setEditLead(l)}>
                            <Edit2 size={14} />
                          </Button>
                          {l.status !== 'SIGNED_UP' && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-primary hover:text-primary/80 hover:bg-primary/10 text-xs"
                              onClick={() => setConvertLead(l)}>
                              <UserPlus size={12} className="mr-1" />{isAr ? 'تحويل' : 'Convert'}
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                            title={isAr ? 'حذف' : 'Delete'}
                            onClick={() => {
                              if (confirm(isAr ? `حذف "${l.name}"؟` : `Delete "${l.name}"?`)) deleteMut.mutate(l.id);
                            }}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AddLeadDialog open={addOpen} onClose={() => setAddOpen(false)} lang={lang} />
      <EditLeadDialog lead={editLead} onClose={() => setEditLead(null)} lang={lang} />
      <ConvertDialog lead={convertLead} coaches={coaches as Coach[]} onClose={() => setConvertLead(null)} lang={lang} />
    </PageWrapper>
  );
}
