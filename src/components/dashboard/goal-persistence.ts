import { createClient } from "../../lib/supabase/client";
import type { Deployment, DeploymentStatus, Goal, Milestone } from "./types";

export function isDeploymentStatus(value: unknown): value is DeploymentStatus {
  return value === "running" || value === "paused" || value === "stopped";
}

export async function loadGoalsForUser(ownerId: string) {
  const supabase = createClient();
  const [{ data: goalRows, error: goalsError }, { data: workflowRows, error: workflowsError }] = await Promise.all([
    supabase.from("goals").select("id,title,updated_at,plan,parent_goal_id").eq("owner_id", ownerId).order("updated_at", { ascending: false }),
    supabase.from("workflows").select("goal_id,status").eq("owner_id", ownerId),
  ]);

  if (goalsError) return { goals: [] as Goal[], error: goalsError.message };
  if (workflowsError) return { goals: [] as Goal[], error: workflowsError.message };

  const workflowCounts = new Map<string, number>();
  const workflowBreakdowns = new Map<string, { running: number; paused: number; stopped: number }>();
  for (const workflow of workflowRows ?? []) {
    if (typeof workflow.goal_id !== "string") continue;
    workflowCounts.set(workflow.goal_id, (workflowCounts.get(workflow.goal_id) ?? 0) + 1);
    const breakdown = workflowBreakdowns.get(workflow.goal_id) ?? { running: 0, paused: 0, stopped: 0 };
    if (isDeploymentStatus(workflow.status)) breakdown[workflow.status] += 1;
    else breakdown.stopped += 1;
    workflowBreakdowns.set(workflow.goal_id, breakdown);
  }

  const branchCounts = new Map<string, number>();
  for (const goal of goalRows ?? []) {
    if (typeof goal.parent_goal_id === "string" && goal.parent_goal_id) {
      branchCounts.set(goal.parent_goal_id, (branchCounts.get(goal.parent_goal_id) ?? 0) + 1);
    }
  }

  function getMilestones(plan: unknown): Milestone[] {
    if (typeof plan !== "object" || plan === null) return [];
    const raw = (plan as { milestones?: unknown }).milestones;
    if (!Array.isArray(raw)) return [];
    const milestones: Milestone[] = [];
    for (const entry of raw) {
      if (typeof entry === "string") {
        const title = entry.trim();
        if (title) milestones.push({ title, completed: false });
      } else if (typeof entry === "object" && entry !== null) {
        const record = entry as Record<string, unknown>;
        const titleSource = record.title ?? record.text ?? record.label ?? record.name;
        const title = typeof titleSource === "string" ? titleSource.trim() : "";
        if (!title) continue;
        const status = record.status ?? record.state;
        const completed =
          record.completed === true ||
          record.done === true ||
          record.is_complete === true ||
          record.isComplete === true ||
          status === "completed" ||
          status === "complete" ||
          status === "done";
        milestones.push({ title, completed });
      }
    }
    return milestones;
  }

  return {
    goals: (goalRows ?? []).map((goal) => ({
      id: goal.id,
      title: goal.title,
      workflowCount: workflowCounts.get(goal.id) ?? 0,
      workflows: workflowBreakdowns.get(goal.id) ?? { running: 0, paused: 0, stopped: 0 },
      branchCount: branchCounts.get(goal.id) ?? 0,
      milestones: getMilestones(goal.plan),
      updatedAt: new Date(goal.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    })),
    error: null,
  };
}

export async function loadDeploymentsForUser(ownerId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("workflows")
    .select("id,goal_id,name,status")
    .eq("owner_id", ownerId)
    .order("updated_at", { ascending: false });

  if (error) return { deployments: [] as Deployment[], error: error.message };

  return {
    deployments: (data ?? []).map((row) => ({
      id: row.id,
      goalId: row.goal_id,
      name: row.name,
      status: isDeploymentStatus(row.status) ? row.status : "stopped",
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

export type GoalCreationMode = "goal" | "deploy";

export async function createGoal({ ownerId, title, description, milestones, permissions }: { ownerId: string; title: string; description: string; milestones: string[]; permissions: string[] }) {
  const supabase = createClient();
  const { data: goal, error: goalError } = await supabase
    .from("goals")
    .insert({ owner_id: ownerId, title, prompt: description, plan: { version: 1, milestones } })
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

export async function createDeployment({ ownerId, goalId, name, milestones, permissions }: { ownerId: string; goalId: string; name: string; milestones: string[]; permissions: string[] }) {
  const supabase = createClient();
  const { error } = await supabase.from("workflows").insert({
    goal_id: goalId,
    owner_id: ownerId,
    name,
    status: "running",
    definition: { version: 1, milestones, permissions, approval_required: true },
  });

  if (error) return { error: error.message };
  return { error: null as string | null };
}
