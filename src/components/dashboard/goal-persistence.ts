import { createClient } from "../../lib/supabase/client";
import type { Goal, GoalStatus } from "./types";
import type { GoalAnalysis } from "../../lib/ai/agent-server-fns";

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

export type GoalCreationMode = "goal" | "deploy" | "schedule";

export async function persistGoal({ ownerId, title, prompt, analysis, mode, scheduledFor }: { ownerId: string; title: string; prompt: string; analysis: GoalAnalysis; mode: GoalCreationMode; scheduledFor: string }) {
  const supabase = createClient();
  const plan = { ...analysis, execution_mode: mode, scheduled_for: mode === "schedule" ? scheduledFor : null };
  const { data, error } = await supabase.from("goals").insert({ owner_id: ownerId, title, prompt, plan, status: mode === "goal" ? "draft" : "active" }).select("id,title,status,updated_at").single();
  if (error || !data) return { data: null, error: error?.message ?? "The goal could not be created." };

  let saveErrorMessage: string | null = null;
  if (analysis.permissions.length > 0) {
    const { error: permissionsError } = await supabase.from("goal_permissions").insert(analysis.permissions.map((suggestion) => ({ goal_id: data.id, owner_id: ownerId, permission: suggestion.permission, reason: suggestion.reason, decision: suggestion.decision, source: suggestion.decision === "review" ? "ai" : "user" })));
    if (permissionsError) saveErrorMessage = permissionsError.message;
  }

  if (mode !== "goal" && analysis.workflow_suggestions.length > 0) {
    const { error: workflowsError } = await supabase.from("workflows").insert(analysis.workflow_suggestions.map((workflow) => ({
      goal_id: data.id,
      owner_id: ownerId,
      name: workflow.name,
      status: mode === "deploy" ? "deployed" : "draft",
      definition: {
        description: workflow.description,
        trigger: workflow.trigger,
        actions: workflow.actions,
        cadence: workflow.cadence,
        run_count: workflow.run_count,
        goal_run_plan: analysis.run_plan,
        execution_mode: mode,
        scheduled_for: mode === "schedule" ? scheduledFor : null,
        approval_required: true,
      },
    })));
    if (workflowsError) saveErrorMessage = workflowsError.message;
  }

  return {
    data: {
      ...data,
      status: isGoalStatus(data.status) ? data.status : "draft",
      workflowCount: mode === "goal" ? 0 : analysis.workflow_suggestions.length,
      updatedAt: "Just now",
    } satisfies Goal,
    error: saveErrorMessage,
  };
}
