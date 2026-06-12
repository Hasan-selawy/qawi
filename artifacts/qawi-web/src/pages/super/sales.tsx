import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { apiFetch } from '@/services/api';
import { useLanguage } from '@/hooks/use-language';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Target, Plus, Search, Phone, MapPin, User, Calendar,
  MessageCircle, Clock, AlertTriangle, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

type NoteDto = { content: string; createdAt: string };
type GymLead = {
  id: string; gymName: string; contactName: string; phoneNumber: string; city: string;
  source: string; status: string; potentialPlanId?: string; notes?: string;
  nextFollowUpDate?: string; lastContactedAt?: string; createdAt: string;
  assignedTo?: string; daysInStage: number; noteHistory: NoteDto[];
};

const STATUS_CFG: Record<string, { en: string; ar: string; color: string; bg: string }> = {
  NEW:            { en: 'New',           ar: 'جديد',        color: '#3B82F6', bg: '#3B82F618' },
  CONTACTED:      { en: 'Contacted',     ar: 'تم التواصل',  color: '#F59E0B', bg: '#F59E0B18' },
  DEMO_SCHEDULED: { en: 'Demo Scheduled',ar: 'موعد عرض',   color: '#8B5CF6', bg: '#8B5CF618' },
  TRIAL_STARTED:  { en: 'Trial Started', ar: 'تجربة',       color: '#06B6D4', bg: '#06B6D418' },
  CONVERTED:      { en: 'Converted',     ar: 'تحول',        color: '#22C55E', bg: '#22C55E18' },
  LOST:           { en: 'Lost',          ar: 'فقدناه',      color: '#EF4444', bg: '#EF444418' },
};
const STATUSES = Object.keys(STATUS_CFG);

const SOURCE_CFG: Record<string, { en: string; ar: string }> = {
  WEBSITE_FORM:  { en: 'Website Form', ar: 'نموذج الويب' },
  WHATSAPP:      { en: 'WhatsApp',     ar: 'واتساب' },
  MANUAL_VISIT:  { en: 'Manual Visit', ar: 'زيارة يدوية' },
  REFERRAL:      { en: 'Referral',     ar: 'إحالة' },
};

function fmtDate(d?: string | null) {
  if (!d) return null;
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
}
function isOverdue(d?: string | null) {
  if (!d) return false;
  return new Date(d) < new Date(new Date().toDateString());
}
function isDueToday(d?: string | null) {
  if (!d) return false;
  return new Date(d).toDateString() === new Date().toDateString();
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status, lang }: { status: string; lang: string }) {
  const cfg = STATUS_CFG[status] ?? { en: status, ar: status, color: '#6B7280', bg: '#6B728018' };
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}>
      {lang === 'ar' ? cfg.ar : cfg.en}
    </span>
  );
}

// ── Lead Card (Kanban) ────────────────────────────────────────────────────────
function LeadCard({ lead, lang, onClick }: { lead: GymLead; lang: string; onClick: () => void }) {
  const overdue = isOverdue(lead.nextFollowUpDate);
  const today = isDueToday(lead.nextFollowUpDate);
  return (
    <div onClick={onClick} className="glass-card p-3 cursor-pointer hover:border-primary/40 transition-colors space-y-2">
      <div className="font-bold text-sm text-foreground truncate">{lead.gymName}</div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <MapPin size={10} /> {lead.city}
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <User size={10} /> {lead.contactName}
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Phone size={10} /> {lead.phoneNumber}
      </div>
      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] text-muted-foreground">{lead.daysInStage}d in stage</span>
        {lead.nextFollowUpDate && (
          <span className={cn('text-[10px] font-semibold', overdue ? 'text-red-400' : today ? 'text-amber-400' : 'text-muted-foreground')}>
            {overdue ? '⚠ ' : today ? '📅 ' : ''}{fmtDate(lead.nextFollowUpDate)}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Add Lead Dialog ───────────────────────────────────────────────────────────
function AddLeadDialog({ open, onClose, lang }: { open: boolean; onClose: () => void; lang: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ gymName:'', contactName:'', phoneNumber:'', city:'', source:'MANUAL_VISIT', notes:'', nextFollowUpDate:'', assignedTo:'' });
  const isAr = lang === 'ar';

  const mut = useMutation({
    mutationFn: () => apiFetch('/super/leads', { method: 'POST', data: {
      ...form, nextFollowUpDate: form.nextFollowUpDate || null
    }}),
    onSuccess: () => { toast.success(isAr ? 'تم الإضافة' : 'Lead added'); qc.invalidateQueries({ queryKey: ['super','leads'] }); onClose(); },
    onError: (e: any) => toast.error(e?.body?.error ?? 'Error'),
  });

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-background border-white/10">
        <DialogHeader><DialogTitle className="text-foreground">{isAr ? 'إضافة عميل محتمل' : 'Add New Lead'}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Input placeholder={isAr ? 'اسم الصالة' : 'Gym Name'} value={form.gymName} onChange={f('gymName')} className="bg-white/5 border-white/10 text-foreground" /></div>
          <Input placeholder={isAr ? 'اسم المسؤول' : 'Contact Name'} value={form.contactName} onChange={f('contactName')} className="bg-white/5 border-white/10 text-foreground" />
          <Input placeholder={isAr ? 'رقم الهاتف' : 'Phone'} value={form.phoneNumber} onChange={f('phoneNumber')} className="bg-white/5 border-white/10 text-foreground" />
          <Input placeholder={isAr ? 'المدينة' : 'City'} value={form.city} onChange={f('city')} className="bg-white/5 border-white/10 text-foreground" />
          <select value={form.source} onChange={(e) => setForm(p => ({ ...p, source: e.target.value }))}
            className="px-3 py-2 rounded-md bg-white/5 border border-white/10 text-foreground text-sm">
            {Object.entries(SOURCE_CFG).map(([v,l]) => <option key={v} value={v}>{isAr ? l.ar : l.en}</option>)}
          </select>
          <Input placeholder={isAr ? 'تاريخ المتابعة' : 'Next Follow-up Date'} type="date" value={form.nextFollowUpDate} onChange={f('nextFollowUpDate')} className="bg-white/5 border-white/10 text-foreground" />
          <Input placeholder={isAr ? 'الموظف المسؤول' : 'Assigned To'} value={form.assignedTo} onChange={f('assignedTo')} className="bg-white/5 border-white/10 text-foreground" />
          <div className="col-span-2"><Textarea placeholder={isAr ? 'ملاحظات' : 'Notes'} value={form.notes} onChange={f('notes')} rows={3} className="bg-white/5 border-white/10 text-foreground" /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
          <Button onClick={() => mut.mutate()} disabled={!form.gymName || !form.contactName || !form.phoneNumber || !form.city || mut.isPending}>
            {mut.isPending ? (isAr ? 'جاري...' : 'Adding...') : (isAr ? 'إضافة' : 'Add Lead')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Lead Side Panel ───────────────────────────────────────────────────────────
function LeadSidePanel({ lead, onClose, lang }: { lead: GymLead | null; onClose: () => void; lang: string }) {
  const qc = useQueryClient();
  const isAr = lang === 'ar';
  const [note, setNote] = useState('');
  const [status, setStatus] = useState(lead?.status ?? 'NEW');
  const [followUp, setFollowUp] = useState(lead?.nextFollowUpDate?.slice(0,10) ?? '');

  const statusMut = useMutation({
    mutationFn: (data: any) => apiFetch(`/super/leads/${lead!.id}/status`, { method: 'PUT', data }),
    onSuccess: () => { toast.success(isAr ? 'تم التحديث' : 'Updated'); qc.invalidateQueries({ queryKey: ['super','leads'] }); },
    onError: (e: any) => toast.error(e?.body?.error ?? 'Error'),
  });
  const noteMut = useMutation({
    mutationFn: () => apiFetch(`/super/leads/${lead!.id}/note`, { method: 'POST', data: { content: note } }),
    onSuccess: () => { toast.success(isAr ? 'تمت الإضافة' : 'Note added'); setNote(''); qc.invalidateQueries({ queryKey: ['super','leads'] }); },
    onError: (e: any) => toast.error(e?.body?.error ?? 'Error'),
  });

  if (!lead) return null;
  const waUrl = `https://wa.me/+962${lead.phoneNumber.replace(/^0/, '')}?text=${encodeURIComponent(isAr ? `مرحباً ${lead.contactName}، نحن من قوي...` : `Hello ${lead.contactName}, this is the Qawi team...`)}`;

  return (
    <Sheet open={!!lead} onOpenChange={onClose}>
      <SheetContent className="w-[440px] bg-background border-white/10 overflow-y-auto" side="right">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-foreground text-xl font-bold">{lead.gymName}</SheetTitle>
          <StatusBadge status={lead.status} lang={lang} />
        </SheetHeader>

        {/* Contact info */}
        <div className="glass-card p-4 space-y-2 mb-4">
          {[
            { icon: User, label: lead.contactName },
            { icon: Phone, label: lead.phoneNumber },
            { icon: MapPin, label: lead.city },
            { icon: Target, label: SOURCE_CFG[lead.source]?.[isAr ? 'ar' : 'en'] ?? lead.source },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-sm text-foreground">
              <Icon size={14} className="text-primary shrink-0" />{label}
            </div>
          ))}
          {lead.assignedTo && <div className="text-xs text-muted-foreground">{isAr ? 'مسؤول:' : 'Assigned:'} {lead.assignedTo}</div>}
          <div className="text-xs text-muted-foreground">{lead.daysInStage} {isAr ? 'يوم في المرحلة' : 'days in stage'}</div>
        </div>

        {/* Status update */}
        <div className="glass-card p-4 space-y-3 mb-4">
          <p className="text-sm font-semibold text-foreground">{isAr ? 'تحديث الحالة' : 'Update Status'}</p>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="bg-white/5 border-white/10 text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border-white/10">
              {STATUSES.map(s => <SelectItem key={s} value={s} className="text-foreground">{isAr ? STATUS_CFG[s].ar : STATUS_CFG[s].en}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" value={followUp} onChange={e => setFollowUp(e.target.value)} className="bg-white/5 border-white/10 text-foreground" />
          <Button className="w-full" size="sm" onClick={() => statusMut.mutate({ status, nextFollowUpDate: followUp || null })} disabled={statusMut.isPending}>
            {isAr ? 'حفظ الحالة' : 'Save Status'}
          </Button>
        </div>

        {/* Add note */}
        <div className="glass-card p-4 space-y-3 mb-4">
          <p className="text-sm font-semibold text-foreground">{isAr ? 'إضافة ملاحظة' : 'Add Note'}</p>
          <Textarea placeholder={isAr ? 'اكتب ملاحظة...' : 'Write a note...'} value={note} onChange={e => setNote(e.target.value)} rows={3} className="bg-white/5 border-white/10 text-foreground" />
          <Button size="sm" className="w-full" onClick={() => noteMut.mutate()} disabled={!note.trim() || noteMut.isPending}>
            {isAr ? 'إضافة' : 'Add Note'}
          </Button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mb-4">
          <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" size="sm" onClick={() => window.open(waUrl, '_blank')}>
            <MessageCircle size={14} className="mr-1" />{isAr ? 'واتساب' : 'WhatsApp'}
          </Button>
          <Button className="flex-1" size="sm" variant="outline"
            onClick={() => { setStatus('DEMO_SCHEDULED'); statusMut.mutate({ status: 'DEMO_SCHEDULED', nextFollowUpDate: followUp || null }); }}>
            <Calendar size={14} className="mr-1" />{isAr ? 'جدولة عرض' : 'Schedule Demo'}
          </Button>
        </div>

        {/* Notes timeline */}
        {lead.noteHistory.length > 0 && (
          <div className="glass-card p-4">
            <p className="text-sm font-semibold text-foreground mb-3">{isAr ? 'سجل الملاحظات' : 'Notes Timeline'}</p>
            <div className="space-y-3">
              {lead.noteHistory.map((n, i) => (
                <div key={i} className="border-l-2 border-primary/30 pl-3">
                  <p className="text-sm text-foreground">{n.content}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{fmtDate(n.createdAt)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ── Pipeline (Kanban) ─────────────────────────────────────────────────────────
function PipelineView({ leads, lang, onLeadClick, onDragEnd }: {
  leads: GymLead[]; lang: string;
  onLeadClick: (l: GymLead) => void;
  onDragEnd: (r: DropResult) => void;
}) {
  const isAr = lang === 'ar';
  const byStatus = (s: string) => leads.filter(l => l.status === s);
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[600px]">
        {STATUSES.map(status => {
          const cfg = STATUS_CFG[status];
          const col = byStatus(status);
          return (
            <div key={status} className="flex-shrink-0 w-[240px]">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-sm font-bold" style={{ color: cfg.color }}>{isAr ? cfg.ar : cfg.en}</span>
                <span className="text-xs font-bold text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full">{col.length}</span>
              </div>
              <Droppable droppableId={status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn('rounded-xl p-2 min-h-[500px] transition-colors space-y-2', snapshot.isDraggingOver ? 'bg-white/5' : 'bg-white/[0.02]')}
                    style={{ borderWidth: 1, borderColor: snapshot.isDraggingOver ? cfg.color + '44' : 'transparent' }}
                  >
                    {col.map((lead, idx) => (
                      <Draggable key={lead.id} draggableId={lead.id} index={idx}>
                        {(prov, snap) => (
                          <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}
                            className={cn('transition-transform', snap.isDragging && 'rotate-1 scale-105')}>
                            <LeadCard lead={lead} lang={lang} onClick={() => onLeadClick(lead)} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {col.length === 0 && !snapshot.isDraggingOver && (
                      <div className="text-center py-8 text-xs text-muted-foreground/40">
                        {isAr ? 'أفلت هنا' : 'Drop here'}
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}

// ── Leads List View ───────────────────────────────────────────────────────────
function LeadsListView({ leads, lang, onLeadClick }: { leads: GymLead[]; lang: string; onLeadClick: (l: GymLead) => void }) {
  const isAr = lang === 'ar';
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = leads.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !q || l.gymName.toLowerCase().includes(q) || l.phoneNumber.includes(q) || l.city.toLowerCase().includes(q);
    if (!matchSearch) return false;
    if (filter === 'all') return true;
    if (filter === 'followup_today') return isDueToday(l.nextFollowUpDate);
    if (filter === 'overdue') return isOverdue(l.nextFollowUpDate);
    return l.status === filter.toUpperCase();
  });

  const filters = [
    { id: 'all', en: 'All', ar: 'الكل' },
    { id: 'NEW', en: 'New', ar: 'جديد' },
    { id: 'followup_today', en: 'Follow-up Today', ar: 'متابعة اليوم' },
    { id: 'overdue', en: 'Overdue', ar: 'متأخر' },
    { id: 'CONVERTED', en: 'Converted', ar: 'تحول' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={isAr ? 'بحث...' : 'Search by name, phone, city...'} value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-white/5 border-white/10 text-foreground" />
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
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {[isAr ? 'الصالة' : 'Gym', isAr ? 'المسؤول' : 'Contact', isAr ? 'الهاتف' : 'Phone',
                  isAr ? 'المدينة' : 'City', isAr ? 'الحالة' : 'Status', isAr ? 'المصدر' : 'Source', isAr ? 'أيام' : 'Days', isAr ? 'المتابعة' : 'Next Follow-up'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">{isAr ? 'لا توجد نتائج' : 'No leads found'}</td></tr>
              ) : filtered.map(l => (
                <tr key={l.id} onClick={() => onLeadClick(l)} className="border-b border-white/5 hover:bg-white/3 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-semibold text-foreground">{l.gymName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.contactName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.phoneNumber}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.city}</td>
                  <td className="px-4 py-3"><StatusBadge status={l.status} lang={lang} /></td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{SOURCE_CFG[l.source]?.[isAr ? 'ar' : 'en'] ?? l.source}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.daysInStage}d</td>
                  <td className="px-4 py-3">
                    {l.nextFollowUpDate && (
                      <span className={cn('text-xs font-semibold', isOverdue(l.nextFollowUpDate) ? 'text-red-400' : isDueToday(l.nextFollowUpDate) ? 'text-amber-400' : 'text-muted-foreground')}>
                        {isOverdue(l.nextFollowUpDate) && '⚠ '}{fmtDate(l.nextFollowUpDate)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Follow-ups View ───────────────────────────────────────────────────────────
function FollowupsView({ lang }: { lang: string }) {
  const qc = useQueryClient();
  const isAr = lang === 'ar';
  const { data: leads = [], isLoading } = useQuery<GymLead[]>({
    queryKey: ['super','leads','followups'],
    queryFn: () => apiFetch('/super/leads/followups'),
  });
  const statusMut = useMutation({
    mutationFn: ({ id, status, days }: { id: string; status?: string; days?: number }) => {
      if (days) {
        const d = new Date(); d.setDate(d.getDate() + days);
        return apiFetch(`/super/leads/${id}/status`, { method: 'PUT', data: { status: 'CONTACTED', nextFollowUpDate: d.toISOString().slice(0,10) } });
      }
      return apiFetch(`/super/leads/${id}/status`, { method: 'PUT', data: { status: status ?? 'CONTACTED' } });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['super','leads'] }); },
    onError: (e: any) => toast.error(e?.body?.error ?? 'Error'),
  });

  if (isLoading) return <div className="space-y-3">{[...Array(4)].map((_,i) => <Skeleton key={i} className="h-16" />)}</div>;

  const overdue = leads.filter(l => isOverdue(l.nextFollowUpDate));
  const today = leads.filter(l => isDueToday(l.nextFollowUpDate));
  const upcoming = leads.filter(l => !isOverdue(l.nextFollowUpDate) && !isDueToday(l.nextFollowUpDate));

  const Section = ({ items, label, color }: { items: GymLead[]; label: string; color: string }) =>
    items.length === 0 ? null : (
      <div className="mb-6">
        <h3 className="text-sm font-bold mb-3" style={{ color }}>{label} ({items.length})</h3>
        <div className="space-y-2">
          {items.map(l => {
            const waUrl = `https://wa.me/+962${l.phoneNumber.replace(/^0/, '')}`;
            const lastNote = l.noteHistory[0]?.content;
            return (
              <div key={l.id} className="glass-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground text-sm">{l.gymName}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{l.contactName} · {l.phoneNumber} · {fmtDate(l.nextFollowUpDate)}</div>
                  {lastNote && <div className="text-xs text-muted-foreground/70 mt-1 truncate">{lastNote}</div>}
                </div>
                <div className="flex gap-2 shrink-0 flex-wrap">
                  <Button size="sm" className="text-xs h-7 bg-green-600 hover:bg-green-700 text-white" onClick={() => window.open(waUrl,'_blank')}>
                    <MessageCircle size={12} className="mr-1" />{isAr ? 'واتساب' : 'WA'}
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => statusMut.mutate({ id: l.id, status: 'CONTACTED' })}>
                    {isAr ? 'تم' : 'Done'}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-xs h-7 text-muted-foreground" onClick={() => statusMut.mutate({ id: l.id, days: 1 })}>
                    <Clock size={10} className="mr-1" />{isAr ? '+١ يوم' : '+1 day'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );

  return (
    <div>
      <Section items={overdue} label={isAr ? 'متأخر' : 'Overdue'} color="#EF4444" />
      <Section items={today} label={isAr ? 'اليوم' : 'Due Today'} color="#F59E0B" />
      <Section items={upcoming} label={isAr ? 'قادم' : 'Upcoming'} color="#22C55E" />
      {leads.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <AlertTriangle size={40} className="mx-auto mb-3 text-muted-foreground/30" />
          <p>{isAr ? 'لا توجد متابعات' : 'No follow-ups due'}</p>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SuperSalesPage() {
  const { lang } = useLanguage();
  const qc = useQueryClient();
  const isAr = lang === 'ar';
  const [activeTab, setActiveTab] = useState<'pipeline' | 'leads' | 'followups'>('pipeline');
  const [addOpen, setAddOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<GymLead | null>(null);

  const { data: leads = [], isLoading } = useQuery<GymLead[]>({
    queryKey: ['super','leads'],
    queryFn: () => apiFetch('/super/leads'),
  });
  const { data: pipeline = [] } = useQuery<{ status: string; count: number }[]>({
    queryKey: ['super','leads','pipeline'],
    queryFn: () => apiFetch('/super/leads/pipeline'),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch(`/super/leads/${id}/status`, { method: 'PUT', data: { status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['super','leads'] }),
    onError: (e: any) => toast.error(e?.body?.error ?? 'Error'),
  });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    if (result.destination.droppableId === result.source.droppableId) return;
    statusMut.mutate({ id: result.draggableId, status: result.destination.droppableId });
  };

  const totalLeads = pipeline.reduce((s, p) => s + p.count, 0);
  const converted = pipeline.find(p => p.status === 'CONVERTED')?.count ?? 0;
  const convRate = totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0;

  const tabs: { id: 'pipeline' | 'leads' | 'followups'; en: string; ar: string }[] = [
    { id: 'pipeline', en: 'Pipeline', ar: 'قناة المبيعات' },
    { id: 'leads', en: 'All Leads', ar: 'كل العملاء' },
    { id: 'followups', en: 'Follow-ups', ar: 'المتابعات' },
  ];

  return (
    <PageWrapper>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
            <Target size={22} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">{isAr ? 'خط المبيعات' : 'Sales Pipeline'}</h1>
            <p className="text-sm text-muted-foreground">{isAr ? 'إدارة العملاء المحتملين' : 'Manage gym leads'}</p>
          </div>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus size={16} className="mr-2" />{isAr ? 'إضافة عميل' : 'Add Lead'}
        </Button>
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: isAr ? 'إجمالي العملاء' : 'Total Leads', value: totalLeads, color: 'text-primary' },
          { label: isAr ? 'تحول هذا الشهر' : 'Converted', value: converted, color: 'text-green-400' },
          { label: isAr ? 'معدل التحويل' : 'Conversion Rate', value: `${convRate}%`, color: 'text-amber-400' },
        ].map(k => (
          <div key={k.label} className="glass-card p-4 text-center">
            <div className={cn('text-2xl font-extrabold', k.color)}>{k.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-white/5">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={cn('px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px',
              activeTab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
            {isAr ? t.ar : t.en}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">{[...Array(6)].map((_,i) => <Skeleton key={i} className="h-48" />)}</div>
      ) : activeTab === 'pipeline' ? (
        <PipelineView leads={leads} lang={lang} onLeadClick={setSelectedLead} onDragEnd={handleDragEnd} />
      ) : activeTab === 'leads' ? (
        <LeadsListView leads={leads} lang={lang} onLeadClick={setSelectedLead} />
      ) : (
        <FollowupsView lang={lang} />
      )}

      <AddLeadDialog open={addOpen} onClose={() => setAddOpen(false)} lang={lang} />
      <LeadSidePanel lead={selectedLead} onClose={() => setSelectedLead(null)} lang={lang} />
    </PageWrapper>
  );
}
