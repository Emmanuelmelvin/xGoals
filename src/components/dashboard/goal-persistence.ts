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
};

export type PermissionGroup = {
  title: string;
  entries: PermissionCatalogEntry[];
};

/** Mirrors the agent's allowed permission catalog (see agent/main.py). */
export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    title: "Your account",
    entries: [
      { permission: "profile:read", label: "Read your profile", description: "Let the agent see your X profile details." },
      { permission: "profile:update", label: "Update your profile", description: "Let the agent change your display name, bio, or avatar." },
    ],
  },
  {
    title: "Posts and drafts",
    entries: [
      { permission: "posts:read", label: "Read posts", description: "Let the agent read your posts and drafts." },
      { permission: "posts:draft:create", label: "Create drafts", description: "Let the agent prepare draft posts for your review." },
      { permission: "posts:draft:update", label: "Edit drafts", description: "Let the agent revise drafts before you approve them." },
      { permission: "posts:draft:delete", label: "Delete drafts", description: "Let the agent discard drafts you no longer need." },
      { permission: "posts:create", label: "Publish posts", description: "Let the agent publish posts to your account." },
      { permission: "posts:delete", label: "Delete posts", description: "Let the agent remove published posts." },
    ],
  },
  {
    title: "Insights",
    entries: [
      { permission: "mentions:read", label: "Read mentions", description: "Let the agent see posts that mention you." },
      { permission: "analytics:read", label: "Read analytics", description: "Let the agent see how your posts perform." },
      { permission: "search:read", label: "Search X", description: "Let the agent search public posts for research." },
    ],
  },
];

export async function createGoal({ ownerId, title, description, milestones, permissions }: { ownerId: string; title: string; description: string; milestones: string[]; permissions: string[] }) {
  const supabase = createClient();
  const { data: goal, error: goalError } = await supabase
    .from("goals")
    .insert({ owner_id: ownerId, title, prompt: description, plan: { version: 1, milestones }, status: "draft" })
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
