import { useCallback, useEffect, useState } from "react";
import { useDropdown } from "../dropdown";
import { Tooltip } from "../tooltip";
import { useToast } from "../toast";
import { BellIcon } from "./icons";
import { loadNotifications, markAllNotificationsRead, markNotificationRead } from "./notification-persistence";
import type { NotificationItem } from "./types";

function formatTime(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return "just now";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function NotificationBell({ ownerId }: { ownerId: string }) {
  const { toast } = useToast();
  const { open, closeMenu, toggleMenu, containerRef } = useDropdown();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isMarking, setIsMarking] = useState(false);

  const refresh = useCallback(async () => {
    const { notifications: loaded, error } = await loadNotifications(ownerId);
    setNotifications(loaded);
    setLoadError(error);
    setIsLoading(false);
  }, [ownerId]);

  useEffect(() => {
    setIsLoading(true);
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    void refresh();
  }, [open, refresh]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refresh();
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  const unreadCount = notifications.filter((item) => !item.readAt).length;

  async function handleOpenItem(item: NotificationItem) {
    if (item.readAt) return;
    const { error } = await markNotificationRead({ ownerId, notificationId: item.id });
    if (error) {
      toast.error("Notification could not be marked as read.", { description: error });
      return;
    }
    setNotifications((current) =>
      current.map((entry) => (entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry)),
    );
  }

  async function handleMarkAllRead() {
    if (isMarking || unreadCount === 0) return;
    setIsMarking(true);
    try {
      const { error } = await markAllNotificationsRead({ ownerId });
      if (error) {
        toast.error("Notifications could not be marked as read.", { description: error });
        return;
      }
      const now = new Date().toISOString();
      setNotifications((current) => current.map((entry) => (entry.readAt ? entry : { ...entry, readAt: now })));
    } finally {
      setIsMarking(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Tooltip label={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}` : "Notifications"} placement="bottom">
        <button
          type="button"
          onClick={toggleMenu}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
          className="relative grid size-11 place-items-center rounded-xl border border-line bg-white text-muted transition-colors hover:border-ink hover:text-ink"
        >
          <BellIcon />
          {unreadCount > 0 ? (
            <span className="absolute right-2 top-2 grid min-h-5 min-w-5 place-items-center rounded-full bg-blue px-1 text-[0.65rem] font-bold tabular-nums text-white" aria-hidden="true">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </button>
      </Tooltip>
      {open ? (
        <div
          role="menu"
          aria-label="Notifications"
          className="absolute right-0 top-full z-30 mt-2 max-h-[420px] w-[340px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-line bg-white shadow-xl"
        >
          <div className="sticky top-0 flex items-center justify-between gap-3 bg-white px-4 py-3">
            <p className="text-sm font-bold">Notifications</p>
            <button
              type="button"
              onClick={() => void handleMarkAllRead()}
              disabled={isMarking || unreadCount === 0}
              className="text-xs font-bold text-blue hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline"
            >
              {isMarking ? "Saving…" : "Mark all read"}
            </button>
          </div>
          {isLoading ? (
            <p className="px-4 py-8 text-center text-sm text-muted">Loading notifications…</p>
          ) : loadError ? (
            <p role="alert" className="m-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {loadError}
            </p>
          ) : notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm leading-6 text-muted">
              No notifications yet. Drafts ready for review and run updates will show up here.
            </p>
          ) : (
            <ul>
              {notifications.map((item) => {
                const unread = !item.readAt;
                const content = (
                  <span className="flex items-start gap-3 px-4 py-3.5 text-left">
                    <span aria-hidden="true" className={`mt-1.5 size-2 shrink-0 rounded-full ${unread ? "bg-blue" : "bg-line"}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold leading-5">{item.title}</span>
                      {item.body ? (
                        <span className="mt-0.5 block text-xs leading-5 text-muted">{item.body}</span>
                      ) : null}
                      <span className="mt-1 block text-xs tabular-nums text-muted">{formatTime(item.createdAt)}</span>
                    </span>
                  </span>
                );
                return (
                  <li key={item.id} className={unread ? "bg-blue-pale/30" : undefined}>
                    {item.link ? (
                      <a
                        href={item.link}
                        onClick={() => void handleOpenItem(item)}
                        className="block transition-colors hover:bg-wash"
                      >
                        {content}
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleOpenItem(item)}
                        className="block w-full transition-colors hover:bg-wash"
                      >
                        {content}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <div className="sticky bottom-0 bg-white px-4 py-2.5">
            <button
              type="button"
              onClick={closeMenu}
              className="w-full rounded-xl px-3 py-2 text-sm font-semibold text-muted transition-colors hover:bg-wash hover:text-ink"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
