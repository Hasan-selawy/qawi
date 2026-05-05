import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { useLanguage } from '@/hooks/use-language';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Loader2, TrendingUp, Users, UserX, DollarSign, Printer, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

type Summary = {
  activeSubscriptions: number;
  newJoins: number;
  expired: number;
  totalRevenue: number;
};

type RevenueRow = {
  memberName: string;
  plan: string;
  startDate: string;
  endDate: string;
  amountPaid: number;
  status: string;
};

type RevenueData = {
  summary: Summary;
  details: RevenueRow[];
};

export default function AdminRevenue() {
  const { lang } = useLanguage();
  const isRTL = lang === 'ar';
  const tableRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(todayStr);

  const { data, isLoading, refetch } = useQuery<RevenueData>({
    queryKey: ['admin', 'revenue-report', startDate, endDate],
    queryFn: () => apiFetch(`/admin/revenue-report?startDate=${startDate}&endDate=${endDate}`),
  });

  const summary = data?.summary;
  const details = data?.details ?? [];

  const handlePrint = () => window.print();

  const handleExportCSV = () => {
    const headers = isRTL
      ? ['الاسم', 'الخطة', 'تاريخ البدء', 'تاريخ الانتهاء', 'المبلغ المدفوع', 'الحالة']
      : ['Member Name', 'Plan', 'Start Date', 'End Date', 'Amount Paid', 'Status'];
    const rows = details.map((r) => [
      r.memberName, r.plan, r.startDate, r.endDate, r.amountPaid, r.status,
    ]);
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-report-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const summaryCards = [
    {
      label: isRTL ? 'الاشتراكات النشطة' : 'Active Subscriptions',
      value: summary?.activeSubscriptions ?? 0,
      icon: Users,
      color: 'text-primary',
      bg: 'bg-primary/20',
    },
    {
      label: isRTL ? 'انضمامات جديدة' : 'New Joins',
      value: summary?.newJoins ?? 0,
      icon: TrendingUp,
      color: 'text-blue-400',
      bg: 'bg-blue-400/20',
    },
    {
      label: isRTL ? 'منتهية / ملغاة' : 'Expired / Cancelled',
      value: summary?.expired ?? 0,
      icon: UserX,
      color: 'text-red-400',
      bg: 'bg-red-400/20',
    },
    {
      label: isRTL ? 'إجمالي الإيرادات' : 'Total Revenue',
      value: `${(summary?.totalRevenue ?? 0).toFixed(2)} JOD`,
      icon: DollarSign,
      color: 'text-yellow-400',
      bg: 'bg-yellow-400/20',
    },
  ];

  return (
    <>
      {/* Print styles — only used in print mode */}
      <style>{`
        @media print {
          body > *:not(#revenue-print-area) { display: none !important; }
          #revenue-print-area { display: block !important; }
          .no-print { display: none !important; }
        }
        #revenue-print-area { display: none; }
      `}</style>

      <PageWrapper>
        <div className="no-print">
          <PageHeader
            title={isRTL ? 'تقرير الإيرادات' : 'Revenue Report'}
            subtitle={isRTL ? 'تقرير الاشتراكات والإيرادات' : 'Subscription & revenue summary'}
          />

          {/* Date filter */}
          <div className={cn('flex gap-4 mb-6 flex-wrap', isRTL && 'flex-row-reverse')}>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-muted-foreground">{isRTL ? 'من' : 'From'}</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-surface border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-muted-foreground">{isRTL ? 'إلى' : 'To'}</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-surface border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-foreground text-sm font-medium transition-colors"
              >
                <Printer size={16} />
                {isRTL ? 'طباعة' : 'Print'}
              </button>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary text-sm font-medium transition-colors"
              >
                <Download size={16} />
                {isRTL ? 'تصدير CSV' : 'Export CSV'}
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
                {summaryCards.map((card) => (
                  <div key={card.label} className="glass-card p-5 flex flex-col gap-3">
                    <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', card.bg)}>
                      <card.icon size={20} className={card.color} />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm">{card.label}</p>
                      <p className={cn('text-2xl font-bold mt-1', card.color)}>{card.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Detail table */}
              <div className="glass-card overflow-hidden">
                <div className={cn('px-6 py-4 border-b border-border', isRTL && 'text-right')}>
                  <h2 className="font-semibold text-foreground">
                    {isRTL ? 'تفاصيل الاشتراكات' : 'Subscription Details'}
                  </h2>
                </div>
                <div className="overflow-x-auto" ref={tableRef}>
                  <table className={cn('w-full text-sm', isRTL && 'text-right')} dir={isRTL ? 'rtl' : 'ltr'}>
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        {[
                          isRTL ? 'الاسم' : 'Member',
                          isRTL ? 'الخطة' : 'Plan',
                          isRTL ? 'تاريخ البدء' : 'Start',
                          isRTL ? 'تاريخ الانتهاء' : 'End',
                          isRTL ? 'المبلغ' : 'Amount',
                          isRTL ? 'الحالة' : 'Status',
                        ].map((h) => (
                          <th key={h} className="px-6 py-3 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {details.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                            {isRTL ? 'لا توجد بيانات للفترة المحددة' : 'No data for selected period'}
                          </td>
                        </tr>
                      ) : (
                        details.map((row, i) => (
                          <tr key={i} className="border-b border-border/50 hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 font-medium text-foreground">{row.memberName}</td>
                            <td className="px-6 py-4 text-muted-foreground capitalize">{row.plan.toLowerCase()}</td>
                            <td className="px-6 py-4 text-muted-foreground">{row.startDate}</td>
                            <td className="px-6 py-4 text-muted-foreground">{row.endDate}</td>
                            <td className="px-6 py-4 font-semibold text-primary">{row.amountPaid.toFixed(2)} JOD</td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
                                row.status === 'Active'
                                  ? 'bg-primary/20 text-primary'
                                  : 'bg-red-500/20 text-red-400'
                              )}>
                                {isRTL ? (row.status === 'Active' ? 'نشط' : 'منتهي') : row.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </PageWrapper>

      {/* Print-only area */}
      <div id="revenue-print-area" style={{ padding: '32px', fontFamily: 'sans-serif' }} dir={isRTL ? 'rtl' : 'ltr'}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
          {isRTL ? 'تقرير الإيرادات' : 'Revenue Report'}
        </h1>
        <p style={{ color: '#888', marginBottom: 24, fontSize: 13 }}>{startDate} → {endDate}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          {summaryCards.map((c) => (
            <div key={c.label} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 12, color: '#888' }}>{c.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{c.value}</div>
            </div>
          ))}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #333' }}>
              {['Member', 'Plan', 'Start', 'End', 'Amount', 'Status'].map((h) => (
                <th key={h} style={{ textAlign: isRTL ? 'right' : 'left', padding: '8px 12px', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {details.map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px 12px' }}>{row.memberName}</td>
                <td style={{ padding: '8px 12px' }}>{row.plan}</td>
                <td style={{ padding: '8px 12px' }}>{row.startDate}</td>
                <td style={{ padding: '8px 12px' }}>{row.endDate}</td>
                <td style={{ padding: '8px 12px' }}>{row.amountPaid.toFixed(2)} JOD</td>
                <td style={{ padding: '8px 12px' }}>{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
