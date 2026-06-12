import {
  useRef, useEffect, useState, useCallback,
} from 'react';
import {
  motion, useInView, useAnimation, AnimatePresence,
  useScroll, useTransform, useMotionValue, useSpring,
} from 'framer-motion';
import { useLanguage } from '@/hooks/useLanguage';
import { content } from '@/locales/content';

const GREEN = '#22C55E';
const BG = '#0A0F1E';

// ─── Utilities ──────────────────────────────────────────────────────────────

function cn(...cls: (string | undefined | false)[]) {
  return cls.filter(Boolean).join(' ');
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(() =>
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

function parseStatValue(raw: string): { prefix: string; num: number; suffix: string } | { display: string } {
  const s = raw.trim();
  const m = s.match(/^([^0-9]*)(\d+)([^0-9]*)$/);
  if (m) return { prefix: m[1], num: parseInt(m[2], 10), suffix: m[3] };
  return { display: s };
}

function fadeUp(delay = 0) {
  return {
    hidden: { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] } },
  };
}

// ─── Section Wrapper ─────────────────────────────────────────────────────────

function Section({
  children, className = '', id,
}: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const ctrl = useAnimation();
  useEffect(() => { if (inView) ctrl.start('visible'); }, [inView, ctrl]);
  return (
    <motion.section ref={ref} id={id} initial="hidden" animate={ctrl} className={className}>
      {children}
    </motion.section>
  );
}

// ─── Canvas Particle Field ────────────────────────────────────────────────────

function ParticleField({ reduced }: { reduced: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    const W = () => canvas.offsetWidth;
    const H = () => canvas.offsetHeight;

    const particles = Array.from({ length: 65 }, () => ({
      x: Math.random() * W(),
      y: Math.random() * H(),
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.6 + 0.4,
      a: Math.random() * 0.45 + 0.08,
    }));

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, W(), H());
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W(); if (p.x > W()) p.x = 0;
        if (p.y < 0) p.y = H(); if (p.y > H()) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(34,197,94,${p.a})`;
        ctx.fill();
      }
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 110) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(34,197,94,${0.07 * (1 - d / 110)})`;
            ctx.lineWidth = 0.6;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [reduced]);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-60" />;
}

// ─── Word-by-Word Reveal ──────────────────────────────────────────────────────

function WordReveal({ text, delay = 0, className = '' }: { text: string; delay?: number; className?: string }) {
  return (
    <span className={cn('inline', className)}>
      {text.split(' ').map((word, i) => (
        <motion.span
          key={i}
          variants={fadeUp(delay + i * 0.06)}
          className="inline-block"
          style={{ marginInlineEnd: '0.28em' }}
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}

// ─── Typing Text ──────────────────────────────────────────────────────────────

function TypingText({ text, reduced }: { text: string; reduced: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [shown, setShown] = useState(reduced ? text : '');
  useEffect(() => {
    if (reduced) { setShown(text); return; }
    if (!inView) return;
    let i = 0;
    const id = setInterval(() => {
      setShown(text.slice(0, ++i));
      if (i >= text.length) clearInterval(id);
    }, 22);
    return () => clearInterval(id);
  }, [inView, text, reduced]);
  return (
    <span ref={ref} className="text-white/50 text-lg">
      {shown}
      {!reduced && shown.length < text.length && (
        <span className="inline-block w-0.5 h-5 bg-green-400 ml-0.5 animate-pulse align-middle" />
      )}
    </span>
  );
}

// ─── Sparkles ────────────────────────────────────────────────────────────────

const STAR_SVG = (
  <svg viewBox="0 0 10 10" fill="#22C55E" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 0 L5.8 3.8 L10 5 L5.8 6.2 L5 10 L4.2 6.2 L0 5 L4.2 3.8 Z" />
  </svg>
);
const SPARKLE_POS = [
  { top: '-14px', left: '15%' }, { top: '-10px', right: '20%' },
  { top: '40%', right: '-14px' }, { bottom: '-14px', right: '18%' },
  { bottom: '-10px', left: '22%' }, { top: '40%', left: '-14px' },
  { top: '5%', left: '2%' }, { bottom: '5%', right: '2%' },
];

function Sparkles({ reduced }: { reduced: boolean }) {
  if (reduced) return null;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {SPARKLE_POS.map((pos, i) => (
        <motion.div
          key={i}
          className="absolute w-3 h-3"
          style={pos}
          animate={{ scale: [0, 1.2, 0], opacity: [0, 1, 0], rotate: [0, 180] }}
          transition={{ duration: 2.2, delay: i * 0.28, repeat: Infinity, ease: 'easeInOut' }}
        >
          {STAR_SVG}
        </motion.div>
      ))}
    </div>
  );
}

// ─── Animated Stat Counter ───────────────────────────────────────────────────

function AnimatedStat({ raw, reduced }: { raw: string; reduced: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const parsed = parseStatValue(raw);
  const hasNum = 'num' in parsed;
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!hasNum) return;
    if (reduced || !inView) { setVal(parsed.num); return; }
    let cur = 0;
    const target = parsed.num;
    const step = Math.max(1, Math.ceil(target / 45));
    const id = setInterval(() => {
      cur = Math.min(cur + step, target);
      setVal(cur);
      if (cur >= target) clearInterval(id);
    }, 28);
    return () => clearInterval(id);
  }, [inView, hasNum, reduced]);

  return (
    <div ref={ref} className="text-4xl sm:text-5xl font-extrabold tabular-nums" style={{ color: GREEN }}>
      {hasNum ? `${parsed.prefix}${val}${parsed.suffix}` : parsed.display}
    </div>
  );
}

// ─── 3-D Tilt Card ───────────────────────────────────────────────────────────

function TiltCard({ children, reduced }: { children: React.ReactNode; reduced: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0); const ry = useMotionValue(0);
  const sx = useSpring(rx, { stiffness: 160, damping: 22 });
  const sy = useSpring(ry, { stiffness: 160, damping: 22 });

  const onMove = useCallback((e: React.MouseEvent) => {
    if (reduced || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    rx.set(((e.clientY - r.top) / r.height - 0.5) * -14);
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 14);
  }, [reduced, rx, ry]);

  const onLeave = useCallback(() => { rx.set(0); ry.set(0); }, [rx, ry]);

  return (
    <motion.div
      ref={ref}
      style={{ rotateX: sx, rotateY: sy, transformPerspective: 900 }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="cursor-default h-full"
    >
      {children}
    </motion.div>
  );
}

// ─── Marquee ─────────────────────────────────────────────────────────────────

function Marquee({ items, reverse = false, reduced }: { items: string[]; reverse?: boolean; reduced: boolean }) {
  const doubled = [...items, ...items];
  return (
    <div className="overflow-hidden whitespace-nowrap select-none">
      <motion.div
        className="inline-flex gap-4"
        animate={reduced ? {} : { x: reverse ? ['0%', '50%'] : ['0%', '-50%'] }}
        transition={{ duration: 32, repeat: Infinity, ease: 'linear' }}
      >
        {doubled.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium flex-shrink-0"
            style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.18)', color: 'rgba(255,255,255,0.75)' }}
          >
            <span style={{ color: GREEN }}>✦</span>{item}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

// ─── Get Early Access Modal ───────────────────────────────────────────────────

interface FormState { name: string; email: string; phone: string; gym: string; city: string; }

function GetAccessModal({
  open, onClose, t, isAr,
}: {
  open: boolean; onClose: () => void;
  t: typeof content.en.modal; isAr: boolean;
}) {
  const [form, setForm] = useState<FormState>({ name: '', email: '', phone: '', gym: '', city: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1100));
    setSubmitted(true);
    setSubmitting(false);
  };

  useEffect(() => {
    if (!open) {
      const id = setTimeout(() => { setSubmitted(false); setForm({ name: '', email: '', phone: '', gym: '', city: '' }); }, 350);
      return () => clearTimeout(id);
    }
  }, [open]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);

  const inputCls = cn(
    'w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all',
    'focus:ring-1 focus:ring-green-500',
    isAr && 'text-right',
  );
  const inputStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-md"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Dialog */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              className="w-full max-w-md relative pointer-events-auto"
              initial={{ opacity: 0, scale: 0.88, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 24 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            >
              {/* Glow border */}
              <div className="absolute -inset-px rounded-2xl pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.4), transparent, rgba(34,197,94,0.2))', borderRadius: 'inherit' }} />

              <div className="relative rounded-2xl p-7" style={{ background: '#0f172a', border: '1px solid rgba(34,197,94,0.2)' }}>
                {/* Close */}
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="absolute top-4 end-4 w-8 h-8 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors text-lg leading-none"
                >
                  ✕
                </button>

                <AnimatePresence mode="wait">
                  {submitted ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                      className="text-center py-6 space-y-4"
                    >
                      <motion.div
                        className="text-6xl"
                        animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.6 }}
                      >🎉</motion.div>
                      <h3 className="text-2xl font-bold text-white">{t.success}</h3>
                      <p className="text-white/50 text-sm leading-relaxed">{t.successSub}</p>
                      <button
                        onClick={onClose}
                        className="mt-2 px-7 py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
                        style={{ background: GREEN, color: BG }}
                      >{t.close}</button>
                    </motion.div>
                  ) : (
                    <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <div className={cn('mb-6', isAr && 'text-right')}>
                        <div className="inline-flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm" style={{ background: GREEN, color: BG }}>Q</div>
                          <span className="text-white/40 text-sm">Qawi</span>
                        </div>
                        <h3 className="text-2xl font-bold text-white">{t.title}</h3>
                        <p className="text-white/45 text-sm mt-1">{t.sub}</p>
                      </div>

                      <form onSubmit={handleSubmit} className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <label className={cn('block text-xs text-white/50 mb-1.5', isAr && 'text-right')}>{t.name}</label>
                            <input required value={form.name} onChange={set('name')} placeholder={t.namePh} className={inputCls} style={inputStyle} />
                          </div>
                          <div className="col-span-2">
                            <label className={cn('block text-xs text-white/50 mb-1.5', isAr && 'text-right')}>{t.email}</label>
                            <input required type="email" value={form.email} onChange={set('email')} placeholder={t.emailPh} className={inputCls} style={inputStyle} />
                          </div>
                          <div>
                            <label className={cn('block text-xs text-white/50 mb-1.5', isAr && 'text-right')}>{t.gym}</label>
                            <input required value={form.gym} onChange={set('gym')} placeholder={t.gymPh} className={inputCls} style={inputStyle} />
                          </div>
                          <div>
                            <label className={cn('block text-xs text-white/50 mb-1.5', isAr && 'text-right')}>{t.phone}</label>
                            <input type="tel" value={form.phone} onChange={set('phone')} placeholder={t.phonePh} className={inputCls} style={inputStyle} />
                          </div>
                          <div className="col-span-2">
                            <label className={cn('block text-xs text-white/50 mb-1.5', isAr && 'text-right')}>{t.city}</label>
                            <input value={form.city} onChange={set('city')} placeholder={t.cityPh} className={inputCls} style={inputStyle} />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={submitting}
                          className="w-full py-3.5 rounded-xl font-bold text-sm mt-2 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                          style={{ background: GREEN, color: BG, boxShadow: `0 0 28px rgba(34,197,94,0.3)` }}
                        >
                          {submitting ? (
                            <span className="flex items-center justify-center gap-2">
                              <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                              {t.submitting}
                            </span>
                          ) : t.submit}
                        </button>

                        <p className="text-center text-xs text-white/25 pt-1">
                          {isAr ? 'لن نشاركك بريانات مع أطراف ثالثة' : 'We never share your info with third parties.'}
                        </p>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar({ t, isAr, toggle, onCTA }: {
  t: typeof content.en.nav; isAr: boolean; toggle: () => void; onCTA: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  return (
    <nav
      aria-label="Main navigation"
      className={cn('fixed top-0 inset-x-0 z-50 transition-all duration-300')}
      style={scrolled ? { background: 'rgba(10,15,30,0.88)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' } : {}}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <a href="#" aria-label="Qawi home" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm" style={{ background: GREEN, color: BG }}>Q</div>
          <span className="font-bold text-white text-lg tracking-tight">Qawi</span>
        </a>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-7 text-sm text-white/55">
          <a href="#features" className="hover:text-white transition-colors">{t.features}</a>
          <a href="#stats" className="hover:text-white transition-colors">{t.pricing}</a>
          <a href="#testimonials" className="hover:text-white transition-colors">{t.about}</a>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={toggle}
            aria-label="Switch language"
            className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors hover:bg-white/10"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)' }}
          >
            {isAr ? 'EN' : 'عربي'}
          </button>
          <button
            onClick={onCTA}
            className="hidden sm:inline-flex px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
            style={{ background: GREEN, color: BG, boxShadow: `0 0 20px rgba(34,197,94,0.25)` }}
          >
            {t.getStarted}
          </button>
        </div>
      </div>
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function PhoneMockup({ isAr }: { isAr: boolean }) {
  return (
    <motion.div
      animate={{ y: [0, -14, 0] }}
      transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
      className="relative w-52 h-[22rem] mx-auto"
    >
      <div
        className="w-full h-full rounded-[2.5rem] overflow-hidden border-4"
        style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'linear-gradient(160deg,#111827 0%,#0A0F1E 100%)', boxShadow: `0 40px 80px rgba(0,0,0,0.6), 0 0 50px rgba(34,197,94,0.12)` }}
      >
        <div className="h-5 bg-black/40 flex items-center justify-center">
          <div className="w-14 h-1 rounded-full bg-white/10" />
        </div>
        <div className="p-3 space-y-2">
          <div className="rounded-xl p-2.5 space-y-1.5" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <div className="text-xs font-semibold" style={{ color: GREEN }}>{isAr ? 'خطة اليوم' : "Today's Plan"}</div>
            <div className="flex justify-between text-xs text-white/55">
              <span>{isAr ? 'سعرات' : 'Calories'}</span><span style={{ color: GREEN }}>1,840</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full w-3/4 rounded-full" style={{ background: GREEN }} />
            </div>
          </div>
          {[
            { icon: '💪', a: isAr ? 'خطة التمرين' : 'Workout Plan', b: isAr ? '٥ تمارين' : '5 exercises' },
            { icon: '🥗', a: isAr ? 'الوجبة القادمة' : 'Next Meal', b: isAr ? 'فراخ مشوية' : 'Grilled chicken' },
            { icon: '✅', a: isAr ? 'حضور مسجّل' : 'Checked In', b: isAr ? 'قبل ٣ دقائق' : '3 min ago' },
            { icon: '📊', a: isAr ? 'التقدم' : 'Progress', b: isAr ? '+٢ كغ هذا الشهر' : '+2kg this month' },
          ].map(item => (
            <div key={item.a} className="flex items-center gap-2 rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <span className="text-sm">{item.icon}</span>
              <div className="min-w-0">
                <div className="text-xs text-white font-medium truncate">{item.a}</div>
                <div className="text-xs text-white/35 truncate">{item.b}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute -inset-1 rounded-[2.8rem] -z-10 blur-2xl opacity-25" style={{ background: `radial-gradient(circle,${GREEN},transparent)` }} />
    </motion.div>
  );
}

function Hero({ t, isAr, onCTA, reduced }: {
  t: typeof content.en.hero; isAr: boolean; onCTA: () => void; reduced: boolean;
}) {
  return (
    <section className="relative min-h-screen flex items-center pt-20 pb-28 overflow-hidden px-4">
      <ParticleField reduced={reduced} />
      {/* Radial glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/4 -left-1/4 w-[80vw] h-[80vw] rounded-full opacity-15 blur-3xl" style={{ background: 'radial-gradient(circle,#22C55E,transparent 70%)' }} />
        <div className="absolute -bottom-1/4 -right-1/4 w-[60vw] h-[60vw] rounded-full opacity-8 blur-3xl" style={{ background: 'radial-gradient(circle,#3B82F6,transparent 70%)' }} />
      </div>

      <div className="relative max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
        <div className={cn('space-y-7', isAr && 'text-right')}>
          {/* Badge */}
          <motion.div variants={fadeUp(0)} initial="hidden" animate="visible">
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold"
              style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: GREEN }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: GREEN }} />
              {t.badge}
            </span>
          </motion.div>

          {/* Headline with word-by-word reveal */}
          <motion.h1
            initial="hidden"
            animate="visible"
            className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.08] text-white"
          >
            <WordReveal text={t.line1} delay={0.08} />
            <br />
            <WordReveal text={t.line2} delay={0.22} className="shimmer-text" />
          </motion.h1>

          <motion.p variants={fadeUp(0.35)} initial="hidden" animate="visible" className="text-base sm:text-lg text-white/55 leading-relaxed max-w-lg">
            {t.sub}
          </motion.p>

          <motion.div variants={fadeUp(0.45)} initial="hidden" animate="visible" className="flex flex-wrap gap-3">
            <button
              onClick={onCTA}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-base transition-all hover:scale-[1.03] active:scale-95"
              style={{ background: GREEN, color: BG, boxShadow: `0 0 35px rgba(34,197,94,0.38)` }}
            >
              {t.cta} <span aria-hidden>→</span>
            </button>
            <a
              href="#features"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-base text-white/65 hover:text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              ▶ {t.demo}
            </a>
          </motion.div>

          <motion.p variants={fadeUp(0.55)} initial="hidden" animate="visible" className="text-sm text-white/28">
            {t.trusted}
          </motion.p>
        </div>

        <div className="flex justify-center lg:justify-end">
          <motion.div
            initial={{ opacity: 0, y: 40, rotateY: isAr ? 15 : -15 }}
            animate={{ opacity: 1, y: 0, rotateY: 0 }}
            transition={{ duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{ perspective: '900px' }}
          >
            <PhoneMockup isAr={isAr} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─── Features Bento ──────────────────────────────────────────────────────────

function Features({ t, isAr }: { t: typeof content.en.features; isAr: boolean }) {
  return (
    <Section id="features" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div variants={fadeUp(0)} className={cn('mb-14 space-y-3', isAr ? 'text-right' : 'text-center')}>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">{t.heading}</h2>
          <p className="text-white/48 text-lg max-w-2xl mx-auto">{t.sub}</p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {t.cards.map((card, i) => (
            <motion.article
              key={card.title}
              variants={fadeUp(i * 0.07)}
              className="relative rounded-2xl p-6 space-y-3 group overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              whileHover={{ scale: 1.025, borderColor: 'rgba(34,197,94,0.3)' }}
              transition={{ duration: 0.18 }}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ background: 'radial-gradient(circle at 30% 30%,rgba(34,197,94,0.07),transparent 65%)' }} />
              <div className="text-3xl" role="img" aria-hidden>{card.icon}</div>
              <div className={cn('flex items-start gap-2', isAr ? 'flex-row-reverse' : '')}>
                <h3 className="font-bold text-white text-lg leading-tight flex-1">{card.title}</h3>
                {card.tag && (
                  <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(34,197,94,0.14)', color: GREEN }}>{card.tag}</span>
                )}
              </div>
              <p className={cn('text-sm text-white/48 leading-relaxed', isAr && 'text-right')}>{card.desc}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ─── Admin & Member Phone mocks (for dual showcase) ───────────────────────────

function AdminPhone({ isAr }: { isAr: boolean }) {
  return (
    <div className="w-44 h-80 rounded-[2rem] overflow-hidden border-2 shadow-2xl"
      style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'linear-gradient(160deg,#111827,#0A0F1E)', boxShadow: `0 30px 60px rgba(0,0,0,0.5),0 0 30px rgba(34,197,94,0.1)` }}>
      <div className="h-4 bg-black/40 flex items-center justify-center">
        <div className="w-10 h-0.5 rounded-full bg-white/10" />
      </div>
      <div className="p-2.5 space-y-2">
        <div className="text-xs font-bold text-white/80">{isAr ? 'لوحة المدير' : 'Admin Dashboard'}</div>
        {/* Fake bar chart */}
        <div className="rounded-lg p-2" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)' }}>
          <div className="text-xs text-white/40 mb-2">{isAr ? 'الإيرادات' : 'Revenue'}</div>
          <div className="flex items-end gap-1 h-10">
            {[40, 65, 45, 80, 60, 90, 72].map((h, i) => (
              <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: i === 5 ? GREEN : 'rgba(34,197,94,0.35)' }} />
            ))}
          </div>
        </div>
        {[
          { label: isAr ? 'الأعضاء' : 'Members', val: '247' },
          { label: isAr ? 'الحضور اليوم' : 'Today', val: '38' },
          { label: isAr ? 'الإيراد' : 'Revenue', val: '12k' },
        ].map(item => (
          <div key={item.label} className="flex justify-between items-center text-xs px-2 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <span className="text-white/45">{item.label}</span>
            <span className="font-bold" style={{ color: GREEN }}>{item.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MemberPhone({ isAr }: { isAr: boolean }) {
  return (
    <div className="w-44 h-80 rounded-[2rem] overflow-hidden border-2 shadow-2xl"
      style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'linear-gradient(160deg,#111827,#0A0F1E)', boxShadow: `0 30px 60px rgba(0,0,0,0.5),0 0 30px rgba(59,130,246,0.1)` }}>
      <div className="h-4 bg-black/40 flex items-center justify-center">
        <div className="w-10 h-0.5 rounded-full bg-white/10" />
      </div>
      <div className="p-2.5 space-y-2">
        <div className="text-xs font-bold text-white/80">{isAr ? 'شاشة العضو' : 'Member View'}</div>
        {/* Progress ring mockup */}
        <div className="flex justify-center py-1">
          <div className="relative w-16 h-16">
            <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
              <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
              <circle cx="32" cy="32" r="26" fill="none" stroke={GREEN} strokeWidth="6" strokeDasharray={`${163 * 0.72} 163`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color: GREEN }}>72%</div>
          </div>
        </div>
        {[
          { icon: '💧', label: isAr ? 'الماء' : 'Water', val: '1.8L' },
          { icon: '🔥', label: isAr ? 'سعرات' : 'Calories', val: '1,320' },
          { icon: '🏃', label: isAr ? 'خطوات' : 'Steps', val: '6,240' },
        ].map(item => (
          <div key={item.label} className="flex justify-between items-center text-xs px-2 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <span className="text-white/45">{item.icon} {item.label}</span>
            <span className="font-bold text-white/80">{item.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Dual Phone Showcase ──────────────────────────────────────────────────────

function DualPhoneShowcase({
  t, isAr, onCTA, reduced,
}: { t: typeof content.en.showcase; isAr: boolean; onCTA: () => void; reduced: boolean }) {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end start'] });
  const y1 = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [-40, 40]);
  const y2 = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [40, -40]);

  return (
    <Section className="py-24 px-4 overflow-hidden" id="showcase">
      <div className="max-w-6xl mx-auto" ref={sectionRef}>
        <motion.div variants={fadeUp(0)} className={cn('mb-14 space-y-3', isAr ? 'text-right' : 'text-center')}>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">{t.heading}</h2>
          <p className="text-white/48 text-lg max-w-2xl mx-auto">{t.sub}</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          {/* Roles list */}
          <div className={cn('space-y-3', isAr && 'text-right')}>
            {t.roles.map((role, i) => (
              <motion.div
                key={role.label}
                variants={fadeUp(i * 0.08)}
                className="flex items-start gap-3 p-4 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <span className={cn('text-xl flex-shrink-0', isAr && 'order-last')} role="img" aria-hidden>{role.icon}</span>
                <div className={isAr ? 'text-right' : ''}>
                  <div className="font-semibold text-white text-sm">{role.label}</div>
                  <div className="text-xs text-white/42 mt-0.5">{role.desc}</div>
                </div>
              </motion.div>
            ))}
            <motion.div variants={fadeUp(t.roles.length * 0.08 + 0.1)}>
              <button
                onClick={onCTA}
                className="mt-2 inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90 active:scale-95"
                style={{ background: GREEN, color: BG }}
              >
                {isAr ? 'جرّب مجاناً' : 'Try It Free'} →
              </button>
            </motion.div>
          </div>

          {/* Dual phones with parallax */}
          <div className="flex justify-center items-end gap-5">
            <motion.div style={{ y: y1 }}>
              <div className="mb-2 text-center text-xs text-white/35 font-medium">{t.adminLabel}</div>
              <AdminPhone isAr={isAr} />
            </motion.div>
            <motion.div style={{ y: y2 }} className="mt-12">
              <div className="mb-2 text-center text-xs text-white/35 font-medium">{t.memberLabel}</div>
              <MemberPhone isAr={isAr} />
            </motion.div>
          </div>
        </div>

        {/* App store badges */}
        <motion.div variants={fadeUp(0.3)} className="flex flex-wrap justify-center gap-4 mt-16">
          {[
            {
              label: t.appStore,
              icon: (
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
              ),
            },
            {
              label: t.playStore,
              icon: (
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 20.5v-17c0-.83.94-1.3 1.6-.8l14 8.5c.6.36.6 1.24 0 1.6l-14 8.5c-.66.5-1.6.03-1.6-.8z" />
                </svg>
              ),
            },
          ].map(badge => (
            <button
              key={badge.label}
              onClick={onCTA}
              className="flex items-center gap-3 px-5 py-3 rounded-xl font-semibold text-sm text-white transition-all hover:scale-[1.03] active:scale-95"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {badge.icon}
              <span className="text-xs text-left leading-tight">
                <span className="block text-white/40 text-[10px]">{isAr ? 'حمّل من' : 'Download on'}</span>
                {badge.label}
              </span>
            </button>
          ))}
        </motion.div>
      </div>
    </Section>
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────

function Stats({ t, isAr, reduced }: { t: typeof content.en.stats; isAr: boolean; reduced: boolean }) {
  return (
    <Section id="stats" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div variants={fadeUp(0)} className={cn('mb-12 space-y-2', isAr ? 'text-right' : 'text-center')}>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">{t.heading}</h2>
        </motion.div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {t.items.map((item, i) => (
            <motion.div
              key={item.label}
              variants={fadeUp(i * 0.1)}
              className="rounded-2xl p-6 text-center space-y-2"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <AnimatedStat raw={item.value} reduced={reduced} />
              <div className="text-sm text-white/45">{item.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

function Testimonials({ t, isAr, reduced }: {
  t: typeof content.en.testimonials; isAr: boolean; reduced: boolean;
}) {
  const enItems = content.en.testimonials.items;
  const arItems = content.ar.testimonials.items;

  return (
    <Section id="testimonials" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div variants={fadeUp(0)} className={cn('mb-14 space-y-2', isAr ? 'text-right' : 'text-center')}>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">{t.heading}</h2>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {t.items.map((item, i) => (
            <motion.div key={item.nameAr} variants={fadeUp(i * 0.1)} className="h-full">
              <TiltCard reduced={reduced}>
                <div
                  className="h-full rounded-2xl p-6 space-y-4 relative overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <div className="text-white/30 text-4xl leading-none">"</div>

                  {/* Primary quote */}
                  <p className={cn('text-white/72 text-sm leading-relaxed', isAr && 'text-right')}>
                    {isAr ? arItems[i].textAr : enItems[i].text}
                  </p>

                  {/* Secondary (alt-lang) quote */}
                  <p
                    className={cn('text-white/25 text-xs leading-relaxed italic border-t pt-3', isAr ? 'text-left border-white/5' : 'text-right border-white/5')}
                    dir={isAr ? 'ltr' : 'rtl'}
                  >
                    {isAr ? enItems[i].text : arItems[i].textAr}
                  </p>

                  {/* Author */}
                  <div className={cn('flex items-center gap-3 pt-1', isAr && 'flex-row-reverse')}>
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0"
                      style={{ background: 'rgba(34,197,94,0.13)', color: GREEN }}
                    >
                      {item.avatar}
                    </div>
                    <div className={isAr ? 'text-right' : ''}>
                      <div className="text-white font-semibold text-sm">{isAr ? item.nameAr : item.name}</div>
                      <div className="text-white/38 text-xs">{isAr ? item.roleAr : item.role}</div>
                    </div>
                  </div>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ─── CTA Section ──────────────────────────────────────────────────────────────

function CTA({ t, isAr, onCTA, reduced }: {
  t: typeof content.en.cta; isAr: boolean; onCTA: () => void; reduced: boolean;
}) {
  return (
    <Section className="py-24 px-4">
      <div className="max-w-3xl mx-auto relative">
        {/* Animated gradient background */}
        <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
          <motion.div
            className="absolute inset-0"
            animate={reduced ? {} : {
              background: [
                'radial-gradient(ellipse at 20% 50%,rgba(34,197,94,0.14) 0%,transparent 60%),radial-gradient(ellipse at 80% 50%,rgba(59,130,246,0.07) 0%,transparent 60%)',
                'radial-gradient(ellipse at 80% 20%,rgba(34,197,94,0.14) 0%,transparent 60%),radial-gradient(ellipse at 20% 80%,rgba(139,92,246,0.07) 0%,transparent 60%)',
                'radial-gradient(ellipse at 50% 80%,rgba(34,197,94,0.14) 0%,transparent 60%),radial-gradient(ellipse at 50% 20%,rgba(59,130,246,0.07) 0%,transparent 60%)',
                'radial-gradient(ellipse at 20% 50%,rgba(34,197,94,0.14) 0%,transparent 60%),radial-gradient(ellipse at 80% 50%,rgba(59,130,246,0.07) 0%,transparent 60%)',
              ],
            }}
            transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
          />
        </div>

        <div
          className="relative rounded-3xl px-8 py-16 text-center space-y-7"
          style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(34,197,94,0.18)' }}
        >
          <motion.h2 variants={fadeUp(0)} className="text-4xl sm:text-5xl font-black text-white leading-tight">
            {t.heading}
          </motion.h2>

          <motion.div variants={fadeUp(0.1)}>
            <TypingText text={t.sub} reduced={reduced} />
          </motion.div>

          <motion.div variants={fadeUp(0.2)} className="flex flex-col items-center gap-3">
            <div className="relative inline-block">
              <Sparkles reduced={reduced} />
              <button
                onClick={onCTA}
                className="relative px-10 py-4 rounded-2xl font-black text-lg transition-all hover:scale-[1.04] active:scale-[0.97]"
                style={{ background: GREEN, color: BG, boxShadow: `0 0 55px rgba(34,197,94,0.45)` }}
              >
                {t.button} →
              </button>
            </div>
            <p className="text-white/28 text-sm">{t.note}</p>
          </motion.div>
        </div>
      </div>
    </Section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer({ t, isAr, onCTA, toggle }: {
  t: typeof content.en.footer; isAr: boolean; onCTA: () => void; toggle: () => void;
}) {
  const cols = [
    { heading: t.col1, links: t.col1Links },
    { heading: t.col2, links: t.col2Links },
    { heading: t.col3, links: t.col3Links },
  ];

  return (
    <footer
      className="pt-16 pb-10 px-4 border-t"
      style={{ borderColor: 'rgba(255,255,255,0.06)' }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Top grid */}
        <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-10 mb-12', isAr && 'direction-rtl')}>
          {/* Brand column */}
          <div className={cn('col-span-2 md:col-span-1 space-y-4', isAr && 'text-right')}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm" style={{ background: GREEN, color: BG }}>Q</div>
              <span className="font-bold text-white text-lg">Qawi</span>
            </div>
            <p className="text-sm text-white/40 leading-relaxed max-w-[200px]">{t.tagline}</p>
            <button
              onClick={toggle}
              className="text-xs px-3 py-1.5 rounded-lg font-medium text-white/50 hover:text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              {t.lang}
            </button>
          </div>

          {/* Link columns */}
          {cols.map(col => (
            <div key={col.heading} className={isAr ? 'text-right' : ''}>
              <div className="font-semibold text-white text-sm mb-4">{col.heading}</div>
              <ul className="space-y-2.5">
                {col.links.map(link => (
                  <li key={link}>
                    <button
                      onClick={link === col.links[0] ? onCTA : undefined}
                      className="text-sm text-white/40 hover:text-white transition-colors"
                    >
                      {link}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t"
          style={{ borderColor: 'rgba(255,255,255,0.05)' }}
        >
          <p className="text-xs text-white/22">{t.rights}</p>
          <div className="flex items-center gap-5 text-xs text-white/28">
            <button className="hover:text-white/50 transition-colors">{isAr ? 'سياسة الخصوصية' : 'Privacy Policy'}</button>
            <button className="hover:text-white/50 transition-colors">{isAr ? 'الشروط' : 'Terms'}</button>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Marketing() {
  const { lang, toggle, isAr } = useLanguage();
  const reduced = useReducedMotion();
  const t = content[lang];
  const [modalOpen, setModalOpen] = useState(false);

  const openModal = useCallback(() => setModalOpen(true), []);
  const closeModal = useCallback(() => setModalOpen(false), []);

  useEffect(() => {
    document.documentElement.style.background = BG;
    document.body.style.background = BG;
    document.documentElement.lang = lang;
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';
  }, [lang, isAr]);

  return (
    <div className="min-h-screen text-white" style={{ background: BG }}>
      <Navbar t={t.nav} isAr={isAr} toggle={toggle} onCTA={openModal} />

      <main>
        <Hero t={t.hero} isAr={isAr} onCTA={openModal} reduced={reduced} />

        <div className="py-3 space-y-3 overflow-hidden">
          <Marquee items={t.marquee.items} reduced={reduced} />
          <Marquee items={t.marquee.items} reverse reduced={reduced} />
        </div>

        <Features t={t.features} isAr={isAr} />
        <DualPhoneShowcase t={t.showcase} isAr={isAr} onCTA={openModal} reduced={reduced} />
        <Stats t={t.stats} isAr={isAr} reduced={reduced} />
        <Testimonials t={t.testimonials} isAr={isAr} reduced={reduced} />
        <CTA t={t.cta} isAr={isAr} onCTA={openModal} reduced={reduced} />
      </main>

      <Footer t={t.footer} isAr={isAr} onCTA={openModal} toggle={toggle} />

      <GetAccessModal open={modalOpen} onClose={closeModal} t={t.modal} isAr={isAr} />
    </div>
  );
}
