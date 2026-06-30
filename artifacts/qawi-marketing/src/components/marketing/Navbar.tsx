import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { content } from '@/locales/content';
import { GREEN, BG, cn, CONTAINER } from './shared';

const LINKS = [
  { href: '#features', key: 'features' as const },
  { href: '#roles', key: 'roles' as const },
  { href: '#mena', key: 'mena' as const },
  { href: '#faq', key: 'faq' as const },
];

function Logo() {
  return (
    <a href="#top" className="flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded-lg" aria-label="Qawi home">
      <img
        src={`${import.meta.env.BASE_URL}qawi-logo.png`}
        alt="Qawi"
        width={36}
        height={36}
        className="w-9 h-9 rounded-xl"
        decoding="async"
      />
      <span className="font-bold text-white text-lg tracking-tight">Qawi</span>
    </a>
  );
}

export function Navbar({
  t,
  isAr,
  toggle,
  onCTA,
}: {
  t: typeof content.en.nav;
  isAr: boolean;
  toggle: () => void;
  onCTA: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const langBtn = (
    <button
      onClick={toggle}
      aria-label={isAr ? 'التبديل إلى الإنجليزية' : 'Switch to Arabic'}
      className="px-3 py-2 rounded-lg text-sm font-semibold text-white/70 hover:text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-green-500"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
    >
      {t.langLabel}
    </button>
  );

  return (
    <header
      className="fixed top-0 inset-x-0 z-50 transition-all duration-300"
      style={{
        background: scrolled || open ? 'rgba(10,15,30,0.85)' : 'transparent',
        backdropFilter: scrolled || open ? 'blur(14px)' : 'none',
        borderBottom: `1px solid ${scrolled || open ? 'rgba(255,255,255,0.08)' : 'transparent'}`,
      }}
    >
      <nav className={cn(CONTAINER, 'flex items-center justify-between h-16')} aria-label="Primary">
        <Logo />

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {LINKS.map((l) => (
            <a
              key={l.key}
              href={l.href}
              className="px-3.5 py-2 rounded-lg text-sm font-medium text-white/65 hover:text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            >
              {t[l.key]}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2.5">
          {langBtn}
          <button
            onClick={onCTA}
            className="px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:brightness-105 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            style={{ background: GREEN, color: BG, boxShadow: '0 0 24px rgba(34,197,94,0.28)' }}
          >
            {t.cta}
          </button>
        </div>

        {/* Mobile controls */}
        <div className="flex md:hidden items-center gap-2">
          {langBtn}
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? t.close : t.menu}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="w-10 h-10 inline-flex items-center justify-center rounded-lg text-white outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu — CSS-animated (tw-animate-css), no JS animation library */}
      {open && (
        <div
          id="mobile-menu"
          className="md:hidden overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
          style={{ background: 'rgba(10,15,30,0.97)', borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className={cn(CONTAINER, 'py-4 flex flex-col gap-1')}>
            {LINKS.map((l) => (
              <a
                key={l.key}
                href={l.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'px-3 py-3 rounded-lg text-base font-medium text-white/75 hover:text-white hover:bg-white/5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-green-500',
                  isAr && 'text-right',
                )}
              >
                {t[l.key]}
              </a>
            ))}
            <button
              onClick={() => {
                setOpen(false);
                onCTA();
              }}
              className="mt-2 px-5 py-3 rounded-xl font-bold text-sm outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              style={{ background: GREEN, color: BG }}
            >
              {t.cta}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
