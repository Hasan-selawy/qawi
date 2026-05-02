import { Bell } from 'lucide-react';
import { useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { useLanguage } from '@/hooks/use-language';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const { t } = useLanguage();
  const [unreadCount, setUnreadCount] = useState(2);

  // Mock notifications for now
  const notifications = [
    { id: 1, title: 'New Member', message: 'Ahmed joined the gym', isRead: false, time: '2m ago' },
    { id: 2, title: 'Subscription Expiring', message: 'Sarah\'s plan expires in 2 days', isRead: false, time: '1h ago' }
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors outline-none">
          <Bell size={20} className="text-muted-foreground" />
          {unreadCount > 0 && (
            <span className={cn(
              "absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full",
              "animate-pulse" // add shake logic here later
            )} />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex justify-between items-center">
          <span>{t('common.notifications') || 'Notifications'}</span>
          <button className="text-xs text-primary hover:underline" onClick={() => setUnreadCount(0)}>
            {t('common.mark_all_read') || 'Mark all read'}
          </button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-y-auto">
          {notifications.map(n => (
            <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-1 p-3 cursor-pointer">
              <div className="flex justify-between w-full">
                <span className={cn("font-medium", !n.isRead && "text-foreground")}>{n.title}</span>
                <span className="text-xs text-muted-foreground">{n.time}</span>
              </div>
              <p className="text-sm text-muted-foreground">{n.message}</p>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
