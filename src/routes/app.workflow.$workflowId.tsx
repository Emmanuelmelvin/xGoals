import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useDashboard } from "../components/dashboard-layout";
import { StatusPill } from "../components/dashboard/goal-card";
import { PERMISSION_GROUPS, deleteWorkflow, loadWorkflow, loadWorkflowRuns, updateWorkflowStatus } from "../components/dashboard/goal-persistence";
import { PauseIcon, PlayIcon, ReRunIcon } from "../components/dashboard/icons";
import { Tooltip } from "../components/tooltip";
import { useToast } from "../components/toast";
import type { Deployment, DeploymentStatus, RunStatus, WorkflowRun } from "../components/dashboard/types";

export const Route = createFileRoute("/app/workflow/$workflowId")({
  head: () => ({
    meta: [{ title: "xGoal — Workflow" }],
  }),
  component: WorkflowDetailPage,
});

const permissionLabels = new Map(
  PERMISSION_GROUPS.flatMap((group) => group.entries.map((entry) => [entry.permission, entry.label] as const)),
);

function RunStatusPill({ status }: { status: RunStatus }) {
  const styles =
    status === "running"
      ? "bg-blue-soft text-blue-dark"
      : status === "succeeded"
        ? "bg-emerald-100 text-emerald-800"
        : status === "failed"
          ? "bg-red-100 text-red-700"
          : status === "cancelled"
            ? "bg-wash text-muted"
            : "bg-wash text-muted";
  const label =
    status === "running"
      ? "Running"
      : status === "succeeded"
        ? "Succeeded"
        : status === "failed"
          ? "Failed"
          : status === "cancelled"
            ? "Cancelled"
            : "Queued";
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-bold ${styles}`}>
      {label}
    </span>
  );
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatDuration(run: WorkflowRun) {
  if (!run.startedAt || !run.finishedAt) return "—";
  const ms = new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime();
  if (Number.isNaN(ms) || ms < 0) return "—";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function daysLeft(endsAt: string | null) {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

function WorkflowDetailPage() {
  const { workflowId } = Route.useParams();
  const { user, goals } = useDashboard();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [workflow, setWorkflow] = useState<Deployment | null>(null);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setLoadError(null);
    Promise.all([loadWorkflow({ ownerId: user.id, workflowId }), loadWorkflowRuns({ ownerId: user.id, workflowId })]).then(
      ([workflowResult, runsResult]) => {
        if (!mounted) return;
        setWorkflow(workflowResult.workflow);
        setLoadError(workflowResult.error);
        if (!runsResult.error) setRuns(runsResult.runs);
        setIsLoading(false);
      },
    );
    return () => {
      mounted = false;
    };
  }, [user.id, workflowId]);

  async function changeStatus(status: DeploymentStatus, successMessage: string) {
    if (!workflow || isUpdating) return;
    setIsUpdating(true);
    try {
      const { error } = await updateWorkflowStatus({ ownerId: user.id, workflowId: workflow.id, status });
      if (error) {
        toast.error("The workflow could not be updated.", { description: error });
        return;
      }
      setWorkflow({ ...workflow, status });
      toast.success(successMessage);
    } catch (err) {
      toast.error("The workflow could not be updated.", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDelete() {
    if (!workflow || isDeleting) return;
    setIsDeleting(true);
    try {
      const { error } = await deleteWorkflow({ ownerId: user.id, workflowId: workflow.id });
      if (error) {
        toast.error("The workflow could not be deleted.", { description: error });
        return;
      }
      toast.success("Workflow deleted");
      void navigate({ to: "/app/workflows" });
    } catch (err) {
      toast.error("The workflow could not be deleted.", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsDeleting(false);
    }
  }

  const parentGoal = workflow ? goals.find((goal) => goal.id === workflow.goalId) : undefined;
  const remaining = workflow ? daysLeft(workflow.definition.endsAt) : null;
  const runLength = workflow?.definition.runLengthDays ?? null;
  const runMilestones = workflow?.definition.milestones ?? [];
  const doneMilestones = runMilestones.filter((milestone) => milestone.completed);
  const nextMilestone = runMilestones.find((milestone) => !milestone.completed);
  const startsAtLabel = workflow?.definition.startsAt ? formatDateTime(workflow.definition.startsAt) : null;
  const endsAtLabel = workflow?.definition.endsAt ? formatDateTime(workflow.definition.endsAt) : null;

  return (
    <section className="min-h-screen bg-paper">
      <header className="sticky top-0 z-10 flex min-h-20 items-center gap-4 border-b border-line bg-paper px-5 sm:px-8">
        <Link to="/app/workflows" className="text-sm font-semibold text-muted transition-colors hover:text-ink">
          Workflows
        </Link>
        <span className="text-muted">/</span>
        <p className="truncate text-sm font-semibold">{workflow?.name ?? workflowId}</p>
      </header>

      {isLoading ? (
        <p className="mx-auto max-w-5xl p-5 text-sm text-muted sm:p-8">Loading workflow…</p>
      ) : !workflow ? (
        <section className="mx-auto max-w-5xl p-5 sm:p-8">
          <section className="rounded-3xl border border-dashed border-line bg-wash px-6 py-16 text-center">
            <h1 className="text-xl font-semibold tracking-[-0.04em]">Workflow not found</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
              {loadError ?? "This workflow may have been deleted, or you may not have access to it."}
            </p>
            <Link
              to="/app/workflows"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue px-4 py-2.5 text-sm font-bold text-white"
            >
              Back to workflows
            </Link>
          </section>
        </section>
      ) : (
        <section className="mx-auto max-w-5xl space-y-8 p-5 sm:p-8">
          <header>
            <p className="text-sm font-medium text-blue">Workflow detail</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="min-w-0 flex-1 text-4xl font-semibold tracking-[-0.07em]">{workflow.name}</h1>
              <StatusPill status={workflow.status} />
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              A running instance of{" "}
              {parentGoal ? (
                <Link
                  to="/app/goals/$goalId"
                  params={{ goalId: parentGoal.id }}
                  className="font-semibold text-blue hover:underline"
                >
                  {parentGoal.title}
                </Link>
              ) : (
                "its goal"
              )}
              {runLength !== null
                ? ` · ${runLength}-day run${remaining !== null ? ` · ${remaining} day${remaining === 1 ? "" : "s"} left` : ""}`
                : " · runs until completed"}
              {` · started ${workflow.createdAt || "recently"}`}.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {workflow.status === "running" ? (
                <Tooltip label="Pause workflow">
                  <button
                    type="button"
                    onClick={() => void changeStatus("paused", "Workflow paused")}
                    disabled={isUpdating}
                    aria-label={`Pause ${workflow.name}`}
                    className="grid size-10 place-items-center rounded-xl bg-blue text-white shadow-sm transition-colors hover:bg-blue-dark disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
                  >
                    <PauseIcon />
                  </button>
                </Tooltip>
              ) : null}
              {workflow.status === "paused" ? (
                <Tooltip label="Resume workflow">
                  <button
                    type="button"
                    onClick={() => void changeStatus("running", "Workflow resumed")}
                    disabled={isUpdating}
                    aria-label={`Resume ${workflow.name}`}
                    className="grid size-10 place-items-center rounded-xl bg-blue text-white shadow-sm transition-colors hover:bg-blue-dark disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
                  >
                    <PlayIcon />
                  </button>
                </Tooltip>
              ) : null}
              {workflow.status === "completed" ? (
                <Tooltip label="Re-run workflow">
                  <button
                    type="button"
                    onClick={() => void changeStatus("running", "Workflow restarted")}
                    disabled={isUpdating}
                    aria-label={`Re-run ${workflow.name}`}
                    className="grid size-10 place-items-center rounded-xl bg-blue text-white shadow-sm transition-colors hover:bg-blue-dark disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
                  >
                    <ReRunIcon />
                  </button>
                </Tooltip>
              ) : null}
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-line bg-white p-5">
              <p className="text-sm font-semibold text-muted">Status</p>
              <p className="mt-4">
                <StatusPill status={workflow.status} />
              </p>
              <p className="mt-2 text-xs text-muted">
                {workflow.status === "running" ? "Actively working" : workflow.status === "paused" ? "On hold" : "Finished"}
              </p>
            </article>
            <article className="rounded-2xl border border-line bg-white p-5">
              <p className="text-sm font-semibold text-muted">Run window</p>
              <p className="mt-4 text-lg font-semibold">
                {runLength !== null ? `${runLength} day${runLength === 1 ? "" : "s"}` : "Indefinite"}
              </p>
              <p className="mt-1 text-xs text-muted">
                {startsAtLabel || endsAtLabel
                  ? `${startsAtLabel ?? "Now"} → ${endsAtLabel ?? "no end"}`
                  : remaining !== null
                    ? `${remaining} day${remaining === 1 ? "" : "s"} left`
                    : "Runs until completed"}
              </p>
              {remaining !== null && (startsAtLabel || endsAtLabel) ? (
                <p className="mt-1 text-xs text-muted">
                  {remaining} day{remaining === 1 ? "" : "s"} left
                </p>
              ) : null}
            </article>
            <article className="rounded-2xl border border-line bg-white p-5">
              <p className="text-sm font-semibold text-muted">Milestones</p>
              <p className="mt-4 text-lg font-semibold">
                {doneMilestones.length} of {runMilestones.length} done
              </p>
              {runMilestones.length > 0 ? (
                <div
                  className="mt-3 flex gap-1"
                  role="progressbar"
                  aria-valuenow={doneMilestones.length}
                  aria-valuemin={0}
                  aria-valuemax={runMilestones.length}
                  aria-label={`${doneMilestones.length} of ${runMilestones.length} milestones done`}
                >
                  {runMilestones.map((milestone, index) => (
                    <span
                      key={`${milestone.title}-${index}`}
                      className={`h-1.5 min-w-0 flex-1 rounded-full ${milestone.completed ? "bg-blue" : "bg-line"}`}
                    />
                  ))}
                </div>
              ) : null}
              <p className="mt-2 text-xs text-muted">
                {runMilestones.length === 0
                  ? "No milestones in this run"
                  : nextMilestone ? (
                      <>
                        Next: <span className="font-semibold text-ink">{nextMilestone.title}</span>
                      </>
                    ) : (
                      "All milestones done"
                    )}
              </p>
              <p className="mt-1 text-xs text-muted">Frozen at deploy time</p>
            </article>
          </section>

          <article className="rounded-3xl border border-line bg-white p-6 sm:p-7">
            <h2 className="text-xl font-semibold tracking-[-0.04em]">Activity</h2>
            {runs.length === 0 ? (
              <p className="mt-2 text-sm leading-6 text-muted">
                No runs recorded yet. Each attempt this workflow makes will appear here with its outcome.
              </p>
            ) : (
              <ul className="mt-5 divide-y divide-line border-y border-line">
                {runs.map((run) => (
                  <li key={run.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3.5 text-sm">
                    <RunStatusPill status={run.status} />
                    <span className="min-w-40 flex-1 text-muted">
                      {formatDateTime(run.startedAt)}
                      {run.finishedAt ? ` → ${formatDateTime(run.finishedAt)}` : ""}
                    </span>
                    <span className="text-xs tabular-nums text-muted">{formatDuration(run)}</span>
                    {run.errorMessage ? (
                      <span className="w-full text-xs leading-5 text-red-700">{run.errorMessage}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="rounded-3xl border border-line bg-white p-6 sm:p-7">
            <h2 className="text-xl font-semibold tracking-[-0.04em]">
              Permissions · {workflow.definition.permissions.length}
            </h2>
            {workflow.definition.permissions.length === 0 ? (
              <p className="mt-2 text-sm leading-6 text-muted">This run was deployed without a permission snapshot.</p>
            ) : (
              <ul className="mt-4 flex flex-wrap gap-2">
                {workflow.definition.permissions.map((permission) => (
                  <li
                    key={permission}
                    title={permission}
                    className="rounded-full bg-wash px-3 py-1.5 text-xs font-semibold text-ink"
                  >
                    {permissionLabels.get(permission) ?? permission}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-xs leading-5 text-muted">Frozen at deploy time — editing the goal won't change this run.</p>
          </article>

          <article className="rounded-3xl border border-red-200 bg-white p-6 sm:p-7">
            <h2 className="text-xl font-semibold tracking-[-0.04em]">Danger zone</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Deleting removes this workflow and its run history. The goal it came from is untouched.
            </p>
            <div className="mt-4 flex gap-2">
              {confirmDelete ? (
                <>
                  <button
                    type="button"
                    onClick={() => void handleDelete()}
                    disabled={isDeleting}
                    aria-busy={isDeleting}
                    className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDeleting ? "Deleting…" : "Confirm delete"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    disabled={isDeleting}
                    className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:bg-wash hover:text-ink disabled:opacity-60"
                  >
                    Keep it
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-700 transition-colors hover:bg-red-50"
                >
                  Delete workflow
                </button>
              )}
            </div>
          </article>
        </section>
      )}
    </section>
  );
}
