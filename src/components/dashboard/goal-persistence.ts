import { createClient } from "../../lib/supabase/client";
import type { Goal, GoalStatus } from "./types";

export function isGoalStatus(value: unknown): value is GoalStatus {
  return value === "active" || value === "draft" || value === "paused" || value === "completed";
}

export async function loadGoalsForUser(ownerId: string) {
  const supabase = createClient();
  const [{ data: goalRows, error: goalsError }, { data: workflowRows, error: workflowsError }] = await Promise.all([
    supabase.from("goals").select("id,title,status,updated_at").eq("owner_id", ownerId).order("updated_at", { ascending: false }),
    supabase.from("workflows").select("goal_id").eq("owner_id", ownerId),
  ]);

  if (goalsError) return { goals: [] as Goal[], error: goalsError.message };
  if (workflowsError) return { goals: [] as Goal[], error: workflowsError.message };

  const workflowCounts = new Map<string, number>();
  for (const workflow of workflowRows ?? []) {
    if (typeof workflow.goal_id === "string") workflowCounts.set(workflow.goal_id, (workflowCounts.get(workflow.goal_id) ?? 0) + 1);
  }

  return {
    goals: (goalRows ?? []).map((goal) => ({
      id: goal.id,
      title: goal.title,
      status: isGoalStatus(goal.status) ? goal.status : "draft",
      workflowCount: workflowCounts.get(goal.id) ?? 0,
      updatedAt: new Date(goal.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    })),
    error: null,
  };
}

export type PermissionCatalogEntry = {
  permission: string;
  label: string;
  description: string;
  /** Marks scopes that act publicly or irreversibly on the user's behalf. */
  sensitive?: boolean;
};

export type PermissionGroup = {
  title: string;
  entries: PermissionCatalogEntry[];
};

/**
 * Draftable X API OAuth 2.0 scopes, per
 * https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code
 * (`offline.access` is intentionally excluded: it governs the X connection
 * itself, not an individual goal.)
 */
export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    title: "Read your account",
    entries: [
      { permission: "users.read", label: "Read profiles", description: "See any account you can view, including protected accounts." },
      { permission: "users.email", label: "Read account email", description: "See the email address on the connected account." },
      { permission: "follows.read", label: "Read follows", description: "See who follows you and who you follow." },
      { permission: "mute.read", label: "Read muted accounts", description: "See the accounts you have muted." },
      { permission: "block.read", label: "Read blocked accounts", description: "See the accounts you have blocked." },
    ],
  },
  {
    title: "Read content",
    entries: [
      { permission: "tweet.read", label: "Read posts", description: "See posts you can view, including from protected accounts." },
      { permission: "like.read", label: "Read likes", description: "See posts you have liked and likes you can view." },
      { permission: "bookmark.read", label: "Read bookmarks", description: "See your bookmarked posts." },
      { permission: "list.read", label: "Read lists", description: "See lists, members, and followers, including private lists." },
      { permission: "space.read", label: "Read Spaces", description: "Find live and scheduled audio conversations." },
      { permission: "broadcast.read", label: "Watch broadcasts", description: "View your live broadcasts and their chat." },
      { permission: "dm.read", label: "Read direct messages", description: "See your direct messages, including from protected accounts." },
    ],
  },
  {
    title: "Act for you",
    entries: [
      { permission: "tweet.write", label: "Publish and delete posts", description: "Post, repost, and delete posts on your behalf.", sensitive: true },
      { permission: "tweet.moderate.write", label: "Moderate replies", description: "Hide and unhide replies to your posts." },
      { permission: "like.write", label: "Like posts", description: "Like and unlike posts on your behalf." },
      { permission: "follows.write", label: "Follow accounts", description: "Follow and unfollow accounts on your behalf." },
      { permission: "dm.write", label: "Send direct messages", description: "Send and manage direct messages on your behalf.", sensitive: true },
      { permission: "list.write", label: "Manage lists", description: "Create and manage lists on your behalf." },
      { permission: "media.write", label: "Upload media", description: "Upload images and video for posts." },
      { permission: "broadcast.write", label: "Manage broadcasts", description: "Manage live broadcasts and send chat messages on your behalf." },
    ],
  },
  {
    title: "Restrict others",
    entries: [
      { permission: "block.write", label: "Block accounts", description: "Block and unblock accounts on your behalf.", sensitive: true },
      { permission: "mute.write", label: "Mute accounts", description: "Mute and unmute accounts on your behalf." },
      { permission: "bookmark.write", label: "Manage bookmarks", description: "Bookmark posts and remove bookmarks." },
    ],
  },
];

export type GoalCreationMode = "draft" | "active";

export async function createGoal({ ownerId, title, description, milestones, permissions, mode = "draft" }: { ownerId: string; title: string; description: string; milestones: string[]; permissions: string[]; mode?: GoalCreationMode }) {
  const supabase = createClient();
  const { data: goal, error: goalError } = await supabase
    .from("goals")
    .insert({ owner_id: ownerId, title, prompt: description, plan: { version: 1, milestones }, status: mode })
    .select("id")
    .single();

  if (goalError || !goal) return { id: null as string | null, error: goalError?.message ?? "The goal could not be created." };

  if (permissions.length > 0) {
    const { error: permissionsError } = await supabase.from("goal_permissions").insert(
      permissions.map((permission) => ({ goal_id: goal.id, owner_id: ownerId, permission, decision: "allow", source: "user", reason: "" })),
    );
    if (permissionsError) return { id: goal.id as string, error: permissionsError.message };
  }

  return { id: goal.id as string, error: null as string | null };
}
