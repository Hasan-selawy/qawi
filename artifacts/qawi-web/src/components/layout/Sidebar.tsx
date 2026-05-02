import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { 
  LayoutDashboard, Users, UserSquare2, CreditCard, BarChart3, 
  Dumbbell, Library, StickyNote, ChevronLeft, ChevronRight, Activity, Building2 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (v: boolean) => void }) {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const [location] = useLocation();

  const getLinks = () => {
    switch (user?.role) {
      case 'GYM_ADMIN':
        return [
          { href: '/admin/dashboard', icon: LayoutDashboard, label: 'dashboard' },
          { href: '/admin/members', icon: Users, label: 'members' },
          { href: '/admin/coaches', icon: UserSquare2, label: 'coaches' },
          { href: '/admin/subscriptions', icon: CreditCard, label: 'subscriptions' },
          { href: '/admin/analytics', icon: BarChart3, label: 'analytics' },
        ];
      case 'COACH':
        return [
          { href: '/coach/dashboard', icon: LayoutDashboard, label: 'dashboard' },
          { href: '/coach/templates', icon: Dumbbell, label: 'templates' },
          { href: '/coach/library', icon: Library, label: 'library' },
          { href: '/coach/notes', icon: StickyNote, label: 'notes' },
        ];
      case 'SUPER_ADMIN':
        // Backend admin/coach endpoints are role-locked (GYM_ADMIN / COACH only) and
        // will return 403 for SUPER_ADMIN. Only expose links whose data the super
        // role can actually load: super stats, super gyms, and the public exercise library.
        return [
          { href: '/super/dashboard', icon: Activity, label: 'dashboard' },
          { href: '/super/gyms', icon: Building2, label: 'gyms' },
          { href: '/coach/library', icon: Library, label: 'library' },
        ];
      default:
        return [];
    }
  };

  const links = getLinks();

  return (
    <aside className={cn(
      "fixed top-0 bottom-0 z-40 bg-sidebar border-r rtl:border-l rtl:border-r-0 border-sidebar-border transition-all duration-300 flex flex-col",
      isOpen ? "w-[260px]" : "w-[72px]"
    )}>
      <div className="h-16 flex items-center justify-center border-b border-sidebar-border">
        <h1 className={cn("font-bold text-primary tracking-tight transition-all", isOpen ? "text-2xl" : "text-xl")} style={{ textShadow: '0 0 20px rgba(34,197,94,0.3)' }}>
          {isOpen ? 'قوي' : 'ق'}
        </h1>
      </div>

      <nav className="flex-1 py-4 flex flex-col gap-2 px-3 overflow-y-auto">
        {links.map((link) => {
          const isActive = location.startsWith(link.href);
          return (
            <Link key={link.href} href={link.href}>
              <div className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-colors relative group",
                isActive ? "bg-primary/20 text-primary glow-hover" : "text-sidebar-foreground hover:bg-white/5",
                !isOpen && "justify-center"
              )}>
                <link.icon size={20} className={cn(isActive ? "text-primary" : "text-sidebar-foreground")} />
                {isOpen && <span className="font-medium truncate">{t(`common.${link.label}`)}</span>}
                {isActive && isOpen && <div className="absolute left-0 rtl:left-auto rtl:right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full rtl:rounded-r-none rtl:rounded-l-full" />}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border flex justify-center">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-muted-foreground hover:text-white transition-colors"
        >
          {isOpen ? 
            (lang === 'ar' ? <ChevronRight size={20} /> : <ChevronLeft size={20} />) : 
            (lang === 'ar' ? <ChevronLeft size={20} /> : <ChevronRight size={20} />)
          }
        </button>
      </div>
    </aside>
  );
}
