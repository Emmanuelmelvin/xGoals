import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useDashboard } from "../components/dashboard-layout";
import { StatusPill } from "../components/dashboard/goal-card";
import { loadDeploymentsForUser } from "../components/dashboard/goal-persistence";
import { ChevronRightIcon, PlusIcon } from "../components/dashboard/icons";
import type { Deployment } from "../components/dashboard/types";

export const Route = createFileRoute("/app/workflows/")({
  head: () => ({
    meta: [{ title: "xGoal — Workflows" }],
  }),
  component: WorkflowsPage,
});

function WorkflowsPage() {
  const { user, goals, openCreateGoal } = useDashboard();
  const [deployments, setDeployments] = useState<Deployment[]>([]);

  useEffect(() => {
    let mounted = true;
    loadDeploymentsForUser(user.id).then(({ deployments: loaded }) => {
      if (mounted) setDeployments(loaded);
    });
    return () => { mounted = false; };
  }, [user.id]);

  const workflowCount = goals.reduce((total, goal) => total + goal.workflowCount, 0);
  const runningCount = deployments.filter((deployment) => deployment.status === "running").length;
  const pausedCount = deployments.filter((deployment) => deployment.status === "paused").length;
  const stoppedCount = deployments.filter((deployment) => deployment.status === "stopped").length;
  const goalsWithWorkflows = goals.filter((goal) => deployments.some((deployment) => deployment.goalId === goal.id));

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
            <Metric value={String(stoppedCount)} label="Stopped" detail="Ended" />
          </section>
        </section>
        {workflowCount === 0 ? (
          <section className="rounded-3xl border border-dashed border-line bg-wash px-6 py-16 text-center">
            <h3 className="text-xl font-semibold tracking-[-0.04em]">No workflows deployed</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">Start from a goal, define what the workflow can do, and deploy it when you’re ready.</p>
            <button type="button" onClick={openCreateGoal} className="mt-6 rounded-xl bg-blue px-4 py-2.5 text-sm font-bold text-white">Create a goal first</button>
          </section>
        ) : (
          <section className="space-y-6">
            {goalsWithWorkflows.map((goal) => (
              <article key={goal.id} className="rounded-3xl border border-line bg-white p-6 sm:p-7">
                <header className="flex items-center justify-between gap-4">
                  <h3 className="min-w-0 truncate text-lg font-semibold tracking-[-0.04em]">
                    <Link
                      to="/app/goals/$goalId"
                      params={{ goalId: goal.id }}
                      className="rounded-lg transition-colors hover:text-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
                    >
                      {goal.title}
                    </Link>
                  </h3>
                  <Link
                    to="/app/workflows/new"
                    search={{ goal: goal.id }}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-sm font-semibold transition-colors hover:border-ink"
                  >
                    <PlusIcon /> Deploy
                  </Link>
                </header>
                <ul className="mt-4 space-y-2">
                  {deployments
                    .filter((deployment) => deployment.goalId === goal.id)
                    .map((deployment) => (
                      <li key={deployment.id}>
                        <Link
                          to="/app/workflow/$workflowId"
                          params={{ workflowId: deployment.id }}
                          className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3 transition-colors hover:border-blue"
                        >
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold">{deployment.name}</span>
                          <StatusPill status={deployment.status} />
                          <ChevronRightIcon />
                        </Link>
                      </li>
                    ))}
                </ul>
              </article>
            ))}
          </section>
        )}
      </section>
    </section>
  );
}

function Metric({ value, label, detail }: { value: string; label: string; detail: string }) { return <article className="rounded-2xl bg-white/10 p-5"><p className="text-3xl font-semibold tracking-[-0.06em]">{value}</p><p className="mt-4 text-sm font-semibold">{label}</p><p className="mt-1 text-xs text-white/60">{detail}</p></article>; }
