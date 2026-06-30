import { ArrowRight } from 'lucide-react';
import { content } from '@/locales/content';
import { GREEN, BG, cn, CONTAINER, Reveal } from './shared';

export function CTASection({ t, isAr, onCTA }: { t: typeof content.en.cta; isAr: boolean; onCTA: () => void }) {
  return (
    <section className="py-20 sm:py-28">
      <div className={CONTAINER}>
        <Reveal
          className="relative rounded-3xl px-6 py-14 sm:px-14 sm:py-20 text-center overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, rgba(34,197,94,0.12), rgba(20,27,46,0.6))',
            border: '1px solid rgba(34,197,94,0.25)',
          }}
        >
          <div
            className="absolute inset-0 -z-10 opacity-60"
            style={{ background: 'radial-gradient(circle at 50% 0%, rgba(34,197,94,0.18), transparent 60%)' }}
            aria-hidden="true"
          />
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-[1.1] tracking-tight max-w-2xl mx-auto">
            {t.heading}
          </h2>
          <p className="mt-5 text-base sm:text-lg text-white/60 leading-relaxed max-w-xl mx-auto">{t.sub}</p>
          <button
            onClick={onCTA}
            className="mt-8 inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base transition-all hover:brightness-105 hover:scale-[1.02] active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1E]"
            style={{ background: GREEN, color: BG, boxShadow: '0 0 40px rgba(34,197,94,0.45)' }}
          >
            {t.button}
            <ArrowRight className={cn('w-5 h-5', isAr && 'rotate-180')} />
          </button>
          <p className="mt-4 text-sm text-white/55">{t.reassurance}</p>
        </Reveal>
      </div>
    </section>
  );
}
