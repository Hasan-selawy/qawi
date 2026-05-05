import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { useLanguage } from '@/hooks/use-language';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Loader2, CheckCircle2, Flag, Lightbulb, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type ReportItem = {
  id: string;
  type: 'REPORT' | 'SUGGESTION';
  memberName: string;
  category: string | null;
  description: string;
  status: string;
  createdAt: string;
};

const CATEGORY_LABELS: Record<string, { en: string; ar: string }> = {
  COACH_ATTITUDE: { en: 'Coach Attitude', ar: 'سلوك المدرب' },
  BROKEN_EQUIPMENT: { en: 'Broken Equipment', ar: 'معدات معطلة' },
  OTHER: { en: 'Other', ar: 'أخرى' },
};

export default function AdminReports() {
  const { lang } = useLanguage();
  const isRTL = lang === 'ar';
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'ALL' | 'REPORT' | 'SUGGESTION' | 'PENDING' | 'RESOLVED'>('ALL');

  const { data, isLoading } = useQuery<ReportItem[]>({
    queryKey: ['admin', 'reports'],
    queryFn: () => apiFetch('/admin/reports'),
  });

  const resolve = useMutation({
    mutationFn: (reportId: string) =>
      apiFetch(`/admin/reports/${reportId}/resolve`, { method: 'PUT' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'reports'] });
      toast.success(isRTL ? 'تم وضع علامة محلول' : 'Marked as resolved');
    },
    onError: () => toast.error(isRTL ? 'تعذر التحديث' : 'Failed to update'),
  });

  const items = data ?? [];
  const filtered = items.filter((item) => {
    if (filter === 'REPORT') return item.type === 'REPORT';
    if (filter === 'SUGGESTION') return item.type === 'SUGGESTION';
    if (filter === 'PENDING') return item.status === 'PENDING';
    if (filter === 'RESOLVED') return item.status === 'RESOLVED';
    return true;
  });

  const pendingCount = items.filter((i) => i.status === 'PENDING').length;

  const filterOptions = [
    { key: 'ALL', label: isRTL ? 'الكل' : 'All' },
    { key: 'REPORT', label: isRTL ? 'تقارير' : 'Reports' },
    { key: 'SUGGESTION', label: isRTL ? 'اقتراحات' : 'Suggestions' },
    { key: 'PENDING', label: isRTL ? 'معلّق' : 'Pending' },
    { key: 'RESOLVED', label: isRTL ? 'محلول' : 'Resolved' },
  ] as const;

  return (
    <PageWrapper>
      <PageHeader
        title={isRTL ? 'تقارير الأعضاء' : 'Member Reports'}
        subtitle={
          pendingCount > 0
            ? isRTL
              ? `${pendingCount} تقرير بانتظار المراجعة`
              : `${pendingCount} pending review`
            : isRTL
              ? 'لا توجد تقارير معلقة'
              : 'No pending reports'
        }
      />

      {/* Filter chips */}
      <div className={cn('flex gap-2 mb-6 flex-wrap', isRTL && 'flex-row-reverse')}>
        <Filter size={16} className="text-muted-foreground self-center" />
        {filterOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setFilter(opt.key)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              filter === opt.key
                ? 'bg-primary/20 text-primary ring-1 ring-primary/40'
                : 'bg-white/5 text-muted-foreground hover:bg-white/10'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center text-muted-foreground">
          {isRTL ? 'لا توجد عناصر لعرضها' : 'Nothing to show'}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((item) => {
            const isReport = item.type === 'REPORT';
            const isPending = item.status === 'PENDING';
            const catLabel = item.category ? (CATEGORY_LABELS[item.category]?.[lang] ?? item.category) : null;
            const date = new Date(item.createdAt).toLocaleDateString(isRTL ? 'ar' : 'en', {
              day: '2-digit', month: 'short', year: 'numeric',
            });

            return (
              <div
                key={item.id}
                className={cn(
                  'glass-card p-5 border-l-4 rtl:border-l-0 rtl:border-r-4',
                  isReport
                    ? isPending ? 'border-orange-400' : 'border-primary/40'
                    : 'border-blue-400/60'
                )}
              >
                <div className={cn('flex items-start justify-between gap-4', isRTL && 'flex-row-reverse')}>
                  <div className={cn('flex items-start gap-3 flex-1 min-w-0', isRTL && 'flex-row-reverse')}>
                    <div className={cn(
                      'mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                      isReport ? 'bg-orange-400/20' : 'bg-blue-400/20'
                    )}>
                      {isReport
                        ? <Flag size={15} className="text-orange-400" />
                        : <Lightbulb size={15} className="text-blue-400" />
                      }
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className={cn('flex items-center gap-2 flex-wrap', isRTL && 'flex-row-reverse')}>
                        <span className="font-semibold text-foreground">{item.memberName}</span>
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          isReport ? 'bg-orange-400/15 text-orange-400' : 'bg-blue-400/15 text-blue-400'
                        )}>
                          {isReport ? (isRTL ? 'تقرير' : 'Report') : (isRTL ? 'اقتراح' : 'Suggestion')}
                        </span>
                        {catLabel && (
                          <span className="text-xs text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full">
                            {catLabel}
                          </span>
                        )}
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          isPending
                            ? 'bg-yellow-400/15 text-yellow-400'
                            : 'bg-primary/15 text-primary'
                        )}>
                          {isPending
                            ? (isRTL ? 'معلّق' : 'Pending')
                            : (isRTL ? 'محلول' : 'Resolved')}
                        </span>
                      </div>

                      <p className={cn('text-sm text-muted-foreground mt-2 break-words', isRTL && 'text-right')}>
                        {item.description}
                      </p>
                      <p className={cn('text-xs text-muted-foreground/60 mt-2', isRTL && 'text-right')}>{date}</p>
                    </div>
                  </div>

                  {isReport && isPending && (
                    <button
                      onClick={() => resolve.mutate(item.id)}
                      disabled={resolve.isPending}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 size={15} />
                      {isRTL ? 'حل' : 'Resolve'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageWrapper>
  );
}
