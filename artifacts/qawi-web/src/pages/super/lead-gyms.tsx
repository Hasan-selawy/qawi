import { useState, useEffect, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { useLanguage } from '@/hooks/use-language';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Loader2, Building2, Users, UserCheck, UserX, ChevronLeft, ChevronRight,
  Download, ArrowLeft, Mail, Phone, Search, AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

type SubStatus = 'ACTIVE' | 'GRACE_PERIOD' | 'EXPIRED' | 'INACTIVE' | 'PENDING';

interface GymLead {
  id: string;
  name: string;
  ownerName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  registeredAt: string | null;
  totalMembers: number;
  activeMembers: number;
  graceMembers: number;
  expiredMembers: number;
  inactiveMembers: number;
  pendingMembers: number;
}

interface MemberLead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: SubStatus;
  subscriptionStartDate: string | null;
  subscriptionEndDate: string | null;
  joinedAt: string | null;
}

interface MemberPage {
  content: MemberLead[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

const PAGE_SIZE = 20;

function useDebounced<T>(value: T, delay = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  try {
    return format(new Date(iso), 'PP');
  } catch {
    return '—';
  }
}

function csvCell(v: string) {
  let s = (v ?? '').toString();
  // Neutralize spreadsheet formula injection (OWASP): prefix risky leading chars.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function StatusPill({ status, label }: { status: SubStatus; label: string }) {
  const styles: Record<SubStatus, string> = {
    ACTIVE: 'bg-green-500/15 text-green-400 border-green-500/30',
    GRACE_PERIOD: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    EXPIRED: 'bg-red-500/15 text-red-400 border-red-500/30',
    INACTIVE: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    PENDING: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
      {label}
    </span>
  );
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="glass-card p-4 border-white/5 flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-xl font-bold text-foreground">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}

export default function SuperLeadGyms() {
  const { t } = useLanguage();
  const [selectedGym, setSelectedGym] = useState<GymLead | null>(null);

  // ── Gyms list state ──
  const [gymSearchInput, setGymSearchInput] = useState('');
  const gymSearch = useDebounced(gymSearchInput);
  const [gymSort, setGymSort] = useState('NEWEST');

  const gymsQuery = useQuery<GymLead[]>({
    queryKey: ['super', 'leadGyms', gymSearch, gymSort],
    queryFn: () => {
      const p = new URLSearchParams();
      if (gymSearch) p.set('search', gymSearch);
      p.set('sort', gymSort);
      return apiFetch(`/super/leads/gyms?${p.toString()}`);
    },
  });

  // ── Members detail state ──
  const [mSearchInput, setMSearchInput] = useState('');
  const mSearch = useDebounced(mSearchInput);
  const [mStatus, setMStatus] = useState('ALL');
  const [mPage, setMPage] = useState(0);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setMPage(0);
  }, [mSearch, mStatus, selectedGym?.id]);

  const membersQuery = useQuery<MemberPage>({
    queryKey: ['super', 'leadMembers', selectedGym?.id, mSearch, mStatus, mPage],
    enabled: !!selectedGym,
    queryFn: () => {
      const p = new URLSearchParams();
      p.set('page', String(mPage));
      p.set('size', String(PAGE_SIZE));
      if (mSearch) p.set('search', mSearch);
      if (mStatus && mStatus !== 'ALL') p.set('status', mStatus);
      return apiFetch(`/super/leads/gyms/${selectedGym!.id}/members?${p.toString()}`);
    },
  });

  const gyms = gymsQuery.data ?? [];
  const stats = {
    gyms: gyms.length,
    members: gyms.reduce((a, g) => a + g.totalMembers, 0),
    active: gyms.reduce((a, g) => a + g.activeMembers, 0),
    expiredInactive: gyms.reduce((a, g) => a + g.expiredMembers + g.inactiveMembers, 0),
  };

  async function exportCsv() {
    if (!selectedGym) return;
    setExporting(true);
    try {
      // Backend caps page size at 200, so page through all results to export the full set.
      const EXPORT_PAGE = 200;
      const rows: MemberLead[] = [];
      let pageIdx = 0;
      let totalPages = 1;
      do {
        const p = new URLSearchParams();
        p.set('page', String(pageIdx));
        p.set('size', String(EXPORT_PAGE));
        if (mSearch) p.set('search', mSearch);
        if (mStatus && mStatus !== 'ALL') p.set('status', mStatus);
        const res = await apiFetch<MemberPage>(`/super/leads/gyms/${selectedGym.id}/members?${p.toString()}`);
        rows.push(...res.content);
        totalPages = res.totalPages;
        pageIdx += 1;
      } while (pageIdx < totalPages);

      if (!rows.length) {
        toast.error(t('superLeads.exportEmpty'));
        return;
      }
      const header = [
        t('superLeads.colName'), t('superLeads.colEmail'), t('superLeads.colPhone'),
        t('superLeads.colStatus'), t('superLeads.colSubStart'), t('superLeads.colSubEnd'),
        t('superLeads.colJoined'),
      ];
      const lines = rows.map((m) => [
        m.name, m.email, m.phone ?? '', m.status,
        m.subscriptionStartDate ?? '', m.subscriptionEndDate ?? '',
        m.joinedAt ? m.joinedAt.slice(0, 10) : '',
      ].map(csvCell).join(','));
      const csv = [header.join(','), ...lines].join('\n');
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedGym.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-members.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t('superLeads.exportError'));
    } finally {
      setExporting(false);
    }
  }

  // ───────────────────────────── MEMBERS DETAIL VIEW ─────────────────────────────
  if (selectedGym) {
    const page = membersQuery.data;
    const members = page?.content ?? [];
    return (
      <PageWrapper>
        <PageHeader
          title={selectedGym.name}
          subtitle={t('superLeads.membersSubtitle')}
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => setSelectedGym(null)}>
                <ArrowLeft className="h-4 w-4 mr-1 rtl:rotate-180" /> {t('superLeads.back')}
              </Button>
              <Button
                size="sm"
                className="bg-white text-black hover:bg-white/90"
                onClick={exportCsv}
                disabled={exporting}
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-1" /> {t('superLeads.exportCsv')}
                  </>
                )}
              </Button>
            </div>
          }
        />

        <div className="glass-card p-4 border-white/5 mb-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <span className="text-muted-foreground">
            {t('superLeads.colOwner')}: <span className="text-foreground">{selectedGym.ownerName || '—'}</span>
          </span>
          {selectedGym.contactEmail && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Mail className="h-3.5 w-3.5" /> {selectedGym.contactEmail}
            </span>
          )}
          {selectedGym.contactPhone && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Phone className="h-3.5 w-3.5" /> {selectedGym.contactPhone}
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={mSearchInput}
              onChange={(e) => setMSearchInput(e.target.value)}
              placeholder={t('superLeads.searchMembers')}
              className="bg-black/20 pl-9 rtl:pl-3 rtl:pr-9"
            />
          </div>
          <Select value={mStatus} onValueChange={setMStatus}>
            <SelectTrigger className="bg-black/20 w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('superLeads.status.ALL')}</SelectItem>
              <SelectItem value="ACTIVE">{t('superLeads.status.ACTIVE')}</SelectItem>
              <SelectItem value="GRACE_PERIOD">{t('superLeads.status.GRACE_PERIOD')}</SelectItem>
              <SelectItem value="EXPIRED">{t('superLeads.status.EXPIRED')}</SelectItem>
              <SelectItem value="INACTIVE">{t('superLeads.status.INACTIVE')}</SelectItem>
              <SelectItem value="PENDING">{t('superLeads.status.PENDING')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="glass-card p-6 border-white/5">
          {membersQuery.isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-primary h-8 w-8" />
            </div>
          ) : membersQuery.isError ? (
            <div className="flex flex-col items-center py-12 text-center gap-2">
              <AlertTriangle className="h-8 w-8 text-red-400" />
              <p className="text-muted-foreground">{t('superLeads.errorMembers')}</p>
              <Button variant="outline" size="sm" onClick={() => membersQuery.refetch()}>
                {t('superLeads.retry')}
              </Button>
            </div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center gap-2">
              <Users className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">{t('superLeads.emptyMembers')}</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border border-white/10 overflow-x-auto">
                <Table>
                  <TableHeader className="bg-black/20">
                    <TableRow className="border-white/10">
                      <TableHead>{t('superLeads.colName')}</TableHead>
                      <TableHead>{t('superLeads.colEmail')}</TableHead>
                      <TableHead>{t('superLeads.colPhone')}</TableHead>
                      <TableHead>{t('superLeads.colStatus')}</TableHead>
                      <TableHead>{t('superLeads.colSubStart')}</TableHead>
                      <TableHead>{t('superLeads.colSubEnd')}</TableHead>
                      <TableHead>{t('superLeads.colJoined')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((m) => (
                      <TableRow key={m.id} className="border-white/10">
                        <TableCell className="font-medium">{m.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{m.email}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{m.phone || '—'}</TableCell>
                        <TableCell>
                          <StatusPill status={m.status} label={t(`superLeads.status.${m.status}`)} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fmtDate(m.subscriptionStartDate)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fmtDate(m.subscriptionEndDate)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fmtDate(m.joinedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
                <span>
                  {t('superLeads.showing')} {members.length} / {page?.totalElements ?? 0}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={mPage <= 0}
                    onClick={() => setMPage((p) => Math.max(0, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
                  </Button>
                  <span>
                    {t('superLeads.page')} {(page?.page ?? 0) + 1} {t('superLeads.of')} {Math.max(1, page?.totalPages ?? 1)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!page || mPage >= page.totalPages - 1}
                    onClick={() => setMPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </PageWrapper>
    );
  }

  // ───────────────────────────── GYMS LIST VIEW ─────────────────────────────
  return (
    <PageWrapper>
      <PageHeader title={t('superLeads.title')} subtitle={t('superLeads.subtitle')} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Building2 className="h-5 w-5 text-blue-400" />} label={t('superLeads.statGyms')} value={stats.gyms} />
        <StatCard icon={<Users className="h-5 w-5 text-primary" />} label={t('superLeads.statMembers')} value={stats.members} />
        <StatCard icon={<UserCheck className="h-5 w-5 text-green-400" />} label={t('superLeads.statActive')} value={stats.active} />
        <StatCard icon={<UserX className="h-5 w-5 text-red-400" />} label={t('superLeads.statExpiredInactive')} value={stats.expiredInactive} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={gymSearchInput}
            onChange={(e) => setGymSearchInput(e.target.value)}
            placeholder={t('superLeads.searchGyms')}
            className="bg-black/20 pl-9 rtl:pl-3 rtl:pr-9"
          />
        </div>
        <Select value={gymSort} onValueChange={setGymSort}>
          <SelectTrigger className="bg-black/20 w-full sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="NEWEST">{t('superLeads.sortNewest')}</SelectItem>
            <SelectItem value="OLDEST">{t('superLeads.sortOldest')}</SelectItem>
            <SelectItem value="ACTIVE">{t('superLeads.sortActive')}</SelectItem>
            <SelectItem value="EXPIRED">{t('superLeads.sortExpired')}</SelectItem>
            <SelectItem value="TOTAL">{t('superLeads.sortTotal')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="glass-card p-6 border-white/5">
        {gymsQuery.isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-primary h-8 w-8" />
          </div>
        ) : gymsQuery.isError ? (
          <div className="flex flex-col items-center py-12 text-center gap-2">
            <AlertTriangle className="h-8 w-8 text-red-400" />
            <p className="text-muted-foreground">{t('superLeads.errorGyms')}</p>
            <Button variant="outline" size="sm" onClick={() => gymsQuery.refetch()}>
              {t('superLeads.retry')}
            </Button>
          </div>
        ) : gyms.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center gap-2">
            <Building2 className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">{t('superLeads.emptyGyms')}</p>
          </div>
        ) : (
          <>
            <div className="rounded-md border border-white/10 overflow-x-auto">
              <Table>
                <TableHeader className="bg-black/20">
                  <TableRow className="border-white/10">
                    <TableHead>{t('superLeads.colGym')}</TableHead>
                    <TableHead>{t('superLeads.colOwner')}</TableHead>
                    <TableHead>{t('superLeads.colContact')}</TableHead>
                    <TableHead>{t('superLeads.colMembers')}</TableHead>
                    <TableHead>{t('superLeads.colRegistered')}</TableHead>
                    <TableHead className="text-right">{t('superLeads.colActions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gyms.map((g) => (
                    <TableRow
                      key={g.id}
                      className="border-white/10 cursor-pointer hover:bg-white/5"
                      onClick={() => setSelectedGym(g)}
                    >
                      <TableCell className="font-medium">{g.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{g.ownerName || '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        <div className="flex flex-col gap-0.5">
                          {g.contactEmail && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {g.contactEmail}
                            </span>
                          )}
                          {g.contactPhone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {g.contactPhone}
                            </span>
                          )}
                          {!g.contactEmail && !g.contactPhone && '—'}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        <span className="text-foreground font-semibold">{g.totalMembers}</span>
                        <span className="text-muted-foreground"> · </span>
                        <span className="text-green-400" title={t('superLeads.status.ACTIVE')}>{g.activeMembers}</span>
                        <span className="text-muted-foreground"> / </span>
                        <span className="text-amber-400" title={t('superLeads.status.GRACE_PERIOD')}>{g.graceMembers}</span>
                        <span className="text-muted-foreground"> / </span>
                        <span className="text-red-400" title={t('superLeads.status.EXPIRED')}>{g.expiredMembers}</span>
                        <span className="text-muted-foreground"> / </span>
                        <span className="text-slate-400" title={t('superLeads.status.INACTIVE')}>{g.inactiveMembers}</span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmtDate(g.registeredAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedGym(g);
                          }}
                        >
                          <Users className="h-3.5 w-3.5 mr-1" /> {t('superLeads.viewMembers')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground mt-3 px-1">{t('superLeads.membersLegend')}</p>
          </>
        )}
      </div>
    </PageWrapper>
  );
}
