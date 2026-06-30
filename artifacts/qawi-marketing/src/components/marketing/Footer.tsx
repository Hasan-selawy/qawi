import { content } from '@/locales/content';
import { GREEN, BG, cn, CONTAINER } from './shared';

const ANCHORS: Record<string, string | undefined> = {
  Features: '#features',
  Roles: '#roles',
  'MENA Ready': '#mena',
  FAQ: '#faq',
  المميزات: '#features',
  الأدوار: '#roles',
  'جاهز للمنطقة': '#mena',
  'الأسئلة الشائعة': '#faq',
};

export function Footer({
  t,
  isAr,
  onCTA,
  toggle,
}: {
  t: typeof content.en.footer;
  isAr: boolean;
  onCTA: () => void;
  toggle: () => void;
}) {
  const cols = [
    { heading: t.productHeading, links: t.product },
    { heading: t.companyHeading, links: t.company },
    { heading: t.supportHeading, links: t.support },
  ];

  return (
    <footer className="pt-16 pb-10" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div className={CONTAINER}>
        <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-10 mb-12')}>
          {/* Brand */}
          <div className={cn('col-span-2 md:col-span-1 space-y-4', isAr && 'text-right')}>
            <div className={cn('flex items-center gap-2', isAr && 'flex-row-reverse')}>
              <span className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm" style={{ background: GREEN, color: BG }}>Q</span>
              <span className="font-bold text-white text-lg">Qawi</span>
            </div>
            <p className="text-sm text-white/50 leading-relaxed max-w-[220px]">{t.tagline}</p>
            <span
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full text-white/55"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {t.appComingSoon}
            </span>
          </div>

          {cols.map((col) => (
            <div key={col.heading} className={isAr ? 'text-right' : ''}>
              <div className="font-semibold text-white text-sm mb-4">{col.heading}</div>
              <ul className="space-y-2.5">
                {col.links.map((link) => {
                  const anchor = ANCHORS[link];
                  return (
                    <li key={link}>
                      {anchor ? (
                        <a
                          href={anchor}
                          className="text-sm text-white/55 hover:text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded px-0.5"
                        >
                          {link}
                        </a>
                      ) : (
                        <button
                          onClick={onCTA}
                          className={cn('text-sm text-white/55 hover:text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded px-0.5', isAr && 'text-right w-full')}
                        >
                          {link}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className={cn('flex flex-col sm:flex-row items-center justify-between gap-4 pt-8', isAr && 'sm:flex-row-reverse')} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-xs text-white/55">{t.rights}</p>
          <div className="flex items-center gap-4">
            <button
              onClick={toggle}
              aria-label={isAr ? 'Switch to English' : 'التبديل إلى العربية'}
              className="text-xs px-3 py-1.5 rounded-lg font-medium text-white/55 hover:text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              {isAr ? 'English' : 'عربي'}
            </button>
            <span className="text-xs text-white/55">{t.privacy}</span>
            <span className="text-xs text-white/55">{t.terms}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
