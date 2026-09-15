import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useDashboard } from "../components/dashboard-layout";
import { StatusPill } from "../components/dashboard/goal-card";
import { loadDeploymentsForUser } from "../components/dashboard/goal-persistence";
import { ChevronRightIcon, PlusIcon } from "../components/dashboard/icons";
import { SelectDropdown } from "../components/dropdown";
import type { Deployment, DeploymentStatus } from "../components/dashboard/types";

export const Route = createFileRoute("/app/workflows/")({
  head: () => ({
    meta: [{ title: "xGoal — Workflows" }],
  }),
  component: WorkflowsPage,
});

function WorkflowsPage() {
  const { user, goals, openCreateGoal } = useDashboard();
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [deploymentsError, setDeploymentsError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | DeploymentStatus>("all");
  const [goalFilter, setGoalFilter] = useState<string>("all");

  useEffect(() => {
    let mounted = true;
    loadDeploymentsForUser(user.id).then(({ deployments: loaded, error: loadError }) => {
      if (!mounted) return;
      setDeployments(loaded);
      setDeploymentsError(loadError);
    });
    return () => { mounted = false; };
  }, [user.id]);

  const workflowCount = goals.reduce((total, goal) => total + goal.workflowCount, 0);
  const runningCount = deployments.filter((deployment) => deployment.status === "running").length;
  const pausedCount = deployments.filter((deployment) => deployment.status === "paused").length;
  const completedCount = deployments.filter((deployment) => deployment.status === "completed").length;
  const goalsWithWorkflows = goals.filter((goal) => deployments.some((deployment) => deployment.goalId === goal.id));
  const goalById = new Map(goals.map((goal) => [goal.id, goal] as const));
  const isFiltering = statusFilter !== "all" || goalFilter !== "all";
  const visibleDeployments = deployments.filter(
    (deployment) =>
      (statusFilter === "all" || deployment.status === statusFilter) &&
      (goalFilter === "all" || deployment.goalId === goalFilter),
  );

  function clearFilters() {
    setStatusFilter("all");
    setGoalFilter("all");
  }

  return (
    <section className="min-h-screen bg-paper">
      <header className="sticky top-0 z-10 flex min-h-20 items-center justify-between gap-6 border-b border-line bg-paper px-5 sm:px-8">
        <section>
          <p className="text-xs font-semibold text-muted">Workspace</p>
          <h1 className="mt-1 text-xl font-semibold tracking-[-0.04em]">Workflows</h1>
        </section>
        <Link
          to="/app/workflows/new"
          className="inline-flex items-center gap-2 rounded-xl bg-blue px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-dark"
        >
          <PlusIcon /> New workflow
        </Link>
      </header>
      <section className="mx-auto max-w-6xl space-y-8 p-5 sm:p-8">
        <header>
          <p className="text-sm font-medium text-blue">Repeatable action</p>
          <h2 className="mt-2 text-4xl font-semibold tracking-[-0.07em]">Workflows are goal-specific.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Deploy more than one workflow from a goal. Each one can have its own trigger, permissions, and review path.</p>
        </header>
        <section className="rounded-3xl bg-ink p-6 text-white sm:p-8">
          <p className="text-xs font-semibold text-blue-soft">Deployment control plane</p>
          <section className="mt-8 grid gap-6 sm:grid-cols-3">
            <Metric value={String(runningCount)} label="Running" detail="Actively working" />
            <Metric value={String(pausedCount)} label="Paused" detail="On hold" />
            <Metric value={String(completedCount)} label="Completed" detail="Finished" />
          </section>
        </section>
        {workflowCount === 0 ? (
          <section className="rounded-3xl border border-dashed border-line bg-wash px-6 py-16 text-center">
            <h3 className="text-xl font-semibold tracking-[-0.04em]">No workflows deployed</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">Start from a goal, define what the workflow can do, and deploy it when you’re ready.</p>
            <button type="button" onClick={openCreateGoal} className="mt-6 rounded-xl bg-blue px-4 py-2.5 text-sm font-bold text-white">Create a goal first</button>
          </section>
        ) : (
          <section className="space-y-4" aria-label="All workflows">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by status">
                <StatusFilterButton active={statusFilter === "all"} onClick={() => setStatusFilter("all")} label="All" count={deployments.length} />
                <StatusFilterButton active={statusFilter === "running"} onClick={() => setStatusFilter("running")} label="Running" count={runningCount} />
                <StatusFilterButton active={statusFilter === "paused"} onClick={() => setStatusFilter("paused")} label="Paused" count={pausedCount} />
                <StatusFilterButton active={statusFilter === "completed"} onClick={() => setStatusFilter("completed")} label="Completed" count={completedCount} />
              </div>
              <div className="ml-auto inline-flex items-center gap-2 text-xs font-semibold text-muted">
                <span id="workflow-goal-filter-label">Goal</span>
                <SelectDropdown
                  ariaLabelledBy="workflow-goal-filter-label"
                  value={goalFilter}
                  options={[
                    { value: "all", label: "All goals" },
                    ...goalsWithWorkflows.map((goal) => ({ value: goal.id, label: goal.title })),
                  ]}
                  onChange={setGoalFilter}
                  align="end"
                />
              </div>
            </div>
            <p className="text-xs text-muted" aria-live="polite">
              Showing {visibleDeployments.length} of {deployments.length} workflows
            </p>
            {deploymentsError ? (
              <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Workflows couldn't be loaded right now.
              </p>
            ) : visibleDeployments.length === 0 ? (
              isFiltering ? (
                <section className="rounded-3xl border border-dashed border-line bg-white px-6 py-14 text-center">
                  <h3 className="text-lg font-semibold tracking-[-0.04em]">No workflows match these filters</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
                    Try a different goal or status.
                  </p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-6 rounded-xl border border-line px-4 py-2.5 text-sm font-bold text-ink transition-colors hover:border-ink"
                  >
                    Clear filters
                  </button>
                </section>
              ) : (
                <p className="rounded-2xl bg-wash px-4 py-6 text-center text-sm text-muted">Loading workflows…</p>
              )
            ) : (
              <ul className="space-y-2">
                {visibleDeployments.map((deployment) => (
                  <li key={deployment.id}>
                    <Link
                      to="/app/workflow/$workflowId"
                      params={{ workflowId: deployment.id }}
                      className="flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3.5 transition-colors hover:border-blue"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{deployment.name}</span>
                        <span className="mt-0.5 block truncate text-xs text-muted">
                          {goalById.get(deployment.goalId)?.title ?? "Unknown goal"}
                          {deployment.createdAt ? ` · ${deployment.createdAt}` : ""}
                        </span>
                      </span>
                      <StatusPill status={deployment.status} />
                      <ChevronRightIcon />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </section>
    </section>
  );
}

function StatusFilterButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? "rounded-full bg-ink px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-colors"
          : "rounded-full border border-line bg-white px-3.5 py-2 text-xs font-bold text-muted transition-colors hover:border-ink hover:text-ink"
      }
    >
      {label} · <span className="tabular-nums">{count}</span>
    </button>
  );
}

function Metric({ value, label, detail }: { value: string; label: string; detail: string }) { return <article className="rounded-2xl bg-white/10 p-5"><p className="text-3xl font-semibold tracking-[-0.06em]">{value}</p><p className="mt-4 text-sm font-semibold">{label}</p><p className="mt-1 text-xs text-white/60">{detail}</p></article>; }
