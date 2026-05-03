import { useEffect, useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { cn } from '@/lib/utils';

export function OfflineBanner() {
  const { lang } = useLanguage();
  const [online, setOnline] = useState(navigator.onLine);
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    const handleOffline = () => { setOnline(false); setShowBackOnline(false); };
    const handleOnline = () => {
      setOnline(true);
      setShowBackOnline(true);
      setTimeout(() => setShowBackOnline(false), 3000);
    };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (online && !showBackOnline) return null;

  if (!online) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 bg-yellow-500/95 text-black px-4 py-2.5 text-sm font-semibold shadow-lg">
        <span>⚠️</span>
        <span>{lang === 'ar' ? 'لا يوجد اتصال بالإنترنت' : 'No internet connection'}</span>
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 bg-primary/95 text-black px-4 py-2.5 text-sm font-semibold shadow-lg animate-in slide-in-from-top-2 duration-300">
      <span>✅</span>
      <span>{lang === 'ar' ? 'عاد الاتصال بالإنترنت!' : 'Back online!'}</span>
    </div>
  );
}
