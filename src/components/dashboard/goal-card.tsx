import { useId, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Circle, CircleCheck, LoaderCircle } from "lucide-react";
import { Tooltip } from "../tooltip";
import { useToast } from "../toast";
import { useDashboard } from "../dashboard-layout";
import { createDeployment } from "./goal-persistence";
import { BranchIcon, BranchPlusIcon, ClockIcon, MilestoneIcon, PlusIcon, WorkflowIcon } from "./icons";
import type { Goal } from "./types";

function pluralize(count: number, singular: string, plural?: string) {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

function StatusDot({ tone }: { tone: "running" | "paused" | "stopped" }) {
  const toneClass =
    tone === "running" ? "bg-emerald-500" : tone === "paused" ? "bg-amber-500" : "bg-slate-400";
  return <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${toneClass}`} />;
}

function WorkflowBreakdown({ goal }: { goal: Goal }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rows = [
    { key: "running", label: "Running", detail: "Actively working", count: goal.workflows.running },
    { key: "paused", label: "Paused", detail: "On hold", count: goal.workflows.paused },
    { key: "stopped", label: "Stopped", detail: "Ended", count: goal.workflows.stopped },
  ] as const;

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-describedby={panelId}
        aria-expanded={open}
        aria-label={`${goal.workflowCount} ${pluralize(goal.workflowCount, "workflow")} — ${goal.workflows.running} running, ${goal.workflows.paused} paused, ${goal.workflows.stopped} stopped`}
        onClick={() => setOpen(!open)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex items-center gap-1.5 rounded-lg px-1 py-0.5 font-semibold text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
      >
        <WorkflowIcon className="size-4" />
        <span className="tabular-nums">
          {goal.workflowCount}
        </span>
      </button>
      <span
        role="dialog"
        aria-label={`Workflow status for ${goal.title}`}
        id={panelId}
        className={`absolute bottom-full left-0 z-30 mb-2 w-60 rounded-2xl border border-line bg-white p-4 text-left shadow-lg transition-opacity duration-150 motion-reduce:transition-none ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <span className="block text-xs font-bold uppercase tracking-[0.14em] text-muted">
          Workflows · {goal.workflowCount}
        </span>
        {goal.workflowCount === 0 ? (
          <span className="mt-2 block text-xs leading-5 text-muted">
            No workflows yet. Deploy one from this goal to see running, paused, and stopped counts here.
          </span>
        ) : (
          <ul className="mt-3 space-y-2">
            {rows.map((row) => (
              <li key={row.key} className="flex items-center gap-2.5 text-sm">
                <StatusDot tone={row.key} />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink">{row.label}</span>
                  <span className="block text-xs text-muted">{row.detail}</span>
                </span>
                <span className="text-sm font-bold tabular-nums text-ink">{row.count}</span>
              </li>
            ))}
          </ul>
        )}
      </span>
    </span>
  );
}

export function GoalCardMeta({ goal }: { goal: Goal }) {
  return (
    <span className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
      <WorkflowBreakdown goal={goal} />
      <Tooltip label={`${goal.branchCount} ${pluralize(goal.branchCount, "branch", "branches")} in this goal`}>
        <span className="inline-flex items-center gap-1.5 font-semibold text-muted">
          <BranchIcon />
          <span className="tabular-nums">
            {goal.branchCount}
          </span>
        </span>
      </Tooltip>
      <MilestoneBreakdown goal={goal} />
      <Tooltip label={`Last updated ${goal.updatedAt}`}>
        <span className="inline-flex items-center gap-1.5 text-muted">
          <ClockIcon />
          <span>{goal.updatedAt}</span>
        </span>
      </Tooltip>
    </span>
  );
}

export function GoalCardActions({ goal }: { goal: Goal }) {
  const { user, refreshGoals, openCreateGoal } = useDashboard();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isDeploying, setIsDeploying] = useState(false);

  async function handleCreateWorkflow() {
    if (isDeploying) return;
    setIsDeploying(true);
    try {
      const { error } = await createDeployment({
        ownerId: user.id,
        goalId: goal.id,
        name: goal.title,
        milestones: goal.milestones.map((milestone) => milestone.title),
        permissions: [],
      });
      if (error) {
        toast.error("The workflow could not be created.", { description: error });
        return;
      }
      await refreshGoals();
      toast.success("Workflow running", { description: `A running workflow was created from “${goal.title}”.` });
      void navigate({ to: "/app/workflows" });
    } catch (err) {
      toast.error("The workflow could not be created.", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsDeploying(false);
    }
  }

  return (
    <span className="flex shrink-0 items-center gap-2">
      <Tooltip label="Create branch">
        <button
          type="button"
          onClick={openCreateGoal}
          aria-label={`Create branch from ${goal.title}`}
          className="grid size-9 place-items-center rounded-full border border-ink bg-ink text-white shadow-sm transition-colors hover:bg-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
        >
          <BranchPlusIcon />
        </button>
      </Tooltip>
      <Tooltip label="Create workflow">
        <button
          type="button"
          onClick={() => void handleCreateWorkflow()}
          disabled={isDeploying}
          aria-busy={isDeploying}
          aria-label={isDeploying ? `Creating workflow from ${goal.title}…` : `Create workflow from ${goal.title}`}
          className="grid size-9 place-items-center rounded-full border border-blue-dark bg-blue text-white shadow-sm transition-colors hover:bg-blue-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isDeploying ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <PlusIcon />
          )}
        </button>
      </Tooltip>
    </span>
  );
}

function MilestoneBreakdown({ goal }: { goal: Goal }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const total = goal.milestones.length;
  const completed = goal.milestones.filter((milestone) => milestone.completed).length;

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-describedby={panelId}
        aria-expanded={open}
        aria-label={`${completed} of ${total} ${pluralize(total, "milestone")} complete`}
        onClick={() => setOpen(!open)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex items-center gap-1.5 rounded-lg px-1 py-0.5 font-semibold text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
      >
        <MilestoneIcon />
        <span className="tabular-nums">
          {total}
        </span>
      </button>
      <span
        role="dialog"
        aria-label={`Milestones for ${goal.title}`}
        id={panelId}
        className={`absolute bottom-full left-0 z-30 mb-2 w-64 rounded-2xl border border-line bg-white p-4 text-left shadow-lg transition-opacity duration-150 motion-reduce:transition-none ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <span className="block text-xs font-bold uppercase tracking-[0.14em] text-muted">
          Milestones · {completed} of {total}
        </span>
        {total === 0 ? (
          <span className="mt-2 block text-xs leading-5 text-muted">
            No milestones yet. Add checkpoints when you create the goal to track progress here.
          </span>
        ) : (
          <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
            {goal.milestones.map((milestone, index) => (
              <li key={`${milestone.title}-${index}`} className="flex items-start gap-2.5 text-sm">
                {milestone.completed ? (
                  <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-500" aria-hidden="true" strokeWidth={1.8} />
                ) : (
                  <Circle className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" strokeWidth={1.8} />
                )}
                <span
                  className={`min-w-0 flex-1 text-[0.8125rem] leading-5 ${
                    milestone.completed ? "text-muted line-through" : "font-medium text-ink"
                  }`}
                >
                  {milestone.title}
                </span>
              </li>
            ))}
          </ul>
        )}
      </span>
    </span>
  );
}
