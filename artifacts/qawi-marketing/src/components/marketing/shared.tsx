import { useEffect, useState, type ReactNode, type CSSProperties } from 'react';
import { motion, type Variants } from 'framer-motion';

export const GREEN = '#22C55E';
export const BG = '#0A0F1E';
export const CONTAINER = 'max-w-6xl mx-auto px-4 sm:px-6';

export function cn(...cls: (string | undefined | false | null)[]) {
  return cls.filter(Boolean).join(' ');
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const h = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  return reduced;
}

export function fadeUp(delay = 0): Variants {
  return {
    hidden: { opacity: 0, y: 26 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.55,
        delay,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };
}

/** Single element that fades/rises into view once. Respects reduced motion via MotionConfig. */
export function Reveal({
  children,
  className,
  delay = 0,
  style,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  style?: CSSProperties;
}) {
  return (
    <motion.div
      className={className}
      style={style}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-70px' }}
      variants={fadeUp(delay)}
    >
      {children}
    </motion.div>
  );
}

/** Consistent eyebrow + heading + subtitle block used across sections. */
export function SectionHeading({
  eyebrow,
  title,
  sub,
  align = 'center',
  isAr,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  align?: 'center' | 'start';
  isAr: boolean;
}) {
  return (
    <Reveal
      className={cn(
        'space-y-4 mb-12 sm:mb-16',
        align === 'center' ? 'text-center mx-auto max-w-2xl' : isAr ? 'text-right' : 'text-left',
      )}
    >
      {eyebrow && (
        <span
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase"
          style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.22)', color: GREEN }}
        >
          {eyebrow}
        </span>
      )}
      <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold text-white leading-[1.12] tracking-tight">
        {title}
      </h2>
      {sub && <p className="text-base sm:text-lg text-white/55 leading-relaxed">{sub}</p>}
    </Reveal>
  );
}

/** Soft layered background glow used behind feature/role sections. */
export function GlowBackdrop({ className }: { className?: string }) {
  return (
    <div className={cn('absolute inset-0 -z-10 overflow-hidden pointer-events-none', className)} aria-hidden="true">
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[70vw] h-[40vw] rounded-full blur-3xl opacity-[0.12]"
        style={{ background: `radial-gradient(circle, ${GREEN}, transparent 70%)` }}
      />
    </div>
  );
}
