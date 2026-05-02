import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background flex text-foreground">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'ml-[260px] rtl:ml-0 rtl:mr-[260px]' : 'ml-[72px] rtl:ml-0 rtl:mr-[72px]'}`}>
        <Navbar />
        <main className="flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
