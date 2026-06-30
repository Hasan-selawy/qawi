import { motion } from 'framer-motion';
import { content } from '@/locales/content';
import { GREEN, cn, CONTAINER, fadeUp, SectionHeading } from './shared';
import { featureIcons } from './icons';

export function Features({ t, isAr }: { t: typeof content.en.features; isAr: boolean }) {
  return (
    <section id="features" className="py-20 sm:py-28 relative scroll-mt-20">
      <div className={CONTAINER}>
        <SectionHeading eyebrow={isAr ? 'المميزات' : 'Features'} title={t.heading} sub={t.sub} isAr={isAr} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {t.cards.map((card, i) => {
            const Icon = featureIcons[card.icon];
            return (
              <motion.article
                key={card.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                variants={fadeUp((i % 4) * 0.06)}
                whileHover={{ y: -4 }}
                className="group relative rounded-2xl p-5 sm:p-6 h-full overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ background: 'radial-gradient(circle at 30% 0%, rgba(34,197,94,0.08), transparent 65%)' }}
                  aria-hidden="true"
                />
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}
                >
                  {Icon && <Icon className="w-5 h-5" style={{ color: GREEN }} aria-hidden="true" />}
                </div>
                <h3 className={cn('font-bold text-white text-base mb-2 leading-snug', isAr && 'text-right')}>
                  {card.title}
                </h3>
                <p className={cn('text-sm text-white/55 leading-relaxed', isAr && 'text-right')}>{card.desc}</p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
