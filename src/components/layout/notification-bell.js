"use client";

import { useEffect, useState } from "react";
import { Bell, BellDot, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/context/user-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDistanceToNow } from "date-fns";

export function NotificationBell() {
  const { user } = useUser();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!user) return;

    async function loadNotifications() {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.read).length);
      }
    }

    loadNotifications();

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev].slice(0, 20));
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  async function markAllRead() {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  async function markRead(id) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }

  const hasNew = unreadCount > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative flex items-center gap-1.5 px-2 h-9"
          aria-label="Notifications"
        >
          {/* Bell icon — solid BellDot when unread */}
          {hasNew ? (
            <BellDot className="h-4 w-4 text-primary" />
          ) : (
            <Bell className="h-4 w-4" />
          )}

          {/* Unread badge — visible on both mobile and desktop */}
          {hasNew && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}

          {/* Pulsing dot for new (unread > 0) — desktop only */}
          {hasNew && (
            <span className="absolute -right-0.5 -top-0.5 hidden md:flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="start" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold">Notifications</h4>
            {hasNew && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                {unreadCount} new
              </span>
            )}
          </div>
          {hasNew && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={markAllRead}
            >
              <Check className="h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notification list */}
        <div className="max-h-[380px] overflow-y-auto divide-y">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">All caught up!</p>
            </div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => !n.read && markRead(n.id)}
                className={`w-full text-left px-4 py-3 transition-colors hover:bg-muted/50 ${
                  !n.read ? "bg-primary/5" : ""
                }`}
              >
                <div className="flex items-start gap-2">
                  {/* Unread dot */}
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      !n.read ? "bg-primary" : "bg-transparent"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm leading-snug ${!n.read ? "font-medium" : ""}`}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {n.body}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
