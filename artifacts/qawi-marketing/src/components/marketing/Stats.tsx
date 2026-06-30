import { Salad, LayoutDashboard, Languages, TrendingUp, Dumbbell, Sparkles, type LucideIcon } from 'lucide-react';
import { content } from '@/locales/content';
import { GREEN, cn, CONTAINER, Reveal, SectionHeading } from './shared';

const ICONS: LucideIcon[] = [Salad, LayoutDashboard, Languages, TrendingUp, Dumbbell, Sparkles];

export function Stats({ t, isAr }: { t: typeof content.en.stats; isAr: boolean }) {
  return (
    <section className="py-16 sm:py-20 relative" aria-label={t.heading}>
      <div className={CONTAINER}>
        <SectionHeading eyebrow={t.eyebrow} title={t.heading} isAr={isAr} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {t.items.map((item, i) => {
            const Icon = ICONS[i % ICONS.length];
            return (
              <Reveal key={item.title} delay={i * 0.06} className="h-full">
                <div
                  className={cn(
                    'group relative h-full rounded-2xl p-6 border border-white/[0.07] bg-white/[0.03] overflow-hidden',
                    'transition-all duration-300 will-change-transform',
                    'hover:-translate-y-1 hover:border-[#22C55E]/40 hover:bg-white/[0.05]',
                    'hover:shadow-[0_20px_50px_-18px_rgba(34,197,94,0.45)]',
                    isAr ? 'text-right' : 'text-left',
                  )}
                >
                  {/* soft top-corner glow on hover */}
                  <span
                    aria-hidden="true"
                    className={cn(
                      'pointer-events-none absolute -top-16 h-32 w-32 rounded-full blur-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100',
                      isAr ? '-left-10' : '-right-10',
                    )}
                    style={{ background: `radial-gradient(circle, ${GREEN}, transparent 70%)` }}
                  />

                  <div className={cn('relative flex mb-5', isAr && 'justify-end')}>
                    <span
                      className="inline-flex w-11 h-11 rounded-xl items-center justify-center transition-colors duration-300"
                      style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.22)' }}
                    >
                      <Icon className="w-5 h-5" style={{ color: GREEN }} aria-hidden="true" />
                    </span>
                  </div>

                  <div
                    className="relative text-3xl sm:text-[2.25rem] font-black tracking-tight leading-[1.05]"
                    style={{ color: GREEN }}
                  >
                    {item.value}
                  </div>

                  <h3 className="relative mt-3 text-base sm:text-lg font-bold text-white leading-snug">
                    {item.title}
                  </h3>

                  <p className="relative mt-2 text-sm text-white/55 leading-relaxed">
                    {item.subtitle}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
