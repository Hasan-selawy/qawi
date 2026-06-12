import { useRef, useEffect, useState } from 'react';
import { motion, useInView, useAnimation, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/hooks/useLanguage';
import { content } from '@/locales/content';

const GREEN = '#22C55E';
const BG = '#0A0F1E';

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}

function fadeUp(delay = 0) {
  return {
    hidden: { opacity: 0, y: 32 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] } },
  };
}

function Counter({ target, suffix = '' }: { target: number | string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (typeof target === 'string') return;
    let start = 0;
    const step = Math.ceil(target / 40);
    const id = setInterval(() => {
      start = Math.min(start + step, target);
      setVal(start);
      if (start >= target) clearInterval(id);
    }, 30);
    return () => clearInterval(id);
  }, [inView, target]);

  return (
    <span ref={ref}>
      {typeof target === 'string' ? target : val}
      {suffix}
    </span>
  );
}

// ── Animated mesh background ───────────────────────────────────────────────
function MeshBg() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute -top-1/4 -left-1/4 w-[80vw] h-[80vw] rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #22C55E 0%, transparent 70%)' }}
      />
      <div
        className="absolute -bottom-1/4 -right-1/4 w-[60vw] h-[60vw] rounded-full opacity-10 blur-3xl"
        style={{ background: 'radial-gradient(circle, #3B82F6 0%, transparent 70%)' }}
      />
      <svg
        className="absolute inset-0 w-full h-full opacity-5"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>
  );
}

// ── Floating phone mock ────────────────────────────────────────────────────
function PhoneMock({ isAr }: { isAr: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotateY: -15 }}
      animate={{ opacity: 1, y: 0, rotateY: 0 }}
      transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto"
      style={{ perspective: '800px' }}
    >
      <motion.div
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="relative"
      >
        <div
          className="w-52 h-96 mx-auto rounded-[2.5rem] border-4 overflow-hidden shadow-2xl"
          style={{
            borderColor: 'rgba(255,255,255,0.15)',
            background: 'linear-gradient(160deg, #111827 0%, #0A0F1E 100%)',
            boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 40px rgba(34,197,94,0.15)`,
          }}
        >
          <div className="h-6 bg-black/40 flex items-center justify-center">
            <div className="w-16 h-1.5 rounded-full bg-white/10" />
          </div>
          <div className="p-3 space-y-2">
            <div className="rounded-xl p-3 space-y-2" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <div className="text-xs text-green-400 font-semibold">{isAr ? 'خطة اليوم' : "Today's Plan"}</div>
              <div className="flex justify-between text-xs text-white/60">
                <span>{isAr ? 'سعرات' : 'Calories'}</span><span className="text-green-400">1,840</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full w-3/4 rounded-full" style={{ background: GREEN }} />
              </div>
            </div>
            {[
              { icon: '💪', label: isAr ? 'خطة التمرين' : 'Workout Plan', sub: isAr ? '٥ تمارين اليوم' : '5 exercises today' },
              { icon: '🥗', label: isAr ? 'الوجبة القادمة' : 'Next Meal', sub: isAr ? 'فراخ مشوية + سلطة' : 'Grilled chicken + salad' },
              { icon: '✅', label: isAr ? 'حضور مسجّل' : 'Check-in done', sub: isAr ? 'قبل ٣ دقائق' : '3 min ago' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <span className="text-base">{item.icon}</span>
                <div className="min-w-0">
                  <div className="text-xs text-white font-medium truncate">{item.label}</div>
                  <div className="text-xs text-white/40 truncate">{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div
          className="absolute -inset-1 rounded-[2.8rem] -z-10 blur-xl opacity-30"
          style={{ background: `radial-gradient(circle, ${GREEN}, transparent)` }}
        />
      </motion.div>
    </motion.div>
  );
}

// ── Marquee ────────────────────────────────────────────────────────────────
function Marquee({ items, reverse = false }: { items: string[]; reverse?: boolean }) {
  const doubled = [...items, ...items];
  return (
    <div className="overflow-hidden whitespace-nowrap">
      <motion.div
        className="inline-flex gap-6"
        animate={{ x: reverse ? ['0%', '50%'] : ['0%', '-50%'] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      >
        {doubled.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium"
            style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: 'rgba(255,255,255,0.8)' }}
          >
            <span style={{ color: GREEN }}>✦</span>
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

// ── Animated section wrapper ───────────────────────────────────────────────
function Section({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const ctrl = useAnimation();
  useEffect(() => { if (inView) ctrl.start('visible'); }, [inView, ctrl]);
  return (
    <motion.section
      ref={ref}
      initial="hidden"
      animate={ctrl}
      className={className}
    >
      {children}
    </motion.section>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────
function Navbar({ t, isAr, toggle }: { t: typeof content.en.nav; isAr: boolean; toggle: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  return (
    <nav
      className={cn(
        'fixed top-0 inset-x-0 z-50 transition-all duration-300',
        scrolled ? 'backdrop-blur-xl border-b' : ''
      )}
      style={scrolled ? { background: 'rgba(10,15,30,0.85)', borderColor: 'rgba(255,255,255,0.06)' } : {}}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm" style={{ background: GREEN, color: BG }}>Q</div>
          <span className="font-bold text-white text-lg">Qawi</span>
        </div>

        <div className="hidden md:flex items-center gap-6 text-sm text-white/60">
          <a href="#features" className="hover:text-white transition-colors">{t.features}</a>
          <a href="#stats" className="hover:text-white transition-colors">{t.pricing}</a>
          <a href="#testimonials" className="hover:text-white transition-colors">{t.about}</a>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}
          >
            {isAr ? 'EN' : 'عربي'}
          </button>
          <a
            href="/register"
            className="hidden sm:inline-flex px-4 py-1.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
            style={{ background: GREEN, color: BG }}
          >
            {t.getStarted}
          </a>
        </div>
      </div>
    </nav>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────
function Hero({ t, isAr }: { t: typeof content.en.hero; isAr: boolean }) {
  return (
    <section className="relative min-h-screen flex items-center pt-20 pb-32 overflow-hidden px-4">
      <MeshBg />
      <div className="relative max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div className={cn('space-y-7', isAr && 'text-right')}>
          <motion.div variants={fadeUp(0)} initial="hidden" animate="visible">
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium"
              style={{ background: 'rgba(34,197,94,0.12)', color: GREEN, border: '1px solid rgba(34,197,94,0.25)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: GREEN }} />
              {t.badge}
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp(0.1)}
            initial="hidden"
            animate="visible"
            className="text-5xl sm:text-6xl font-extrabold leading-tight text-white"
            style={{ fontFamily: isAr ? 'system-ui' : 'inherit' }}
          >
            {t.headline.split('\n').map((line, i) => (
              <span key={i}>
                {i === 1 ? <span style={{ color: GREEN }}>{line}</span> : line}
                {i === 0 && <br />}
              </span>
            ))}
          </motion.h1>

          <motion.p
            variants={fadeUp(0.2)}
            initial="hidden"
            animate="visible"
            className="text-lg text-white/60 leading-relaxed max-w-lg"
          >
            {t.sub}
          </motion.p>

          <motion.div
            variants={fadeUp(0.3)}
            initial="hidden"
            animate="visible"
            className="flex flex-wrap gap-3"
          >
            <a
              href="/register"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-base transition-all hover:scale-[1.03] active:scale-95 shadow-lg"
              style={{ background: GREEN, color: BG, boxShadow: `0 0 30px rgba(34,197,94,0.35)` }}
            >
              {t.cta}
              <span>→</span>
            </a>
            <a
              href="#features"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-base text-white/70 hover:text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              ▶ {t.demo}
            </a>
          </motion.div>

          <motion.p
            variants={fadeUp(0.4)}
            initial="hidden"
            animate="visible"
            className="text-sm text-white/30"
          >
            {t.trusted}
          </motion.p>
        </div>

        <div className="flex justify-center lg:justify-end">
          <PhoneMock isAr={isAr} />
        </div>
      </div>
    </section>
  );
}

// ── Features bento ────────────────────────────────────────────────────────
function Features({ t, isAr }: { t: typeof content.en.features; isAr: boolean }) {
  return (
    <Section id="features" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div variants={fadeUp(0)} className={cn('mb-14 space-y-3', isAr ? 'text-right' : 'text-center')}>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">{t.heading}</h2>
          <p className="text-white/50 text-lg">{t.sub}</p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {t.cards.map((card, i) => (
            <motion.div
              key={card.title}
              variants={fadeUp(i * 0.07)}
              className="relative rounded-2xl p-6 space-y-3 group cursor-default overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              whileHover={{ scale: 1.02, borderColor: 'rgba(34,197,94,0.3)' }}
              transition={{ duration: 0.2 }}
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: 'radial-gradient(circle at 30% 30%, rgba(34,197,94,0.06) 0%, transparent 70%)' }}
              />
              <div className="text-3xl">{card.icon}</div>
              <div className={cn('flex items-start justify-between gap-2', isAr && 'flex-row-reverse')}>
                <h3 className="font-bold text-white text-lg leading-tight">{card.title}</h3>
                {card.tag && (
                  <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(34,197,94,0.15)', color: GREEN }}>
                    {card.tag}
                  </span>
                )}
              </div>
              <p className={cn('text-sm text-white/50 leading-relaxed', isAr && 'text-right')}>{card.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ── Showcase ──────────────────────────────────────────────────────────────
function Showcase({ t, isAr }: { t: typeof content.en.showcase; isAr: boolean }) {
  const [active, setActive] = useState(0);
  const activeRole = t.roles[active];

  return (
    <Section className="py-24 px-4 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <motion.div variants={fadeUp(0)} className={cn('mb-14 space-y-3', isAr ? 'text-right' : 'text-center')}>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">{t.heading}</h2>
          <p className="text-white/50 text-lg">{t.sub}</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-3">
            {t.roles.map((role, i) => (
              <motion.button
                key={role.label}
                variants={fadeUp(i * 0.08)}
                onClick={() => setActive(i)}
                className={cn(
                  'w-full text-left rounded-xl px-5 py-4 transition-all',
                  active === i ? 'ring-1' : 'opacity-60 hover:opacity-80'
                )}
                style={active === i
                  ? { background: 'rgba(34,197,94,0.08)', borderColor: GREEN, ringColor: GREEN, border: '1px solid rgba(34,197,94,0.3)' }
                  : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className={cn('flex items-center gap-2', isAr && 'flex-row-reverse text-right')}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: active === i ? GREEN : 'rgba(255,255,255,0.2)' }} />
                  <div>
                    <div className="font-semibold text-white">{role.label}</div>
                    <div className="text-sm text-white/40">{role.desc}</div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, x: isAr ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isAr ? 20 : -20 }}
              transition={{ duration: 0.3 }}
              className="rounded-2xl p-8 space-y-4 relative overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(34,197,94,0.15)' }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20" style={{ background: GREEN }} />
              <div className="relative text-2xl font-bold text-white">{activeRole.label}</div>
              <div className="relative space-y-2">
                {activeRole.desc.split(',').map((item) => (
                  <div key={item} className={cn('flex items-center gap-2 text-white/60', isAr && 'flex-row-reverse')}>
                    <span style={{ color: GREEN }}>✓</span>
                    <span className="text-sm">{item.trim()}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </Section>
  );
}

// ── Stats ─────────────────────────────────────────────────────────────────
function Stats({ t, isAr }: { t: typeof content.en.stats; isAr: boolean }) {
  return (
    <Section id="stats" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div variants={fadeUp(0)} className={cn('mb-12 text-center space-y-2', isAr && 'text-right')}>
          <h2 className="text-3xl font-extrabold text-white">{t.heading}</h2>
        </motion.div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {t.items.map((item, i) => (
            <motion.div
              key={item.label}
              variants={fadeUp(i * 0.1)}
              className="rounded-2xl p-6 text-center space-y-2"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="text-4xl font-extrabold" style={{ color: GREEN }}>
                <Counter target={item.value} />
              </div>
              <div className="text-sm text-white/50">{item.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ── Testimonials ──────────────────────────────────────────────────────────
function Testimonials({ t, isAr }: { t: typeof content.en.testimonials; isAr: boolean }) {
  return (
    <Section id="testimonials" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div variants={fadeUp(0)} className={cn('mb-14 text-center space-y-2', isAr && 'text-right')}>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">{t.heading}</h2>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {t.items.map((item, i) => (
            <motion.div
              key={item.name}
              variants={fadeUp(i * 0.1)}
              className="rounded-2xl p-6 space-y-4 relative overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="text-white/50 text-3xl leading-none">"</div>
              <p className={cn('text-white/70 text-sm leading-relaxed', isAr && 'text-right')}>{item.text}</p>
              <div className={cn('flex items-center gap-3 pt-2', isAr && 'flex-row-reverse')}>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0"
                  style={{ background: 'rgba(34,197,94,0.15)', color: GREEN }}
                >
                  {item.avatar}
                </div>
                <div className={isAr ? 'text-right' : ''}>
                  <div className="text-white font-semibold text-sm">{item.name}</div>
                  <div className="text-white/40 text-xs">{item.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ── CTA ───────────────────────────────────────────────────────────────────
function CTA({ t, isAr }: { t: typeof content.en.cta; isAr: boolean }) {
  return (
    <Section className="py-24 px-4">
      <div className="max-w-3xl mx-auto text-center space-y-6 relative">
        <div
          className="absolute inset-0 -z-10 rounded-3xl blur-3xl opacity-20"
          style={{ background: `radial-gradient(circle, ${GREEN}, transparent)` }}
        />
        <motion.div variants={fadeUp(0)} className={isAr ? 'text-right' : ''}>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight">{t.heading}</h2>
        </motion.div>
        <motion.p variants={fadeUp(0.1)} className="text-white/50 text-lg">{t.sub}</motion.p>
        <motion.div variants={fadeUp(0.2)} className="flex flex-col items-center gap-3">
          <a
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-lg transition-all hover:scale-[1.04] active:scale-95 shadow-xl"
            style={{ background: GREEN, color: BG, boxShadow: `0 0 50px rgba(34,197,94,0.4)` }}
          >
            {t.button} →
          </a>
          <p className="text-white/30 text-sm">{t.note}</p>
        </motion.div>
      </div>
    </Section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────
function Footer({ t, isAr }: { t: typeof content.en.footer; isAr: boolean }) {
  return (
    <footer
      className="py-12 px-4 border-t"
      style={{ borderColor: 'rgba(255,255,255,0.06)' }}
    >
      <div className="max-w-6xl mx-auto">
        <div className={cn('flex flex-col md:flex-row items-center justify-between gap-6', isAr && 'md:flex-row-reverse')}>
          <div className={cn('flex items-center gap-2', isAr && 'flex-row-reverse')}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm" style={{ background: GREEN, color: BG }}>Q</div>
            <span className="font-bold text-white">Qawi</span>
            <span className="text-white/30 text-sm mx-2">—</span>
            <span className="text-white/40 text-sm">{t.tagline}</span>
          </div>
          <div className="flex items-center gap-6">
            {t.links.map((l) => (
              <a key={l} href="#" className="text-sm text-white/40 hover:text-white/70 transition-colors">{l}</a>
            ))}
          </div>
        </div>
        <div className={cn('mt-8 text-white/20 text-xs', isAr ? 'text-right' : 'text-center')}>
          {t.rights}
        </div>
      </div>
    </footer>
  );
}

// ── Main export ────────────────────────────────────────────────────────────
export default function Marketing() {
  const { lang, toggle, isAr } = useLanguage();
  const t = content[lang];

  useEffect(() => {
    document.documentElement.style.background = BG;
    document.body.style.background = BG;
  }, []);

  return (
    <div className="min-h-screen text-white" style={{ background: BG }}>
      <Navbar t={t.nav} isAr={isAr} toggle={toggle} />
      <Hero t={t.hero} isAr={isAr} />

      <div className="py-4 space-y-3">
        <Marquee items={t.marquee.items} />
        <Marquee items={t.marquee.items} reverse />
      </div>

      <Features t={t.features} isAr={isAr} />
      <Showcase t={t.showcase} isAr={isAr} />
      <Stats t={t.stats} isAr={isAr} />
      <Testimonials t={t.testimonials} isAr={isAr} />
      <CTA t={t.cta} isAr={isAr} />
      <Footer t={t.footer} isAr={isAr} />
    </div>
  );
}
