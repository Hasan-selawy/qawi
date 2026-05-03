import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

function useIsLargeScreen() {
  const [large, setLarge] = useState(() => window.innerWidth >= 1024);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent) => setLarge(e.matches);
    mq.addEventListener('change', handler);
    setLarge(mq.matches);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return large;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const isLarge = useIsLargeScreen();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Auto-collapse when screen shrinks below 1024px
  useEffect(() => {
    setIsSidebarOpen(isLarge);
  }, [isLarge]);

  const overlayMode = !isLarge && isSidebarOpen;

  return (
    <div className="min-h-screen bg-background flex text-foreground">
      {/* Overlay backdrop for mobile */}
      {overlayMode && (
        <div
          className="fixed inset-0 z-30 bg-black/60"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} overlayMode={overlayMode} />

      <div
        className={`flex-1 flex flex-col transition-all duration-300 min-w-0 ${
          isLarge
            ? isSidebarOpen
              ? 'ml-[260px] rtl:ml-0 rtl:mr-[260px]'
              : 'ml-[72px] rtl:ml-0 rtl:mr-[72px]'
            : 'ml-0'
        }`}
      >
        <Navbar onMenuClick={() => setIsSidebarOpen((v) => !v)} />
        <main className="flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
