import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: { value: number; isPositive: boolean };
  glowColor?: 'green' | 'blue' | 'orange' | 'purple' | 'red';
  onClick?: () => void;
  className?: string;
}

export function StatCard({ title, value, icon, trend, glowColor = 'green', onClick, className }: StatCardProps) {
  const colorMap = {
    green: 'border-l-primary hover:shadow-[0_0_20px_rgba(34,197,94,0.15)]',
    blue: 'border-l-blue-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]',
    orange: 'border-l-orange-500 hover:shadow-[0_0_20px_rgba(249,115,22,0.15)]',
    purple: 'border-l-purple-500 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]',
    red: 'border-l-destructive hover:shadow-[0_0_20px_rgba(239,68,68,0.15)]',
  };

  const textMap = {
    green: 'text-primary',
    blue: 'text-blue-500',
    orange: 'text-orange-500',
    purple: 'text-purple-500',
    red: 'text-destructive',
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "glass-card p-4 sm:p-6 border-l-4 transition-all duration-300",
        colorMap[glowColor],
        onClick && "cursor-pointer hover:-translate-y-1",
        className
      )}
    >
      <div className="flex justify-between items-start">
        <div className="min-w-0 mr-2">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 truncate">{title}</p>
          <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{value}</h3>
          {trend && (
            <p className={cn("text-xs mt-2 flex items-center gap-1", trend.isPositive ? "text-primary" : "text-destructive")}>
              <span>{trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
              <span className="text-muted-foreground">vs last month</span>
            </p>
          )}
        </div>
        <div className={cn("p-3 rounded-xl bg-white/5", textMap[glowColor])}>
          {icon}
        </div>
      </div>
    </div>
  );
}
