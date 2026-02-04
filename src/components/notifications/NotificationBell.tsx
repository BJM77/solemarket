

'use client';

import { useState, useEffect, useTransition, useMemo } from 'react';
import { useUser, useCollection, useMemoFirebase } from '@/firebase';
import { getUserNotifications, markAllAsRead, markAsRead } from '@/services/notifications';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Bell, Loader2, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Notification } from '@/lib/types';
import { query, collection, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export function NotificationBell() {
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const notificationsQuery = useMemoFirebase(() => {
    if (!user?.uid) return null;
    return query(
      collection(db, 'notifications'),
      where('recipientId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
  }, [user?.uid]);

  const { data: notifications, isLoading } = useCollection<Notification>(notificationsQuery);

  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  const handleMarkAllRead = () => {
    if (!user?.uid || unreadCount === 0) return;
    startTransition(async () => {
      await markAllAsRead(user.uid);
    });
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    // Note: navigation is handled by the Link component
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`View notifications (${unreadCount} unread)`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs font-bold text-white">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 md:w-96" align="end">
        <div className="flex items-center justify-between p-2">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllRead} disabled={isPending}>
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
              Mark all as read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[300px] md:h-[400px]">
          {isLoading && <div className="flex items-center justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}
          {!isLoading && (!notifications || notifications.length === 0) && (
            <div className="text-center p-8 text-sm text-muted-foreground">
              You have no notifications.
            </div>
          )}
          {notifications && notifications.map((notif) => (
            <DropdownMenuItem key={notif.id} asChild className={cn("flex items-start gap-3 p-3", !notif.read && "bg-primary/5")}>
              <Link href={notif.link || '#'} onClick={() => handleNotificationClick(notif)}>
                {!notif.read && <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0"></div>}
                <div className={cn("flex-1", notif.read && "ml-5")}>
                  <p className="font-semibold text-sm">{notif.title}</p>
                  <p className="text-xs text-muted-foreground">{notif.message}</p>
                  <p className="text-xs text-muted-foreground/80 mt-1">
                    {notif.createdAt ? formatDistanceToNow(new Date(notif.createdAt.seconds * 1000), { addSuffix: true }) : 'Just now'}
                  </p>
                </div>
              </Link>
            </DropdownMenuItem>
          ))}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
