import { ArrowRight, Play, Check } from 'lucide-react';
import { content } from '@/locales/content';
import { GREEN, BG, cn, CONTAINER } from './shared';

function DashboardMockup({ t }: { t: typeof content.en.hero.mockup; isAr: boolean }) {
  const bars = [42, 60, 48, 72, 58, 88, 70];
  return (
    <div className="relative w-full max-w-[460px] mx-auto" dir="ltr" aria-hidden="true">
      {/* Main dashboard panel — rendered immediately (no entrance animation) */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, rgba(20,27,46,0.95), rgba(10,15,30,0.95))',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
        }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg flex items-center justify-center font-black text-[11px]" style={{ background: GREEN, color: BG }}>Q</span>
            <span className="text-sm font-semibold text-white">{t.dashboard}</span>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.12)', color: GREEN }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: GREEN }} />
            {t.live}
          </span>
        </div>

        <div className="p-4 space-y-3">
          {/* Revenue card with chart */}
          <div className="rounded-xl p-3.5" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.16)' }}>
            <div className="flex items-end justify-between mb-3">
              <div>
                <div className="text-[11px] text-white/45">{t.revenue}</div>
                <div className="text-xl font-bold text-white">$48,200</div>
                <div className="text-[11px] font-medium" style={{ color: GREEN }}>{t.revenueDelta}</div>
              </div>
            </div>
            <div className="flex items-end gap-1.5 h-14">
              {bars.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm"
                  style={{ height: `${h}%`, background: i === 5 ? GREEN : 'rgba(34,197,94,0.35)' }}
                />
              ))}
            </div>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: t.members, val: '1,284' },
              { label: t.checkins, val: '312' },
              { label: t.attendance, val: '86%' },
            ].map((k) => (
              <div key={k.label} className="rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-base font-bold text-white leading-tight">{k.val}</div>
                <div className="text-[10px] text-white/45 leading-tight mt-0.5">{k.label}</div>
              </div>
            ))}
          </div>

          {/* Nutrition macros */}
          <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-[11px] text-white/45 mb-2">{t.macros}</div>
            <div className="space-y-2">
              {[
                { label: t.protein, pct: 78, color: GREEN },
                { label: t.carbs, pct: 62, color: '#3B82F6' },
                { label: t.fat, pct: 45, color: '#F59E0B' },
              ].map((m) => (
                <div key={m.label} className="flex items-center gap-2">
                  <span className="text-[10px] text-white/55 w-14">{m.label}</span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-white/8">
                    <div className="h-full rounded-full" style={{ width: `${m.pct}%`, background: m.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating mini app card */}
      <div
        className="absolute -bottom-6 -right-3 sm:-right-8 w-40 rounded-2xl p-3 hidden sm:block"
        style={{
          background: 'linear-gradient(160deg, #141b2e, #0a0f1e)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 24px 50px rgba(0,0,0,0.5)',
        }}
      >
        <div className="text-[10px] font-semibold text-white/70 mb-2">{t.appTitle}</div>
        <div className="rounded-lg p-2 mb-2" style={{ background: 'rgba(34,197,94,0.1)' }}>
          <div className="text-[10px] font-medium" style={{ color: GREEN }}>{t.workout}</div>
          <div className="text-[9px] text-white/50">{t.workoutMeta}</div>
        </div>
        <div className="flex items-center gap-1.5 text-[9px] text-white/55">
          <Check className="w-3 h-3" style={{ color: GREEN }} />
          {t.appCheckin}
        </div>
      </div>
    </div>
  );
}

export function Hero({
  t,
  isAr,
  onCTA,
}: {
  t: typeof content.en.hero;
  isAr: boolean;
  onCTA: () => void;
}) {
  return (
    <section id="top" className="relative pt-28 sm:pt-32 pb-20 sm:pb-28 overflow-hidden">
      {/* Background glows — lighter + smaller area to reduce above-the-fold paint cost */}
      <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-1/4 left-1/4 w-[38vw] h-[38vw] rounded-full blur-3xl opacity-[0.12]" style={{ background: `radial-gradient(circle, ${GREEN}, transparent 70%)` }} />
        <div className="absolute top-1/3 -right-1/4 w-[30vw] h-[30vw] rounded-full blur-3xl opacity-[0.07]" style={{ background: 'radial-gradient(circle, #3B82F6, transparent 70%)' }} />
      </div>

      <div className={cn(CONTAINER, 'grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-10 items-center')}>
        <div className={cn('space-y-7', isAr ? 'lg:text-right' : 'lg:text-left', 'text-center lg:text-start')}>
          <span
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold"
            style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: GREEN }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: GREEN }} />
            {t.badge}
          </span>

          <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-black leading-[1.07] tracking-tight text-white">
            {t.title}
          </h1>

          <p className="text-base sm:text-lg text-white/55 leading-relaxed max-w-xl mx-auto lg:mx-0">
            {t.sub}
          </p>

          <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
            <button
              onClick={onCTA}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-base transition-all hover:brightness-105 hover:scale-[1.02] active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1E]"
              style={{ background: GREEN, color: BG, boxShadow: '0 0 35px rgba(34,197,94,0.38)' }}
            >
              {t.ctaPrimary}
              <ArrowRight className={cn('w-5 h-5', isAr && 'rotate-180')} />
            </button>
            <a
              href="#features"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-base text-white/75 hover:text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <Play className="w-4 h-4" />
              {t.ctaSecondary}
            </a>
          </div>

          <p className="text-sm text-white/55 max-w-md mx-auto lg:mx-0">
            {t.trust}
          </p>
        </div>

        <div className="relative">
          <DashboardMockup t={t.mockup} isAr={isAr} />
        </div>
      </div>
    </section>
  );
}
