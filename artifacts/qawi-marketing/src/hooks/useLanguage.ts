import { useState, useEffect } from 'react';

export type Lang = 'en' | 'ar';

function getStoredOrUrlLang(): Lang {
  try {
    // Check URL param first for SEO
    const params = new URLSearchParams(window.location.search);
    const paramLang = params.get('lang');
    if (paramLang === 'en' || paramLang === 'ar') return paramLang;

    const stored = localStorage.getItem('qawi_lang') as Lang | null;
    if (stored === 'en' || stored === 'ar') return stored;
  } catch {}
  return 'en';
}

export function useLanguage() {
  // Always start as 'en' so the server-prerendered HTML and the first client
  // render are identical — required for clean hydration of the static page.
  const [lang, setLangState] = useState<Lang>('en');

  // After mount, adopt the visitor's stored / URL language preference.
  useEffect(() => {
    const preferred = getStoredOrUrlLang();
    if (preferred !== 'en') setLangState(preferred);
  }, []);

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem('qawi_lang', l);
      // Update URL param for SEO hreflang
      const url = new URL(window.location.href);
      if (l === 'ar') {
        url.searchParams.set('lang', 'ar');
      } else {
        url.searchParams.delete('lang');
      }
      window.history.replaceState({}, '', url.toString());
    } catch {}
  };

  const toggle = () => setLang(lang === 'en' ? 'ar' : 'en');

  return { lang, setLang, toggle, isAr: lang === 'ar' };
}
