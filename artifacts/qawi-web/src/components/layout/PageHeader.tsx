import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground inline-block relative">
          {title}
          <div className="absolute -bottom-2 left-0 w-1/3 h-1 bg-primary rounded-full glow-hover" />
        </h1>
        {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </div>
  );
}
