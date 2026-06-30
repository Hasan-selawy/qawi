import { content } from '@/locales/content';
import { GREEN, cn, CONTAINER, Reveal } from './shared';

export function Stats({ t, isAr }: { t: typeof content.en.stats; isAr: boolean }) {
  return (
    <section className="py-12 sm:py-16" aria-label={t.heading}>
      <div className={CONTAINER}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {t.items.map((item, i) => (
            <Reveal
              key={item.label}
              delay={i * 0.08}
              className={cn('rounded-2xl p-5 sm:p-6 text-center', isAr && 'text-center')}
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight" style={{ color: GREEN }}>
                {item.value}
              </div>
              <div className="mt-1.5 text-xs sm:text-sm text-white/55 leading-snug">{item.label}</div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
