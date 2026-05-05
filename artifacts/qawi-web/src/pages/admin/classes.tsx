import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { useLanguage } from '@/hooks/use-language';
import { useGymConfig } from '@/hooks/use-gym-config';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { GradientAvatar } from '@/components/GradientAvatar';
import { Plus, Calendar, Clock, Users, Pencil, XCircle, Lock, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

function ClassesSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="glass-card p-5 flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2"><Skeleton className="h-5 w-48" /><Skeleton className="h-3 w-32" /></div>
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>
  );
}

function ClassForm({ initial, onSubmit, isPending, onClose }: { initial?: any; onSubmit: (d: any) => void; isPending: boolean; onClose: () => void }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    instructorName: initial?.instructorName || '',
    dateTime: initial?.dateTime ? initial.dateTime.slice(0, 16) : '',
    durationMinutes: initial?.durationMinutes || 60,
    maxCapacity: initial?.maxCapacity || 20,
    description: initial?.description || '',
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...form, durationMinutes: Number(form.durationMinutes), maxCapacity: Number(form.maxCapacity) }); }} className="space-y-4">
      <Input placeholder="Class name (e.g. Boxing, Yoga, HIIT)" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="bg-black/20" required />
      <Input placeholder="Coach / instructor name" value={form.instructorName} onChange={(e) => setForm((f) => ({ ...f, instructorName: e.target.value }))} className="bg-black/20" required />
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Date & Time</label>
        <Input type="datetime-local" value={form.dateTime} onChange={(e) => setForm((f) => ({ ...f, dateTime: e.target.value }))} className="bg-black/20" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Duration (minutes)</label>
          <Input type="number" value={form.durationMinutes} onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))} className="bg-black/20" min={5} required />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Max capacity</label>
          <Input type="number" value={form.maxCapacity} onChange={(e) => setForm((f) => ({ ...f, maxCapacity: e.target.value }))} className="bg-black/20" min={1} required />
        </div>
      </div>
      <Input placeholder="Description (optional)" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="bg-black/20" />
      <div className="flex gap-3 pt-2">
        <Button type="submit" className="flex-1 glow-hover" disabled={isPending}>{isPending ? 'Saving…' : (initial ? 'Update Class' : 'Create Class')}</Button>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  );
}

export default function AdminClasses() {
  const { t, lang } = useLanguage();
  const { features } = useGymConfig();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);

  const { data: classes, isLoading } = useQuery<any[]>({
    queryKey: ['admin', 'classes'],
    queryFn: () => apiFetch('/admin/classes'),
    enabled: features.classBookingEnabled,
  });

  const createClass = useMutation({
    mutationFn: (data: any) => apiFetch('/admin/classes', { method: 'POST', data }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'classes'] }); toast.success('Class created'); setCreateOpen(false); },
    onError: (err: any) => toast.error(err.error || 'Failed'),
  });

  const updateClass = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiFetch(`/admin/classes/${id}`, { method: 'PUT', data }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'classes'] }); toast.success('Class updated'); setEditTarget(null); },
    onError: (err: any) => toast.error(err.error || 'Failed'),
  });

  const cancelClass = useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/classes/${id}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'classes'] }); toast.success('Class cancelled'); },
    onError: (err: any) => toast.error(err.error || 'Failed'),
  });

  if (!features.classBookingEnabled) {
    return (
      <PageWrapper>
        <PageHeader title={lang === 'ar' ? 'الحصص' : 'Classes'} />
        <div className="glass-card p-16 text-center border-dashed border-primary/20">
          <Lock className="h-12 w-12 mx-auto mb-4 text-primary/40" />
          <h3 className="text-xl font-semibold mb-2">{lang === 'ar' ? 'ميزة حجز الحصص غير مفعّلة' : 'Class Booking not enabled'}</h3>
          <p className="text-muted-foreground max-w-md mx-auto text-sm">
            {lang === 'ar' ? 'هذه الميزة غير متاحة في خطتك الحالية. تواصل مع مسؤول قوي للترقية.' : 'This feature is not available on your current plan. Contact your Qawi administrator to upgrade.'}
          </p>
        </div>
      </PageWrapper>
    );
  }

  const upcomingClasses = (classes || []).filter((c: any) => c.status === 'ACTIVE');
  const cancelledClasses = (classes || []).filter((c: any) => c.status === 'CANCELLED');

  return (
    <PageWrapper>
      <PageHeader
        title={lang === 'ar' ? 'الحصص' : 'Classes'}
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="glow-hover"><Plus className="mr-2 h-4 w-4" />{lang === 'ar' ? 'إضافة حصة' : 'New Class'}</Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-white/10 sm:max-w-lg">
              <DialogHeader><DialogTitle>{lang === 'ar' ? 'إنشاء حصة جديدة' : 'Create New Class'}</DialogTitle></DialogHeader>
              <ClassForm onSubmit={(d) => createClass.mutate(d)} isPending={createClass.isPending} onClose={() => setCreateOpen(false)} />
            </DialogContent>
          </Dialog>
        }
      />

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(v) => { if (!v) setEditTarget(null); }}>
        <DialogContent className="glass-card border-white/10 sm:max-w-lg">
          <DialogHeader><DialogTitle>{lang === 'ar' ? 'تعديل الحصة' : 'Edit Class'}</DialogTitle></DialogHeader>
          {editTarget && <ClassForm initial={editTarget} onSubmit={(d) => updateClass.mutate({ id: editTarget.id, data: d })} isPending={updateClass.isPending} onClose={() => setEditTarget(null)} />}
        </DialogContent>
      </Dialog>

      {isLoading ? <ClassesSkeleton /> : (classes || []).length === 0 ? (
        <div className="glass-card p-16 text-center border-dashed border-white/10">
          <Calendar className="h-16 w-16 mx-auto text-muted-foreground/20 mb-4" />
          <h3 className="text-lg font-semibold mb-1">📅 {lang === 'ar' ? 'لا توجد حصص بعد' : 'No classes yet'}</h3>
          <p className="text-muted-foreground text-sm mb-4">{lang === 'ar' ? 'أضف أول حصة لتبدأ' : 'Create your first class to get started'}</p>
          <Button onClick={() => setCreateOpen(true)} className="glow-hover"><Plus className="mr-2 h-4 w-4" />{lang === 'ar' ? 'إضافة حصة' : 'New Class'}</Button>
        </div>
      ) : (
        <div className="space-y-6">
          {upcomingClasses.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">{lang === 'ar' ? 'الحصص القادمة' : 'Upcoming Classes'} <span className="text-muted-foreground text-sm font-normal ml-2">({upcomingClasses.length})</span></h2>
              <div className="space-y-3">
                {upcomingClasses.map((cls: any) => (
                  <ClassCard key={cls.id} cls={cls} lang={lang} onEdit={() => setEditTarget(cls)} onCancel={() => { if (confirm(`Cancel "${cls.name}"?`)) cancelClass.mutate(cls.id); }} />
                ))}
              </div>
            </div>
          )}
          {cancelledClasses.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 text-muted-foreground">{lang === 'ar' ? 'الحصص الملغاة' : 'Cancelled'}</h2>
              <div className="space-y-3 opacity-60">
                {cancelledClasses.map((cls: any) => (
                  <ClassCard key={cls.id} cls={cls} lang={lang} cancelled />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </PageWrapper>
  );
}

function ClassCard({ cls, lang, onEdit, onCancel, cancelled }: { cls: any; lang: string; onEdit?: () => void; onCancel?: () => void; cancelled?: boolean }) {
  const dt = parseISO(cls.dateTime);
  const isFull = cls.availableSpots === 0;

  return (
    <div className="glass-card p-5 flex items-center gap-4 border border-white/5 hover:border-white/10 transition-colors">
      <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex flex-col items-center justify-center shrink-0">
        <span className="text-xs text-primary font-semibold">{format(dt, 'MMM')}</span>
        <span className="text-xl font-bold text-white leading-none">{format(dt, 'd')}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold">{cls.name}</h3>
          {cancelled && <Badge variant="outline" className="text-red-400 border-red-400/30 text-xs">Cancelled</Badge>}
          {isFull && !cancelled && <Badge className="bg-orange-500/20 text-orange-400 border-orange-400/30 text-xs">Full</Badge>}
        </div>
        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1"><Clock size={11} />{format(dt, 'h:mm a')} · {cls.durationMinutes}min</span>
          <span className="flex items-center gap-1"><Users size={11} />{cls.bookedCount ?? 0}/{cls.maxCapacity} {lang === 'ar' ? 'محجوز' : 'booked'}</span>
          <span>👤 {cls.instructorName}</span>
        </div>
        {cls.description && <p className="text-xs text-muted-foreground mt-1 truncate">{cls.description}</p>}
      </div>
      {!cancelled && (
        <div className="flex items-center gap-2 shrink-0">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="sm" variant="ghost" className="text-xs"><Users className="h-3.5 w-3.5 mr-1" />{lang === 'ar' ? 'الحجوزات' : 'Bookings'}</Button>
            </SheetTrigger>
            <SheetContent className="glass-card border-l-white/10 sm:max-w-md w-full">
              <BookingsSheet classId={cls.id} className={cls.name} />
            </SheetContent>
          </Sheet>
          <Button size="sm" variant="ghost" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-500/10" onClick={onCancel}><XCircle className="h-3.5 w-3.5" /></Button>
        </div>
      )}
    </div>
  );
}

function BookingsSheet({ classId, className }: { classId: string; className: string }) {
  const { data: bookings, isLoading } = useQuery<any[]>({
    queryKey: ['admin', 'classes', classId, 'bookings'],
    queryFn: () => apiFetch(`/admin/classes/${classId}/bookings`),
  });

  return (
    <div className="pt-6">
      <h2 className="text-xl font-bold mb-6">📋 {className} — Bookings</h2>
      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
      ) : !bookings?.length ? (
        <div className="text-center py-16"><Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">No bookings yet</p></div>
      ) : (
        <div className="space-y-2">
          {bookings.map((b: any) => (
            <div key={b.id} className="glass-card p-3 flex items-center gap-3">
              <GradientAvatar name={b.memberName || '?'} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{b.memberName}</p>
                <p className="text-xs text-muted-foreground truncate">{b.memberEmail}</p>
              </div>
              <Badge variant="outline" className={b.status === 'BOOKED' ? 'text-green-400 border-green-400/30' : 'text-red-400 border-red-400/30'}>
                {b.status}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
