import { useState, useEffect } from 'react';

export type Lang = 'en' | 'ar';

function getInitial(): Lang {
  try {
    const stored = localStorage.getItem('qawi_lang') as Lang | null;
    if (stored === 'en' || stored === 'ar') return stored;
  } catch {}
  return 'en';
}

export function useLanguage() {
  const [lang, setLangState] = useState<Lang>(getInitial);

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem('qawi_lang', l); } catch {}
  };

  const toggle = () => setLang(lang === 'en' ? 'ar' : 'en');

  return { lang, setLang, toggle, isAr: lang === 'ar' };
}
