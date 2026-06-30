import { X, Check } from 'lucide-react';
import { content } from '@/locales/content';
import { GREEN, cn, CONTAINER, Reveal, SectionHeading } from './shared';

export function ProblemSolution({ t, isAr }: { t: typeof content.en.problem; isAr: boolean }) {
  return (
    <section className="py-20 sm:py-28 relative">
      <div className={CONTAINER}>
        <SectionHeading title={t.heading} sub={t.sub} isAr={isAr} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Before */}
          <Reveal
            className="rounded-2xl p-6 sm:p-7"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <h3 className={cn('text-lg font-bold text-white/70 mb-5', isAr && 'text-right')}>{t.beforeTitle}</h3>
            <ul className="space-y-3.5">
              {t.problems.map((p) => (
                <li key={p} className={cn('flex items-start gap-3', isAr && 'flex-row-reverse text-right')}>
                  <span
                    className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                    style={{ background: 'rgba(239,68,68,0.12)' }}
                  >
                    <X className="w-3 h-3" style={{ color: '#ef4444' }} />
                  </span>
                  <span className="text-sm text-white/55 leading-relaxed">{p}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          {/* After */}
          <Reveal
            delay={0.1}
            className="rounded-2xl p-6 sm:p-7 relative overflow-hidden"
            style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.22)' }}
          >
            <div
              className="absolute inset-0 -z-10 opacity-50"
              style={{ background: 'radial-gradient(circle at 70% 0%, rgba(34,197,94,0.1), transparent 60%)' }}
              aria-hidden="true"
            />
            <h3 className={cn('text-lg font-bold mb-5', isAr && 'text-right')} style={{ color: GREEN }}>
              {t.afterTitle}
            </h3>
            <ul className="space-y-3.5">
              {t.solutions.map((s) => (
                <li key={s} className={cn('flex items-start gap-3', isAr && 'flex-row-reverse text-right')}>
                  <span
                    className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                    style={{ background: 'rgba(34,197,94,0.18)' }}
                  >
                    <Check className="w-3 h-3" style={{ color: GREEN }} />
                  </span>
                  <span className="text-sm text-white/75 leading-relaxed">{s}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
