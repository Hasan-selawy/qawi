import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { useGymConfig } from '@/hooks/use-gym-config';
import { GradientAvatar } from '../GradientAvatar';
import { NotificationBell } from '../NotificationBell';
import { ChangePasswordModal } from '../ChangePasswordModal';
import { LogOut, Menu, KeyRound } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

interface NavbarProps {
  onMenuClick?: () => void;
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const { features } = useGymConfig();
  const [changePassOpen, setChangePassOpen] = useState(false);

  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-30 px-4 md:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            aria-label="Toggle menu"
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-foreground"
          >
            <Menu size={20} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
          className="glass-card px-3 py-1.5 rounded-full text-xs font-semibold tracking-wider hover:bg-white/5 transition-colors"
        >
          {lang === 'ar' ? 'EN' : 'AR'}
        </button>

        {features.pushNotificationsEnabled && <NotificationBell />}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 outline-none">
              <GradientAvatar name={user?.name || 'U'} size="sm" />
              <div className="hidden md:flex flex-col items-start text-sm text-left rtl:text-right">
                <span className="font-medium text-foreground max-w-[120px] truncate">{user?.name}</span>
                <span className="text-xs text-muted-foreground capitalize">{user?.role?.replace('_', ' ').toLowerCase()}</span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{t('common.my_account') || 'My Account'}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" onClick={() => setChangePassOpen(true)}>
              <KeyRound className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
              <span>{lang === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive cursor-pointer" onClick={() => logout()}>
              <LogOut className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
              <span>{t('common.logout')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ChangePasswordModal open={changePassOpen} onOpenChange={setChangePassOpen} />
    </header>
  );
}
