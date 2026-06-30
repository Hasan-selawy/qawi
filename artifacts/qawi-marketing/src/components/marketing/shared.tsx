import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react';

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

/**
 * Single element that fades/rises into view once it scrolls into view.
 * Uses IntersectionObserver + a CSS transition (no JS animation library),
 * and respects prefers-reduced-motion by rendering visible immediately.
 */
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
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    // Render visible immediately for reduced-motion or when IO is unavailable,
    // so content is never permanently hidden (SEO/crawl/render robustness).
    if (reduced || typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    const el = ref.current;
    if (!el) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.05, rootMargin: '0px 0px -60px 0px' },
    );
    io.observe(el);
    // Safety net: if the observer somehow never fires, reveal anyway.
    const fallback = window.setTimeout(() => setShown(true), 1500);
    return () => {
      io.disconnect();
      window.clearTimeout(fallback);
    };
  }, [reduced]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...style,
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : 'translateY(24px)',
        transition: reduced
          ? undefined
          : `opacity 0.6s cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 0.6s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
      }}
    >
      {children}
    </div>
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
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[55vw] h-[30vw] rounded-full blur-3xl opacity-[0.1]"
        style={{ background: `radial-gradient(circle, ${GREEN}, transparent 70%)` }}
      />
    </div>
  );
}
