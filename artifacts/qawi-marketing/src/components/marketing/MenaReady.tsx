import { Check } from 'lucide-react';
import { content } from '@/locales/content';
import { GREEN, cn, CONTAINER, SectionHeading, Reveal } from './shared';

export function MenaReady({ t, isAr }: { t: typeof content.en.mena; isAr: boolean }) {
  return (
    <section id="mena" className="py-20 sm:py-28 relative scroll-mt-20 overflow-hidden">
      <div className="absolute inset-0 -z-10 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[40vw] rounded-full blur-3xl opacity-[0.1]" style={{ background: `radial-gradient(circle, ${GREEN}, transparent 70%)` }} />
      </div>
      <div className={CONTAINER}>
        <SectionHeading eyebrow={isAr ? 'جاهز للمنطقة' : 'MENA Ready'} title={t.heading} sub={t.sub} isAr={isAr} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {t.points.map((p, i) => (
            <Reveal
              key={p.title}
              delay={(i % 3) * 0.07}
              className="rounded-2xl p-6 h-full"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className={cn('flex items-start gap-3', isAr && 'flex-row-reverse text-right')}>
                <span className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.2)' }}>
                  <Check className="w-4 h-4" style={{ color: GREEN }} />
                </span>
                <div>
                  <h3 className="font-bold text-white text-base mb-1.5 leading-snug">{p.title}</h3>
                  <p className="text-sm text-white/55 leading-relaxed">{p.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
