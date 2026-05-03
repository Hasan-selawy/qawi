import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { addDays, format } from 'date-fns';
import { cn } from '@/lib/utils';

export type MemberSubPlan = 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

const PLAN_META: Record<MemberSubPlan, { days: number; price: number; label: string }> = {
  MONTHLY: { days: 30, price: 49, label: 'Monthly' },
  QUARTERLY: { days: 90, price: 120, label: 'Quarterly' },
  YEARLY: { days: 365, price: 399, label: 'Yearly' },
};

export interface RenewSubscriptionData {
  startDate: string;
  endDate: string;
  plan: MemberSubPlan;
  price: number;
}

export function RenewSubscriptionForm({
  defaultStartDate,
  isPending,
  onSubmit,
  submitLabel = 'Confirm Renewal',
}: {
  defaultStartDate?: string;
  isPending: boolean;
  onSubmit: (data: RenewSubscriptionData) => void;
  submitLabel?: string;
}) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [startDate, setStartDate] = useState(defaultStartDate ?? today);
  const [plan, setPlan] = useState<MemberSubPlan>('MONTHLY');
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 30), 'yyyy-MM-dd'));
  const [price, setPrice] = useState<number>(PLAN_META.MONTHLY.price);
  const [priceTouched, setPriceTouched] = useState(false);
  const [endTouched, setEndTouched] = useState(false);

  useEffect(() => {
    const meta = PLAN_META[plan];
    if (!endTouched) {
      try {
        setEndDate(format(addDays(new Date(startDate), meta.days), 'yyyy-MM-dd'));
      } catch {
        /* ignore invalid dates */
      }
    }
    if (!priceTouched) setPrice(meta.price);
  }, [plan, startDate, endTouched, priceTouched]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ startDate, endDate, plan, price: Number(price) });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(PLAN_META) as MemberSubPlan[]).map((p) => {
          const meta = PLAN_META[p];
          const active = plan === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => { setPlan(p); setPriceTouched(false); setEndTouched(false); }}
              className={cn(
                'rounded-lg border p-3 text-left transition-all hover:-translate-y-0.5',
                active ? 'bg-primary/15 border-primary text-primary' : 'bg-black/30 border-white/10 hover:border-white/20',
              )}
            >
              <p className="text-xs uppercase tracking-wide opacity-80">{meta.label}</p>
              <p className="font-bold text-lg mt-1">${meta.price}</p>
              <p className="text-[10px] opacity-70">{meta.days} days</p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground ml-1 mb-1 block">Start Date</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-black/20"
            required
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground ml-1 mb-1 block">End Date</label>
          <Input
            type="date"
            value={endDate}
            min={startDate}
            onChange={(e) => { setEndDate(e.target.value); setEndTouched(true); }}
            className="bg-black/20"
            required
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground ml-1 mb-1 block">Price ($)</label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={price}
          onChange={(e) => { setPrice(Number(e.target.value)); setPriceTouched(true); }}
          className="bg-black/20"
          required
        />
      </div>

      <Button
        type="submit"
        className="w-full bg-green-600 hover:bg-green-700 text-white"
        disabled={isPending || !startDate || !endDate || !(price >= 0)}
      >
        {isPending ? <Loader2 className="animate-spin h-4 w-4" /> : submitLabel}
      </Button>
    </form>
  );
}
