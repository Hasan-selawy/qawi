import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { useGymConfig } from '@/hooks/use-gym-config';
import {
  LayoutDashboard, Users, UserSquare2, CreditCard, BarChart3,
  Dumbbell, Library, ChevronLeft, ChevronRight, Activity, Building2, UtensilsCrossed,
  TrendingUp, Flag, Calendar, Tag, Home
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  overlayMode?: boolean;
}

function GymLogoImage({
  logoUrl,
  gymName,
  isOpen,
  onError,
}: {
  logoUrl: string;
  gymName: string | null;
  isOpen: boolean;
  onError: () => void;
}) {
  return (
    <img
      src={logoUrl}
      alt={gymName || 'Gym logo'}
      className={cn('object-contain shrink-0 transition-all', isOpen ? 'max-h-10 max-w-[160px]' : 'max-h-8 max-w-[48px]')}
      onError={onError}
    />
  );
}

function SidebarLogo({ isOpen, lang }: { isOpen: boolean; lang: string }) {
  const { features, branding, gymName } = useGymConfig();
  const [imgFailed, setImgFailed] = useState(false);

  if (features.customBrandingEnabled) {
    const hasLogo = !!branding.logoUrl && !imgFailed;
    const displayName = gymName || null;

    return (
      <div className="flex flex-col items-center gap-0.5 min-w-0 max-w-full">
        {hasLogo ? (
          <GymLogoImage
            logoUrl={branding.logoUrl!}
            gymName={displayName}
            isOpen={isOpen}
            onError={() => setImgFailed(true)}
          />
        ) : (
          isOpen && displayName ? (
            <span className="text-sm font-bold text-foreground truncate max-w-[180px]">{displayName}</span>
          ) : !isOpen ? (
            <span className="font-bold text-primary text-xl" style={{ textShadow: '0 0 20px rgba(34,197,94,0.3)' }}>
              {lang === 'ar' ? 'ق' : 'Q'}
            </span>
          ) : null
        )}
        {isOpen && (
          <span className="text-[9px] text-muted-foreground/50 tracking-widest uppercase leading-none">
            Powered by Qawi
          </span>
        )}
      </div>
    );
  }

  return (
    <h1
      className={cn('font-bold text-primary tracking-tight transition-all shrink-0', isOpen ? 'text-2xl' : 'text-xl')}
      style={{ textShadow: '0 0 20px rgba(34,197,94,0.3)' }}
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {isOpen ? (lang === 'ar' ? 'قوي' : 'Qawi') : (lang === 'ar' ? 'ق' : 'Q')}
    </h1>
  );
}

export function Sidebar({ isOpen, setIsOpen, overlayMode }: SidebarProps) {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const [location] = useLocation();
  const { features } = useGymConfig();

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
        links.push({ href: '/admin/pricing', icon: Tag, label: 'pricing' });
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
          { href: '/super/pricing', icon: Tag, label: 'pricing' },
          { href: '/coach/library', icon: Library, label: 'library' },
        ];
      case 'MEMBER': {
        const memberLinks: { href: string; icon: any; label: string }[] = [
          { href: '/member/dashboard', icon: Home, label: 'dashboard' },
          { href: '/member/workout', icon: Dumbbell, label: 'templates' },
        ];
        if (features.nutritionEnabled) {
          memberLinks.push({ href: '/member/nutrition', icon: UtensilsCrossed, label: 'nutrition' });
        }
        return memberLinks;
      }
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
      <div className="h-16 flex items-center justify-center border-b border-sidebar-border px-3 overflow-hidden">
        <SidebarLogo isOpen={isOpen} lang={lang} />
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
