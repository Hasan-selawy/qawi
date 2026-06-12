import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { useLanguage } from '@/hooks/use-language';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Plus, Trash2, UserCheck, UserX, Eye, EyeOff, Copy,
  CheckCircle, Users, Briefcase,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Employee = {
  id: string; name: string; email: string; phoneNumber?: string;
  role: string; active: boolean; createdAt: string; memberCount: number;
};

type TempCreds = { name: string; email: string; password: string };

const ROLE_CFG: Record<string, { en: string; ar: string; color: string; bg: string }> = {
  COACH:        { en: 'Coach',        ar: 'مدرب',           color: '#8B5CF6', bg: '#8B5CF618' },
  SALES:        { en: 'Sales',        ar: 'مبيعات',         color: '#22C55E', bg: '#22C55E18' },
  RECEPTIONIST: { en: 'Receptionist', ar: 'استقبال',        color: '#3B82F6', bg: '#3B82F618' },
  NUTRITIONIST: { en: 'Nutritionist', ar: 'أخصائي تغذية',  color: '#F59E0B', bg: '#F59E0B18' },
};
const STAFF_ROLES = Object.keys(ROLE_CFG);

const FILTER_TABS = [
  { id: 'all',          en: 'All',          ar: 'الكل' },
  { id: 'COACH',        en: 'Coaches',      ar: 'المدربون' },
  { id: 'SALES',        en: 'Sales',        ar: 'المبيعات' },
  { id: 'RECEPTIONIST', en: 'Receptionists',ar: 'الاستقبال' },
  { id: 'NUTRITIONIST', en: 'Nutritionists',ar: 'التغذية' },
];

function RoleBadge({ role, lang }: { role: string; lang: string }) {
  const cfg = ROLE_CFG[role] ?? { en: role, ar: role, color: '#6B7280', bg: '#6B728018' };
  return (
    <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}>
      {lang === 'ar' ? cfg.ar : cfg.en}
    </span>
  );
}

function fmtDate(d: string) {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
}

// ── Add Employee Dialog ────────────────────────────────────────────────────────
function AddEmployeeDialog({
  open, onClose, lang, onCreated,
}: { open: boolean; onClose: () => void; lang: string; onCreated: (creds: TempCreds) => void }) {
  const qc = useQueryClient();
  const isAr = lang === 'ar';
  const [name, setName]     = useState('');
  const [email, setEmail]   = useState('');
  const [phone, setPhone]   = useState('');
  const [role, setRole]     = useState('');
  const [autoPass, setAutoPass] = useState(true);
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Record<string,string>>({});

  function validate() {
    const e: Record<string,string> = {};
    if (!name.trim() || name.trim().length < 2)
      e.name = isAr ? 'الاسم مطلوب (حرفان على الأقل)' : 'Name required (2+ chars)';
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = isAr ? 'بريد إلكتروني صحيح مطلوب' : 'Valid email required';
    if (!role)
      e.role = isAr ? 'الدور مطلوب' : 'Role required';
    if (!autoPass && password.length < 6)
      e.password = isAr ? 'كلمة المرور 6 أحرف على الأقل' : 'Password: 6+ chars';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const mut = useMutation({
    mutationFn: () => apiFetch('/admin/employees', {
      method: 'POST',
      data: {
        name: name.trim(), email: email.trim(), phoneNumber: phone || null, role,
        password: autoPass ? null : password,
        autoGeneratePassword: autoPass,
      },
    }),
    onSuccess: (data: any) => {
      toast.success(isAr ? 'تم إنشاء الموظف ✅' : 'Employee created ✅');
      qc.invalidateQueries({ queryKey: ['admin','employees'] });
      if (data?.temporaryPassword) {
        onCreated({ name: data.name, email: data.email, password: data.temporaryPassword });
      }
      onClose();
      setName(''); setEmail(''); setPhone(''); setRole(''); setPassword(''); setAutoPass(true); setErrors({});
    },
    onError: (e: any) => toast.error(e?.body?.error ?? 'Error'),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-background border-white/10">
        <DialogHeader>
          <DialogTitle className="text-foreground">{isAr ? 'إضافة موظف جديد' : 'Add Employee'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Input placeholder={isAr ? 'الاسم الكامل' : 'Full name'}
              value={name} onChange={e => setName(e.target.value)}
              className="bg-white/5 border-white/10 text-foreground" />
            {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
          </div>
          <div>
            <Input placeholder={isAr ? 'البريد الإلكتروني' : 'Email'} type="email"
              value={email} onChange={e => setEmail(e.target.value)}
              className="bg-white/5 border-white/10 text-foreground" />
            {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
          </div>
          <Input placeholder={isAr ? 'رقم الهاتف (اختياري)' : 'Phone (optional)'}
            value={phone} onChange={e => setPhone(e.target.value)}
            className="bg-white/5 border-white/10 text-foreground" />
          <div>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="bg-white/5 border-white/10 text-foreground">
                <SelectValue placeholder={isAr ? 'اختر الدور' : 'Select role'} />
              </SelectTrigger>
              <SelectContent className="bg-background border-white/10">
                {STAFF_ROLES.map(r => (
                  <SelectItem key={r} value={r} className="text-foreground">
                    {lang === 'ar' ? ROLE_CFG[r].ar : ROLE_CFG[r].en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role && <p className="text-xs text-red-400 mt-1">{errors.role}</p>}
          </div>

          {/* Password option */}
          <div className="flex gap-2">
            <button onClick={() => setAutoPass(true)}
              className={cn('flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors',
                autoPass ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 bg-white/5 text-muted-foreground')}>
              {isAr ? 'كلمة مرور تلقائية' : 'Auto-generate'}
            </button>
            <button onClick={() => setAutoPass(false)}
              className={cn('flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors',
                !autoPass ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 bg-white/5 text-muted-foreground')}>
              {isAr ? 'إدخال كلمة مرور' : 'Set password'}
            </button>
          </div>
          {!autoPass && (
            <div>
              <div className="relative">
                <Input placeholder={isAr ? 'كلمة المرور (6+ أحرف)' : 'Password (6+ chars)'}
                  type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="bg-white/5 border-white/10 text-foreground pr-10" />
                <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPw(v => !v)}>
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password}</p>}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
          <Button onClick={() => validate() && mut.mutate()} disabled={mut.isPending}>
            {mut.isPending ? '...' : (isAr ? 'إنشاء' : 'Create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Temp Credentials Dialog ────────────────────────────────────────────────────
function TempCredsDialog({ creds, onClose, lang }: { creds: TempCreds | null; onClose: () => void; lang: string }) {
  const isAr = lang === 'ar';
  const [copied, setCopied] = useState(false);

  function copyAll() {
    if (!creds) return;
    navigator.clipboard.writeText(`${isAr ? 'الإيميل' : 'Email'}: ${creds.email}\n${isAr ? 'كلمة المرور' : 'Password'}: ${creds.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!creds) return null;
  return (
    <Dialog open={!!creds} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-background border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle size={20} className="text-green-400" />
            <span className="text-foreground">{isAr ? `تم إنشاء حساب ${creds.name}` : `${creds.name} account created`}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {isAr ? 'احفظ بيانات الدخول وشاركها مع الموظف:' : 'Save these credentials and share with the employee:'}
          </p>
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2 font-mono text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{isAr ? 'الإيميل:' : 'Email:'}</span>
              <span className="text-foreground">{creds.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{isAr ? 'كلمة المرور:' : 'Password:'}</span>
              <span className="text-primary font-bold">{creds.password}</span>
            </div>
          </div>
          <p className="text-xs text-yellow-400 flex items-center gap-1">
            ⚠️ {isAr ? 'هذه المعلومات لن تظهر مرة أخرى.' : 'This will not be shown again.'}
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="border-white/10 text-foreground hover:bg-white/5" onClick={copyAll}>
            {copied ? <CheckCircle size={14} className="mr-1 text-green-400" /> : <Copy size={14} className="mr-1" />}
            {copied ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ' : 'Copy')}
          </Button>
          <Button onClick={onClose}>{isAr ? 'حسناً' : 'Done'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminEmployeesPage() {
  const { lang } = useLanguage();
  const qc = useQueryClient();
  const isAr = lang === 'ar';
  const [filter, setFilter]     = useState('all');
  const [addOpen, setAddOpen]   = useState(false);
  const [tempCreds, setTempCreds] = useState<TempCreds | null>(null);

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ['admin', 'employees'],
    queryFn: () => apiFetch('/admin/employees'),
  });

  const toggleMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/employees/${id}/status`, { method: 'PATCH' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin','employees'] }); },
    onError: (e: any) => toast.error(e?.body?.error ?? 'Error'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/employees/${id}`, { method: 'DELETE' }),
    onSuccess: () => { toast.success(isAr ? 'تم الحذف' : 'Deleted'); qc.invalidateQueries({ queryKey: ['admin','employees'] }); },
    onError: (e: any) => toast.error(e?.body?.error ?? 'Error'),
  });

  const filtered = employees.filter(e => filter === 'all' || e.role === filter);

  const stats = {
    total:   employees.length,
    active:  employees.filter(e => e.active).length,
    coaches: employees.filter(e => e.role === 'COACH').length,
  };

  return (
    <PageWrapper>
      <PageHeader
        title={isAr ? 'الموظفون' : 'Employees'}
        subtitle={isAr ? 'إدارة حسابات موظفي النادي' : 'Manage gym staff accounts'}
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus size={16} className="mr-2" />{isAr ? 'إضافة موظف' : 'Add Employee'}
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center">
            <Users size={18} className="text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground">{isAr ? 'إجمالي الموظفين' : 'Total Staff'}</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-500/15 flex items-center justify-center">
            <UserCheck size={18} className="text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.active}</p>
            <p className="text-xs text-muted-foreground">{isAr ? 'نشطون' : 'Active'}</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-500/15 flex items-center justify-center">
            <Briefcase size={18} className="text-violet-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.coaches}</p>
            <p className="text-xs text-muted-foreground">{isAr ? 'مدربون' : 'Coaches'}</p>
          </div>
        </div>
      </div>

      {/* Role filter tabs */}
      <div className="flex gap-1.5 flex-wrap mb-5">
        {FILTER_TABS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
              filter === f.id ? 'bg-primary text-black' : 'bg-white/5 text-muted-foreground hover:bg-white/10')}>
            {isAr ? f.ar : f.en}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_,i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card flex flex-col items-center py-16 gap-4">
          <Users size={40} className="text-muted-foreground/30" />
          <p className="text-muted-foreground">{isAr ? 'لا يوجد موظفون' : 'No staff yet'}</p>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={14} className="mr-1" />{isAr ? 'إضافة أول موظف' : 'Add first employee'}
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
                    isAr ? 'الدور' : 'Role',
                    isAr ? 'الإيميل' : 'Email',
                    isAr ? 'الهاتف' : 'Phone',
                    isAr ? 'الأعضاء' : 'Members',
                    isAr ? 'الحالة' : 'Status',
                    isAr ? 'تاريخ الإضافة' : 'Added',
                    isAr ? 'الإجراءات' : 'Actions',
                  ].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(emp => (
                  <tr key={emp.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground">{emp.name}</td>
                    <td className="px-4 py-3"><RoleBadge role={emp.role} lang={lang} /></td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{emp.email}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{emp.phoneNumber || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      {emp.role === 'COACH' ? (
                        <span className="text-violet-400 font-semibold">{emp.memberCount}</span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full',
                        emp.active ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400')}>
                        {emp.active ? (isAr ? 'نشط' : 'Active') : (isAr ? 'معطّل' : 'Inactive')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{fmtDate(emp.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost"
                          className={cn('h-7 w-7 p-0', emp.active
                            ? 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10'
                            : 'text-green-400 hover:text-green-300 hover:bg-green-400/10')}
                          title={emp.active ? (isAr ? 'تعطيل' : 'Deactivate') : (isAr ? 'تفعيل' : 'Activate')}
                          onClick={() => toggleMut.mutate(emp.id)}>
                          {emp.active ? <UserX size={14} /> : <UserCheck size={14} />}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                          title={isAr ? 'حذف' : 'Delete'}
                          onClick={() => {
                            if (confirm(isAr ? `حذف "${emp.name}"؟ لا يمكن التراجع.` : `Delete "${emp.name}"? This cannot be undone.`))
                              deleteMut.mutate(emp.id);
                          }}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AddEmployeeDialog open={addOpen} onClose={() => setAddOpen(false)} lang={lang} onCreated={setTempCreds} />
      <TempCredsDialog creds={tempCreds} onClose={() => setTempCreds(null)} lang={lang} />
    </PageWrapper>
  );
}
