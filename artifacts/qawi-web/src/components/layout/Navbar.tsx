import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { useGymConfig } from '@/hooks/use-gym-config';
import { GradientAvatar } from '../GradientAvatar';
import { NotificationBell } from '../NotificationBell';
import { LogOut, User } from 'lucide-react';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export function Navbar() {
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const { features } = useGymConfig();

  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between">
      <div className="flex items-center">
        {/* Contextual title can be injected here via a context or state, but for now we keep it clean */}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => setLang(lang === "ar" ? "en" : "ar")}
          className="glass-card px-3 py-1.5 rounded-full text-xs font-semibold tracking-wider hover:bg-white/5 transition-colors"
        >
          {lang === "ar" ? "EN" : "AR"}
        </button>

        {features.pushNotificationsEnabled && <NotificationBell />}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 outline-none">
              <GradientAvatar name={user?.name || 'U'} size="sm" />
              <div className="hidden md:flex flex-col items-start text-sm text-left rtl:text-right">
                <span className="font-medium text-foreground max-w-[120px] truncate">
                  {user?.name}
                </span>
                <span className="text-xs text-muted-foreground capitalize">
                  {user?.role?.replace('_', ' ').toLowerCase()}
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{t('common.my_account') || 'My Account'}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive cursor-pointer" onClick={() => logout()}>
              <LogOut className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
              <span>{t('common.logout')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
