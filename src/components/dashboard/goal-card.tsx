import { useId, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Tooltip, type TooltipPlacement } from "../tooltip";
import { BranchIcon, BranchPlusIcon, CheckIcon, ClockIcon, MilestoneIcon, PencilIcon, PlusIcon, TrashIcon, WorkflowIcon } from "./icons";
import type { DeploymentStatus, Goal } from "./types";

function pluralize(count: number, singular: string, plural?: string) {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

function StatusDot({ tone }: { tone: "running" | "paused" | "stopped" }) {
  const toneClass =
    tone === "running" ? "bg-emerald-500" : tone === "paused" ? "bg-amber-500" : "bg-slate-400";
  return <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${toneClass}`} />;
}

export function MilestoneStatusIcon({ completed }: { completed: boolean }) {
  if (completed) {
    return (
      <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center rounded-full bg-blue text-white">
        <CheckIcon className="size-3" />
      </span>
    );
  }
  return <span aria-hidden="true" className="size-5 shrink-0 rounded-full border border-line bg-white" />;
}

export function StatusPill({ status }: { status: DeploymentStatus }) {
  const styles =
    status === "running"
      ? "bg-emerald-100 text-emerald-800"
      : status === "paused"
        ? "bg-amber-100 text-amber-800"
        : "bg-wash text-muted";
  const label = status === "running" ? "Running" : status === "paused" ? "Paused" : "Stopped";
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-bold ${styles}`}>
      {label}
    </span>
  );
}

export function WorkflowStatusSummary({ goal }: { goal: Goal }) {
  const items = [
    { key: "running", label: "Running", count: goal.workflows.running },
    { key: "paused", label: "Paused", count: goal.workflows.paused },
    { key: "stopped", label: "Stopped", count: goal.workflows.stopped },
  ] as const;
  return (
    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
      {items.map((item) => (
        <span key={item.key} className="inline-flex items-center gap-1.5">
          <StatusDot tone={item.key} />
          <span className="font-semibold tabular-nums text-ink">{item.count}</span> {item.label}
        </span>
      ))}
    </p>
  );
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
        className={`absolute bottom-full left-0 z-30 mb-2 w-60 rounded-2xl border border-line bg-white p-4 text-left text-sm text-ink shadow-lg transition-opacity duration-150 motion-reduce:transition-none ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <span className="block text-sm font-semibold tracking-[-0.02em] text-ink">
          Workflows · {goal.workflowCount}
        </span>
        {goal.workflowCount === 0 ? (
          <span className="mt-2 block text-xs leading-5 text-muted">
            No workflows yet. Deploy one from this goal to see running, paused, and stopped counts here.
          </span>
        ) : (
          <ul className="mt-3 space-y-2">
            {rows.map((row) => (
              <li key={row.key} className="flex items-center gap-2.5">
                <StatusDot tone={row.key} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink">{row.label}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-muted">{row.detail}</span>
                </span>
                <span className="text-sm font-semibold tabular-nums text-ink">{row.count}</span>
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
      {goal.parentGoalId ? (
        <Tooltip label="This goal was branched from another goal">
          <span className="inline-flex items-center gap-1 rounded-full border border-line bg-wash px-2 py-0.5 text-[0.65rem] font-bold text-muted">
            <BranchIcon className="size-3" />
            Branched
          </span>
        </Tooltip>
      ) : null}
      <Tooltip label={`Last updated ${goal.updatedAt}`}>
        <span className="inline-flex items-center gap-1.5 text-muted">
          <ClockIcon />
          <span>{goal.updatedAt}</span>
        </span>
      </Tooltip>
    </span>
  );
}

export function GoalCardActions({ goal, onEdit, onDelete, tooltipPlacement = "top" }: { goal: Goal; onEdit?: () => void; onDelete?: () => void; tooltipPlacement?: TooltipPlacement }) {
  const navigate = useNavigate();
  const canBranch = !goal.parentGoalId;

  return (
    <span className="flex shrink-0 items-center gap-2">
      {onEdit ? (
        <Tooltip label="Edit goal" placement={tooltipPlacement}>
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Edit ${goal.title}`}
            className="grid size-9 place-items-center rounded-full border border-line bg-white text-ink shadow-sm transition-colors hover:bg-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
          >
            <PencilIcon />
          </button>
        </Tooltip>
      ) : null}
      <Tooltip label={canBranch ? "Create branch" : "Only top-level goals can branch"} placement={tooltipPlacement}>
        <button
          type="button"
          onClick={canBranch ? () => void navigate({ to: "/app/goals/branch/$goalId", params: { goalId: goal.id } }) : undefined}
          disabled={!canBranch}
          aria-label={canBranch ? `Create branch from ${goal.title}` : `${goal.title} is a branch and can't branch further`}
          className={`grid size-9 place-items-center rounded-full border border-ink bg-ink text-white shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue disabled:cursor-not-allowed disabled:opacity-40 ${canBranch ? "hover:bg-ink-soft" : ""}`}
        >
          <BranchPlusIcon />
        </button>
      </Tooltip>
      <Tooltip label="Create workflow" placement={tooltipPlacement}>
        <button
          type="button"
          onClick={() => void navigate({ to: "/app/workflows/new", search: { goal: goal.id } })}
          aria-label={`Create workflow from ${goal.title}`}
          className="grid size-9 place-items-center rounded-full border border-blue-dark bg-blue text-white shadow-sm transition-colors hover:bg-blue-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
        >
          <PlusIcon />
        </button>
      </Tooltip>
      {onDelete ? (
        <Tooltip label={goal.parentGoalId ? "Delete branch" : "Delete goal"} placement={tooltipPlacement}>
          <button
            type="button"
            onClick={onDelete}
            aria-label={goal.parentGoalId ? `Delete branch ${goal.title}` : `Delete goal ${goal.title}`}
            className="grid size-9 place-items-center rounded-full border border-red-200 bg-white text-red-600 shadow-sm transition-colors hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
          >
            <TrashIcon />
          </button>
        </Tooltip>
      ) : null}
    </span>
  );
}

function MilestoneBreakdown({ goal }: { goal: Goal }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const total = goal.milestones.length;
  const visibleMilestones = goal.milestones.slice(0, 10);
  const hiddenCount = total - visibleMilestones.length;

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
        aria-label={`${total} ${pluralize(total, "milestone")}`}
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
        className={`absolute bottom-full left-0 z-30 mb-2 w-64 rounded-2xl border border-line bg-white p-4 text-left text-sm text-ink shadow-lg transition-opacity duration-150 motion-reduce:transition-none ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <span className="block text-sm font-semibold tracking-[-0.02em] text-ink">
          Milestones
        </span>
        {total === 0 ? (
          <span className="mt-2 block text-xs leading-5 text-muted">
            No milestones yet. Add checkpoints when you create the goal to track progress here.
          </span>
        ) : (
          <>
            <ol className="mt-3 space-y-2 pl-6 marker:text-muted list-[lower-roman]">
              {visibleMilestones.map((milestone, index) => (
                <li key={`${milestone.title}-${index}`} className="pl-1 text-sm leading-5">
                  <span className="inline-flex items-center gap-2">
                    <MilestoneStatusIcon completed={milestone.completed} />
                    <span className={milestone.completed ? "text-muted line-through" : "text-ink"}>
                      {milestone.title}
                    </span>
                    <span className="sr-only">{milestone.completed ? "(completed)" : "(not completed)"}</span>
                  </span>
                </li>
              ))}
            </ol>
            {hiddenCount > 0 ? (
              <p className="mt-2 text-xs text-muted">+{hiddenCount} more — open the goal to see all</p>
            ) : null}
          </>
        )}
      </span>
    </span>
  );
}
