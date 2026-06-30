import { cn } from '@/lib/utils';

export type BadgeStatus = 'ACTIVE' | 'EXPIRING' | 'GRACE' | 'EXPIRED' | 'INFO';

interface StatusBadgeProps {
  status: BadgeStatus;
  label: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const styles = {
    ACTIVE: "bg-primary/10 text-primary border-primary/20",
    EXPIRING: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    GRACE: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    EXPIRED: "bg-destructive/10 text-destructive border-destructive/20",
    INFO: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  };

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
      styles[status],
      className
    )}>
      {status === 'ACTIVE' && (
        <span className="w-1.5 h-1.5 rounded-full bg-primary pulse-dot" />
      )}
      {label}
    </div>
  );
}
