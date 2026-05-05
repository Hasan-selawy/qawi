import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { useGymConfig } from '@/hooks/use-gym-config';
import {
  LayoutDashboard, Users, UserSquare2, CreditCard, BarChart3,
  Dumbbell, Library, ChevronLeft, ChevronRight, Activity, Building2, UtensilsCrossed,
  TrendingUp, Flag, Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  overlayMode?: boolean;
}

export function Sidebar({ isOpen, setIsOpen, overlayMode }: SidebarProps) {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const [location] = useLocation();
  const { features, branding, gymName } = useGymConfig();
  const showLogo = features.customBrandingEnabled && !!branding.logoUrl;
  const showGymName = !!gymName && (user?.role === 'GYM_ADMIN' || user?.role === 'COACH');

  const getLinks = () => {
    switch (user?.role) {
      case 'GYM_ADMIN': {
        const links = [
          { href: '/admin/dashboard', icon: LayoutDashboard, label: 'dashboard' },
          { href: '/admin/members', icon: Users, label: 'members' },
          { href: '/admin/coaches', icon: UserSquare2, label: 'coaches' },
          { href: '/admin/subscriptions', icon: CreditCard, label: 'subscriptions' },
          { href: '/admin/analytics', icon: BarChart3, label: 'analytics' },
          { href: '/admin/reports', icon: Flag, label: 'memberReports' },
          { href: '/coach/library', icon: Library, label: 'library' },
        ];
        if (features.analyticsAdvancedEnabled) {
          links.splice(5, 0, { href: '/admin/revenue', icon: TrendingUp, label: 'revenue' });
        }
        if (features.classBookingEnabled) {
          links.push({ href: '/admin/classes', icon: Calendar, label: 'classes' });
        }
        return links;
      }
      case 'COACH': {
        const coachLinks: { href: string; icon: any; label: string }[] = [
          { href: '/coach/dashboard', icon: LayoutDashboard, label: 'dashboard' },
          { href: '/coach/templates', icon: Dumbbell, label: 'templates' },
          { href: '/coach/library', icon: Library, label: 'library' },
        ];
        if (features.nutritionEnabled) {
          coachLinks.splice(1, 0, { href: '/coach/nutrition', icon: UtensilsCrossed, label: 'nutrition' });
        }
        return coachLinks;
      }
      case 'SUPER_ADMIN':
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
      'fixed top-0 bottom-0 z-40 bg-sidebar border-r rtl:border-l rtl:border-r-0 border-sidebar-border transition-all duration-300 flex flex-col',
      overlayMode ? 'shadow-2xl' : '',
      isOpen ? 'w-[260px]' : 'w-[72px]'
    )}>
      <div className="h-16 flex items-center justify-center border-b border-sidebar-border px-3 gap-2 overflow-hidden">
        {showLogo ? (
          <img
            src={branding.logoUrl!}
            alt={gymName || 'Gym'}
            className={cn('object-contain shrink-0', isOpen ? 'h-10 w-10' : 'h-8 w-8')}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <h1 className={cn('font-bold text-primary tracking-tight transition-all shrink-0', isOpen ? 'text-2xl' : 'text-xl')} style={{ textShadow: '0 0 20px rgba(34,197,94,0.3)' }} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            {isOpen ? (lang === 'ar' ? 'قوي' : 'Qawi') : (lang === 'ar' ? 'ق' : 'Q')}
          </h1>
        )}
        {isOpen && showGymName && (
          <span className="text-sm font-medium text-muted-foreground truncate" title={gymName!}>
            {showLogo ? gymName : `· ${gymName}`}
          </span>
        )}
      </div>

      <nav className="flex-1 py-4 flex flex-col gap-2 px-3 overflow-y-auto">
        {links.map((link) => {
          const isActive = location.startsWith(link.href);
          return (
            <Link key={link.href} href={link.href} onClick={() => overlayMode && setIsOpen(false)}>
              <div className={cn(
                'flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-colors relative group',
                isActive ? 'bg-primary/20 text-primary glow-hover' : 'text-sidebar-foreground hover:bg-white/5',
                !isOpen && 'justify-center'
              )}>
                <link.icon size={20} className={cn(isActive ? 'text-primary' : 'text-sidebar-foreground')} />
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
