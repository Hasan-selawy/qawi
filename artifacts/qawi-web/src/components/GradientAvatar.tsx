import { memo } from 'react';
import { cn } from '@/lib/utils';

interface GradientAvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const GradientAvatar = memo(function GradientAvatar({ name, size = 'md', className }: GradientAvatarProps) {
  // Deterministic hue based on name
  const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
  const hue = Math.abs(hash % 360);
  
  const initials = name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-xl',
    xl: 'w-24 h-24 text-3xl',
  };

  return (
    <div 
      className={cn(
        "rounded-full flex items-center justify-center font-bold text-white shadow-lg shrink-0",
        sizeClasses[size],
        className
      )}
      style={{
        background: `linear-gradient(135deg, hsl(${hue}, 70%, 50%), hsl(${(hue + 40) % 360}, 80%, 40%))`
      }}
    >
      {initials}
    </div>
  );
});
