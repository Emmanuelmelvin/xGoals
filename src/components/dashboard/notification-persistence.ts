import { createClient } from "../../lib/supabase/client";
import type { NotificationItem, NotificationKind } from "./types";

function isNotificationKind(value: unknown): value is NotificationKind {
  return (
    value === "draft_ready" ||
    value === "run_succeeded" ||
    value === "run_failed" ||
    value === "milestone" ||
    value === "credits_low" ||
    value === "workflow_completed" ||
    value === "info"
  );
}

function toNotification(row: {
  id: string;
  kind: unknown;
  title: unknown;
  body: unknown;
  link: unknown;
  read_at: unknown;
  created_at: unknown;
}): NotificationItem {
  return {
    id: row.id,
    kind: isNotificationKind(row.kind) ? row.kind : "info",
    title: typeof row.title === "string" ? row.title : "Notification",
    body: typeof row.body === "string" ? row.body : "",
    link: typeof row.link === "string" && row.link.startsWith("/") ? row.link : null,
    readAt: typeof row.read_at === "string" ? row.read_at : null,
    createdAt: typeof row.created_at === "string" ? row.created_at : "",
  };
}

export async function loadNotifications(ownerId: string, limit = 20) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id,kind,title,body,link,read_at,created_at")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { notifications: [] as NotificationItem[], error: error.message };
  return {
    notifications: (data ?? []).map((row) =>
      toNotification(row as { id: string; kind: unknown; title: unknown; body: unknown; link: unknown; read_at: unknown; created_at: unknown }),
    ),
    error: null as string | null,
  };
}

export async function markNotificationRead({ ownerId, notificationId }: { ownerId: string; notificationId: string }) {
  const supabase = createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("owner_id", ownerId)
    .is("read_at", null);

  if (error) return { error: error.message };
  return { error: null as string | null };
}

export async function markAllNotificationsRead({ ownerId }: { ownerId: string }) {
  const supabase = createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("owner_id", ownerId)
    .is("read_at", null);

  if (error) return { error: error.message };
  return { error: null as string | null };
}
