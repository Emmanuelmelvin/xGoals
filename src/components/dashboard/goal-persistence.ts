import { createClient } from "../../lib/supabase/client";
import type { Deployment, DeploymentStatus, Goal, GoalVisibility, Milestone, PublicGoal, PublicGoalBranch, PublicGoalDetail, PublicGoalOwner, RunStatus, Skill, WorkflowDefinition, WorkflowRun } from "./types";

export function isDeploymentStatus(value: unknown): value is DeploymentStatus {
  return value === "running" || value === "paused" || value === "completed";
}

export function isGoalVisibility(value: unknown): value is GoalVisibility {
  return value === "private" || value === "public";
}

export function isRunStatus(value: unknown): value is RunStatus {
  return value === "queued" || value === "running" || value === "succeeded" || value === "failed" || value === "cancelled";
}

export function parseMilestoneList(raw: unknown): Milestone[] {
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

function parseStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string");
}

export function parseSkillList(raw: unknown): Skill[] {
  if (!Array.isArray(raw)) return [];
  const skills: Skill[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const record = entry as Record<string, unknown>;
    const nameSource = record.name ?? record.title ?? record.label;
    const name = typeof nameSource === "string" ? nameSource.trim() : "";
    const bodySource = record.body ?? record.content ?? record.text ?? record.instructions;
    const body = typeof bodySource === "string" ? bodySource.trim() : "";
    if (!name || !body) continue;
    skills.push({ name, body });
  }
  return skills;
}

export function parseWorkflowDefinition(value: unknown): WorkflowDefinition {
  if (typeof value !== "object" || value === null) {
    return { milestones: [], skills: [], permissions: [], runLengthDays: null, endsAt: null, startsAt: null };
  }
  const record = value as Record<string, unknown>;
  const runLengthDays = typeof record.run_length_days === "number" && record.run_length_days > 0 ? Math.floor(record.run_length_days) : null;
  return {
    milestones: parseMilestoneList(record.milestones),
    skills: parseSkillList(record.skills),
    permissions: parseStringList(record.permissions),
    runLengthDays,
    endsAt: typeof record.ends_at === "string" && record.ends_at ? record.ends_at : null,
    startsAt: typeof record.starts_at === "string" && record.starts_at ? record.starts_at : null,
  };
}

function toShortDate(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function toDeployment(row: { id: string; goal_id: string; name: string; status: unknown; created_at: string; definition: unknown }): Deployment {
  return {
    id: row.id,
    goalId: row.goal_id,
    name: row.name,
    status: isDeploymentStatus(row.status) ? row.status : "paused",
    createdAt: toShortDate(row.created_at),
    definition: parseWorkflowDefinition(row.definition),
  };
}

export async function loadGoalsForUser(ownerId: string) {
  const supabase = createClient();
  const [{ data: goalRows, error: goalsError }, { data: workflowRows, error: workflowsError }] = await Promise.all([
    supabase.from("goals").select("id,title,updated_at,plan,parent_goal_id,prompt,visibility").eq("owner_id", ownerId).order("updated_at", { ascending: false }),
    supabase.from("workflows").select("goal_id,status").eq("owner_id", ownerId),
  ]);

  if (goalsError) return { goals: [] as Goal[], error: goalsError.message };
  if (workflowsError) return { goals: [] as Goal[], error: workflowsError.message };

  const workflowCounts = new Map<string, number>();
  const workflowBreakdowns = new Map<string, { running: number; paused: number; completed: number }>();
  for (const workflow of workflowRows ?? []) {
    if (typeof workflow.goal_id !== "string") continue;
    workflowCounts.set(workflow.goal_id, (workflowCounts.get(workflow.goal_id) ?? 0) + 1);
    const breakdown = workflowBreakdowns.get(workflow.goal_id) ?? { running: 0, paused: 0, completed: 0 };
    if (isDeploymentStatus(workflow.status)) breakdown[workflow.status] += 1;
    else breakdown.paused += 1;
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
    return parseMilestoneList((plan as { milestones?: unknown }).milestones);
  }

  function getSkills(plan: unknown): Skill[] {
    if (typeof plan !== "object" || plan === null) return [];
    return parseSkillList((plan as { skills?: unknown }).skills);
  }

  return {
    goals: (goalRows ?? []).map((goal) => ({
      id: goal.id,
      title: goal.title,
      description: typeof goal.prompt === "string" && goal.prompt.trim() ? goal.prompt : null,
      parentGoalId: typeof goal.parent_goal_id === "string" && goal.parent_goal_id ? goal.parent_goal_id : null,
      visibility: isGoalVisibility(goal.visibility) ? goal.visibility : "private",
      workflowCount: workflowCounts.get(goal.id) ?? 0,
      workflows: workflowBreakdowns.get(goal.id) ?? { running: 0, paused: 0, completed: 0 },
      branchCount: branchCounts.get(goal.id) ?? 0,
      milestones: getMilestones(goal.plan),
      skills: getSkills(goal.plan),
      updatedAt: new Date(goal.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    })),
    error: null,
  };
}

export async function loadDeploymentsForUser(ownerId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("workflows")
    .select("id,goal_id,name,status,created_at,definition")
    .eq("owner_id", ownerId)
    .order("updated_at", { ascending: false });

  if (error) return { deployments: [] as Deployment[], error: error.message };

  return {
    deployments: (data ?? []).map((row) => toDeployment(row as { id: string; goal_id: string; name: string; status: unknown; created_at: string; definition: unknown })),
    error: null,
  };
}

export async function loadWorkflow({ ownerId, workflowId }: { ownerId: string; workflowId: string }) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("workflows")
    .select("id,goal_id,name,status,created_at,definition")
    .eq("owner_id", ownerId)
    .eq("id", workflowId)
    .single();

  if (error || !data) return { workflow: null as Deployment | null, error: error?.message ?? "Workflow not found." };
  return { workflow: toDeployment(data as { id: string; goal_id: string; name: string; status: unknown; created_at: string; definition: unknown }), error: null };
}

export async function loadWorkflowRuns({ ownerId, workflowId }: { ownerId: string; workflowId: string }) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("workflow_runs")
    .select("id,status,started_at,finished_at,error_message")
    .eq("owner_id", ownerId)
    .eq("workflow_id", workflowId)
    .order("created_at", { ascending: false });

  if (error) return { runs: [] as WorkflowRun[], error: error.message };

  return {
    runs: (data ?? []).map((row) => ({
      id: row.id,
      status: isRunStatus(row.status) ? row.status : "queued",
      startedAt: typeof row.started_at === "string" ? row.started_at : null,
      finishedAt: typeof row.finished_at === "string" ? row.finished_at : null,
      errorMessage: typeof row.error_message === "string" && row.error_message ? row.error_message : null,
    })),
    error: null,
  };
}

export async function updateWorkflowStatus({ ownerId, workflowId, status }: { ownerId: string; workflowId: string; status: DeploymentStatus }) {
  const supabase = createClient();
  const { error } = await supabase
    .from("workflows")
    .update({ status })
    .eq("id", workflowId)
    .eq("owner_id", ownerId);

  if (error) return { error: error.message };
  return { error: null as string | null };
}

export async function deleteWorkflow({ ownerId, workflowId }: { ownerId: string; workflowId: string }) {
  const supabase = createClient();
  const { error } = await supabase.from("workflows").delete().eq("id", workflowId).eq("owner_id", ownerId);

  if (error) return { error: error.message };
  return { error: null as string | null };
}

export async function updateGoal({ ownerId, goalId, title, description, milestones, skills, permissions }: { ownerId: string; goalId: string; title: string; description: string; milestones: string[]; skills: Skill[]; permissions: string[] | null }) {
  const supabase = createClient();
  const { error: goalError } = await supabase
    .from("goals")
    .update({ title, prompt: description, plan: { version: 1, milestones, skills } })
    .eq("id", goalId)
    .eq("owner_id", ownerId);

  if (goalError) return { error: goalError.message };

  // null means "unknown" (e.g. the current set failed to load) — leave stored
  // permissions untouched instead of wiping them.
  if (permissions === null) return { error: null as string | null };

  const { error: deleteError } = await supabase
    .from("goal_permissions")
    .delete()
    .eq("goal_id", goalId)
    .eq("owner_id", ownerId);

  if (deleteError) return { error: deleteError.message };

  if (permissions.length > 0) {
    const { error: permissionsError } = await supabase.from("goal_permissions").insert(
      permissions.map((permission) => ({ goal_id: goalId, owner_id: ownerId, permission, decision: "allow", source: "user", reason: "" })),
    );
    if (permissionsError) return { error: permissionsError.message };
  }

  return { error: null as string | null };
}

export async function updateGoalVisibility({ ownerId, goalId, visibility }: { ownerId: string; goalId: string; visibility: GoalVisibility }) {
  const supabase = createClient();
  const { error } = await supabase
    .from("goals")
    .update({ visibility })
    .eq("id", goalId)
    .eq("owner_id", ownerId);

  if (error) return { error: error.message };
  return { error: null as string | null };
}

export async function deleteGoal({ ownerId, goalId }: { ownerId: string; goalId: string }) {
  const supabase = createClient();
  const { error } = await supabase.from("goals").delete().eq("id", goalId).eq("owner_id", ownerId);

  if (error) return { error: error.message };
  return { error: null as string | null };
}

export async function updateGoalParent({ ownerId, goalId, parentGoalId }: { ownerId: string; goalId: string; parentGoalId: string | null }) {
  const supabase = createClient();
  const { error } = await supabase
    .from("goals")
    .update({ parent_goal_id: parentGoalId })
    .eq("id", goalId)
    .eq("owner_id", ownerId);

  if (error) return { error: error.message };
  return { error: null as string | null };
}

export async function updateGoalMilestone({ ownerId, goalId, index, completed }: { ownerId: string; goalId: string; index: number; completed: boolean }) {
  const supabase = createClient();
  const { data, error: loadError } = await supabase
    .from("goals")
    .select("plan")
    .eq("id", goalId)
    .eq("owner_id", ownerId)
    .single();
  if (loadError || !data) return { error: loadError?.message ?? "Goal not found." };

  const plan = (data as { plan: unknown }).plan as { milestones?: unknown; skills?: unknown } | null;
  const milestones = parseMilestoneList(plan?.milestones);
  if (index < 0 || index >= milestones.length) return { error: "Milestone not found." };
  milestones[index] = { ...milestones[index], completed };
  const skills = parseSkillList(plan?.skills);

  const { error } = await supabase
    .from("goals")
    .update({ plan: { version: 1, milestones, skills } })
    .eq("id", goalId)
    .eq("owner_id", ownerId);
  if (error) return { error: error.message };
  return { error: null as string | null };
}

export async function updateWorkflowMilestone({ ownerId, workflowId, index, completed }: { ownerId: string; workflowId: string; index: number; completed: boolean }) {
  const supabase = createClient();
  const { data, error: loadError } = await supabase
    .from("workflows")
    .select("definition")
    .eq("id", workflowId)
    .eq("owner_id", ownerId)
    .single();
  if (loadError || !data) return { error: loadError?.message ?? "Workflow not found." };

  const definition = parseWorkflowDefinition((data as { definition: unknown }).definition);
  if (index < 0 || index >= definition.milestones.length) return { error: "Milestone not found." };
  const milestones = definition.milestones.map((milestone, i) =>
    i === index ? { ...milestone, completed } : milestone,
  );

  const { error } = await supabase
    .from("workflows")
    .update({
      definition: {
        version: 1,
        milestones,
        skills: definition.skills,
        permissions: definition.permissions,
        approval_required: true,
        run_length_days: definition.runLengthDays,
        ends_at: definition.endsAt,
        starts_at: definition.startsAt,
      },
    })
    .eq("id", workflowId)
    .eq("owner_id", ownerId);
  if (error) return { error: error.message };
  return { error: null as string | null };
}

export async function loadGoalPermissions(ownerId: string, goalId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("goal_permissions")
    .select("permission")
    .eq("owner_id", ownerId)
    .eq("goal_id", goalId);

  if (error) return { permissions: [] as string[], error: error.message };

  return {
    permissions: (data ?? [])
      .map((row) => row.permission)
      .filter((permission): permission is string => typeof permission === "string"),
    error: null,
  };
}

type PublicGoalRow = {
  id: string;
  owner_id: string;
  title: string;
  prompt: string | null;
  parent_goal_id: string | null;
  visibility: unknown;
  plan: unknown;
  updated_at: string;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  x_handle: string | null;
  avatar_url: string | null;
};

function toPublicOwner(row: ProfileRow): PublicGoalOwner {
  return {
    displayName: typeof row.display_name === "string" && row.display_name ? row.display_name : null,
    handle: typeof row.x_handle === "string" && row.x_handle ? row.x_handle : null,
    avatarUrl: typeof row.avatar_url === "string" && row.avatar_url ? row.avatar_url : null,
  };
}

async function loadOwners(ownerIds: string[]) {
  const unique = [...new Set(ownerIds.filter((id) => typeof id === "string" && id))];
  const owners = new Map<string, PublicGoalOwner | null>();
  if (unique.length === 0) return owners;
  const supabase = createClient();
  // Public identity only — public_profiles exposes no emails or tokens.
  const { data, error } = await supabase
    .from("public_profiles")
    .select("id,display_name,x_handle,avatar_url")
    .in("id", unique);
  if (error) return owners;
  for (const row of (data ?? []) as ProfileRow[]) {
    owners.set(row.id, toPublicOwner(row));
  }
  return owners;
}

function toPublicGoal(row: PublicGoalRow, owners: Map<string, PublicGoalOwner | null>, branchCount: number): PublicGoal {
  return {
    id: row.id,
    ownerId: row.owner_id,
    owner: owners.get(row.owner_id) ?? null,
    title: row.title,
    description: typeof row.prompt === "string" && row.prompt.trim() ? row.prompt : null,
    parentGoalId: typeof row.parent_goal_id === "string" && row.parent_goal_id ? row.parent_goal_id : null,
    visibility: isGoalVisibility(row.visibility) ? row.visibility : "private",
    workflowCount: 0,
    workflows: { running: 0, paused: 0, completed: 0 },
    branchCount,
    milestones: parseMilestoneList((row.plan as { milestones?: unknown } | null)?.milestones),
    skills: parseSkillList((row.plan as { skills?: unknown } | null)?.skills),
    updatedAt: toShortDate(row.updated_at),
  };
}

/** Top-level public goals for discovery, newest first. Workflow data stays private. */
export async function loadPublicGoals() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("goals")
    .select("id,owner_id,title,prompt,parent_goal_id,visibility,plan,updated_at")
    .eq("visibility", "public")
    .is("parent_goal_id", null)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) return { goals: [] as PublicGoal[], error: error.message };

  const rows = (data ?? []) as PublicGoalRow[];
  const ids = rows.map((row) => row.id);
  const [owners, branchResult] = await Promise.all([
    loadOwners(rows.map((row) => row.owner_id)),
    ids.length > 0
      ? supabase.from("goals").select("parent_goal_id").in("parent_goal_id", ids).eq("visibility", "public")
      : Promise.resolve({ data: [] as { parent_goal_id: string | null }[], error: null }),
  ]);
  const branchCounts = new Map<string, number>();
  if (!branchResult.error) {
    for (const row of branchResult.data ?? []) {
      if (typeof row.parent_goal_id === "string" && row.parent_goal_id) {
        branchCounts.set(row.parent_goal_id, (branchCounts.get(row.parent_goal_id) ?? 0) + 1);
      }
    }
  }

  return {
    goals: rows.map((row) => toPublicGoal(row, owners, branchCounts.get(row.id) ?? 0)),
    error: null as string | null,
  };
}

/** A single public goal with its owner, public parent link, and public branches. */
export async function loadPublicGoal(goalId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("goals")
    .select("id,owner_id,title,prompt,parent_goal_id,visibility,plan,updated_at")
    .eq("id", goalId)
    .eq("visibility", "public")
    .single();

  if (error || !data) return { goal: null as PublicGoalDetail | null, error: error?.message ?? "Goal not found." };

  const row = data as PublicGoalRow;
  const [branchResult, parentResult] = await Promise.all([
    supabase
      .from("goals")
      .select("id,owner_id,title,prompt,plan,updated_at")
      .eq("parent_goal_id", row.id)
      .eq("visibility", "public")
      .order("updated_at", { ascending: false }),
    row.parent_goal_id
      ? supabase.from("goals").select("id,title,visibility").eq("id", row.parent_goal_id).single()
      : Promise.resolve({ data: null, error: null as { message: string } | null }),
  ]);

  const branchRows = (!branchResult.error ? (branchResult.data ?? []) : []) as PublicGoalRow[];
  const owners = await loadOwners([row.owner_id, ...branchRows.map((branch) => branch.owner_id)]);
  const parentRow = (!parentResult.error ? parentResult.data : null) as { id: string; title: string; visibility: unknown } | null;

  return {
    goal: {
      ...toPublicGoal(row, owners, branchRows.length),
      parent:
        parentRow && isGoalVisibility(parentRow.visibility) && parentRow.visibility === "public"
          ? { id: parentRow.id, title: parentRow.title }
          : null,
      branches: branchRows.map((branch): PublicGoalBranch => ({
        id: branch.id,
        title: branch.title,
        description: typeof branch.prompt === "string" && branch.prompt.trim() ? branch.prompt : null,
        updatedAt: toShortDate(branch.updated_at),
        milestoneCount: parseMilestoneList((branch.plan as { milestones?: unknown } | null)?.milestones).length,
        owner: owners.get(branch.owner_id) ?? null,
      })),
    } satisfies PublicGoalDetail,
    error: null as string | null,
  };
}

/** Permission scope names of a public goal (RLS restricts this to public goals). */
export async function loadPermissionsForPublicGoal(goalId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("goal_permissions")
    .select("permission")
    .eq("goal_id", goalId);

  if (error) return { permissions: [] as string[], error: error.message };

  return {
    permissions: (data ?? [])
      .map((row) => row.permission)
      .filter((permission): permission is string => typeof permission === "string"),
    error: null as string | null,
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

export async function createGoal({ ownerId, title, description, milestones, skills, permissions, parentGoalId, visibility }: { ownerId: string; title: string; description: string; milestones: string[]; skills: Skill[]; permissions: string[]; parentGoalId?: string | null; visibility?: GoalVisibility }) {
  const supabase = createClient();
  const { data: goal, error: goalError } = await supabase
    .from("goals")
    .insert({ owner_id: ownerId, title, prompt: description, plan: { version: 1, milestones, skills }, parent_goal_id: parentGoalId ?? null, visibility: visibility ?? "private" })
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

export async function createDeployment({ ownerId, goalId, name, milestones, skills, permissions, runLengthDays, endsAt, startsAt }: { ownerId: string; goalId: string; name: string; milestones: string[]; skills: Skill[]; permissions: string[]; runLengthDays?: number | null; endsAt?: string | null; startsAt?: string | null }) {
  const supabase = createClient();
  const { data, error } = await supabase.from("workflows").insert({
    goal_id: goalId,
    owner_id: ownerId,
    name,
    status: "running",
    definition: { version: 1, milestones, skills, permissions, approval_required: true, run_length_days: runLengthDays ?? null, ends_at: endsAt ?? null, starts_at: startsAt ?? null },
  }).select("id").single();

  if (error || !data) return { id: null as string | null, error: error?.message ?? "The workflow could not be created." };
  return { id: data.id as string, error: null as string | null };
}
