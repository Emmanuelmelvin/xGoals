import type { GoalAnalysis } from "../../lib/ai/agent-server-fns";

export function normalizeGoalAnalysis(analysis: GoalAnalysis): GoalAnalysis {
  return {
    ...analysis,
    summary: analysis.summary ?? "",
    outcome: analysis.outcome || analysis.summary || "",
    time_span: analysis.time_span ?? { amount: null, unit: "ongoing", rationale: "" },
    run_plan: analysis.run_plan ?? { cadence: "weekly", count: null, description: "" },
    actions: analysis.actions ?? [],
    landmarks: analysis.landmarks ?? [],
    milestones: analysis.milestones ?? [],
    permissions: (analysis.permissions ?? []).map((permission) => ({
      ...permission,
      reason: permission.reason ?? "",
      decision: permission.decision ?? "review",
    })),
    workflow_suggestions: (analysis.workflow_suggestions ?? []).map((workflow) => ({
      ...workflow,
      description: workflow.description ?? "",
      trigger: workflow.trigger ?? "",
      actions: workflow.actions ?? [],
      cadence: workflow.cadence ?? "weekly",
      run_count: workflow.run_count ?? null,
    })),
  };
}

export function linesToList(value: string) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean);
}
