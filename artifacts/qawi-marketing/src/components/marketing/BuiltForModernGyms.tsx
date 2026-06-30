import { content } from '@/locales/content';
import { GREEN, cn, CONTAINER, SectionHeading, Reveal } from './shared';
import { modernIcons } from './icons';

export function BuiltForModernGyms({ t, isAr }: { t: typeof content.en.modern; isAr: boolean }) {
  return (
    <section className="py-20 sm:py-28 relative">
      <div className={CONTAINER}>
        <SectionHeading title={t.heading} sub={t.sub} isAr={isAr} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {t.cards.map((card, i) => {
            const Icon = modernIcons[card.icon];
            return (
              <Reveal
                key={card.title}
                delay={(i % 2) * 0.08}
                className="rounded-2xl p-6 sm:p-7 h-full relative overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className={cn('flex items-start gap-4', isAr && 'flex-row-reverse text-right')}>
                  <span
                    className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}
                  >
                    {Icon && <Icon className="w-6 h-6" style={{ color: GREEN }} aria-hidden="true" />}
                  </span>
                  <div>
                    <h3 className="font-bold text-white text-lg mb-2 leading-snug">{card.title}</h3>
                    <p className="text-sm text-white/55 leading-relaxed">{card.desc}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
