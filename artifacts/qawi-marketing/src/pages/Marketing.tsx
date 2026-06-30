import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { content } from '@/locales/content';
import { useLanguage } from '@/hooks/useLanguage';
import { BG } from '@/components/marketing/shared';
import { Navbar } from '@/components/marketing/Navbar';
import { Hero } from '@/components/marketing/Hero';
import { Stats } from '@/components/marketing/Stats';
import { ProblemSolution } from '@/components/marketing/ProblemSolution';
import { Features } from '@/components/marketing/Features';
import { Roles } from '@/components/marketing/Roles';
import { MenaReady } from '@/components/marketing/MenaReady';
import { BuiltForModernGyms } from '@/components/marketing/BuiltForModernGyms';
import { FAQ } from '@/components/marketing/FAQ';
import { CTASection } from '@/components/marketing/CTASection';
import { Footer } from '@/components/marketing/Footer';

// Lazy-loaded: only fetched when the user opens the modal (kept out of the initial bundle)
const GetAccessModal = lazy(() =>
  import('@/components/marketing/GetAccessModal').then((m) => ({ default: m.GetAccessModal })),
);

export default function Marketing() {
  const { lang, toggle, isAr } = useLanguage();
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
    <div className="min-h-screen text-white overflow-x-hidden" style={{ background: BG }}>
      <Navbar t={t.nav} isAr={isAr} toggle={toggle} onCTA={openModal} />

      <main id="main-content">
        <Hero t={t.hero} isAr={isAr} onCTA={openModal} />
        <Stats t={t.stats} isAr={isAr} />
        <ProblemSolution t={t.problem} isAr={isAr} />
        <Features t={t.features} isAr={isAr} />
        <Roles t={t.roles} isAr={isAr} />
        <MenaReady t={t.mena} isAr={isAr} />
        <BuiltForModernGyms t={t.modern} isAr={isAr} />
        <FAQ t={t.faq} isAr={isAr} />
        <CTASection t={t.cta} isAr={isAr} onCTA={openModal} />
      </main>

      <Footer t={t.footer} isAr={isAr} onCTA={openModal} toggle={toggle} />

      {modalOpen && (
        <Suspense fallback={null}>
          <GetAccessModal open={modalOpen} onClose={closeModal} t={t.modal} isAr={isAr} />
        </Suspense>
      )}
    </div>
  );
}
