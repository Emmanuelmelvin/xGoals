import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useDashboard, type Goal } from "../components/dashboard-layout";
import { GoalCardActions, GoalCardMeta, WorkflowStatusSummary, useCreateWorkflow } from "../components/dashboard/goal-card";
import { PERMISSION_GROUPS, loadDeploymentsForUser, loadGoalPermissions } from "../components/dashboard/goal-persistence";
import { ArrowLeftIcon, BranchPlusIcon, ChevronRightIcon, PlusIcon } from "../components/dashboard/icons";
import type { Deployment } from "../components/dashboard/types";

export const Route = createFileRoute("/app/goals/$goalId")({
  head: () => ({
    meta: [{ title: "xGoal — Goal" }],
  }),
  component: GoalDetailPage,
});

const permissionLabels = new Map(
  PERMISSION_GROUPS.flatMap((group) => group.entries.map((entry) => [entry.permission, entry.label] as const)),
);

function StatusPill({ status }: { status: Deployment["status"] }) {
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

function GoalDetailPage() {
  const { goalId } = Route.useParams();
  const { goals, isGoalsLoading, goalError } = useDashboard();
  const goal = goals.find((item) => item.id === goalId);

  return (
    <section className="min-h-screen bg-paper">
      <header className="sticky top-0 z-10 flex min-h-20 items-center justify-between gap-6 border-b border-line bg-paper px-5 sm:px-8">
        <Link
          to="/app/goals"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-ink"
        >
          <ArrowLeftIcon /> Goals
        </Link>
        {goal ? <GoalCardActions goal={goal} /> : null}
      </header>
      {isGoalsLoading ? (
        <p className="mx-auto max-w-6xl p-5 text-sm text-muted sm:p-8">Loading goal…</p>
      ) : goalError ? (
        <p className="mx-auto max-w-6xl p-5 sm:p-8" role="alert">
          <span className="block rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {goalError}
          </span>
        </p>
      ) : !goal ? (
        <section className="mx-auto max-w-6xl p-5 sm:p-8">
          <section className="rounded-3xl border border-dashed border-line bg-wash px-6 py-16 text-center">
            <h2 className="text-xl font-semibold tracking-[-0.04em]">Goal not found</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
              This goal may have been deleted, or you may not have access to it.
            </p>
            <Link
              to="/app/goals"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue px-4 py-2.5 text-sm font-bold text-white"
            >
              Back to goals
            </Link>
          </section>
        </section>
      ) : (
        <GoalDetailContent key={goal.id} goal={goal} />
      )}
    </section>
  );
}

function GoalDetailContent({ goal }: { goal: Goal }) {
  const { user, goals, openCreateGoal } = useDashboard();
  const { createWorkflow, isDeploying } = useCreateWorkflow(goal);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    loadDeploymentsForUser(user.id).then(({ deployments: loaded }) => {
      if (mounted) setDeployments(loaded.filter((deployment) => deployment.goalId === goal.id));
    });
    loadGoalPermissions(user.id, goal.id).then(({ permissions: loaded }) => {
      if (mounted) setPermissions(loaded);
    });
    return () => {
      mounted = false;
    };
  }, [user.id, goal.id]);

  const totalMilestones = goal.milestones.length;
  const branches = goals.filter((item) => item.parentGoalId === goal.id);
  const parent = goal.parentGoalId ? goals.find((item) => item.id === goal.parentGoalId) : undefined;

  return (
    <section className="mx-auto max-w-6xl space-y-8 p-5 sm:p-8">
      <header>
        <p className="text-sm font-medium text-blue">Goal</p>
        <h1 className="mt-2 max-w-3xl text-4xl font-semibold tracking-[-0.07em] sm:text-5xl">{goal.title}</h1>
        {goal.description ? (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{goal.description}</p>
        ) : null}
        <div className="mt-5">
          <GoalCardMeta goal={goal} />
        </div>
      </header>

      <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
        <div className="space-y-6">
          <article className="rounded-3xl border border-line bg-white p-6 sm:p-7">
            <h2 className="text-xl font-semibold tracking-[-0.04em]">Milestones</h2>
            {totalMilestones === 0 ? (
              <p className="mt-2 text-sm leading-6 text-muted">No milestones yet. Add checkpoints to track progress here.</p>
            ) : (
              <ol className="mt-5 space-y-2.5 pl-6 marker:text-muted list-[lower-roman]">
                {goal.milestones.map((milestone, index) => (
                  <li key={`${milestone.title}-${index}`} className="pl-1 text-sm leading-6">
                    <span className={milestone.completed ? "text-muted line-through" : "text-ink"}>
                      {milestone.title}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </article>

          <article className="rounded-3xl border border-line bg-white p-6 sm:p-7">
            <header className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.04em]">Workflows</h2>
                <p className="mt-1 text-sm text-muted">Deployed from this goal.</p>
              </div>
              <button
                type="button"
                onClick={() => void createWorkflow()}
                disabled={isDeploying}
                aria-busy={isDeploying}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                <PlusIcon /> Deploy
              </button>
            </header>
            {goal.workflowCount > 0 ? (
              <div className="mt-4">
                <WorkflowStatusSummary goal={goal} />
              </div>
            ) : null}
            {deployments.length === 0 ? (
              <p className="mt-5 rounded-2xl bg-wash px-4 py-6 text-center text-sm leading-6 text-muted">
                No workflows deployed yet. Deploy one to put this goal to work.
              </p>
            ) : (
              <ul className="mt-5 space-y-2">
                {deployments.map((deployment) => (
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
            )}
          </article>
        </div>

        <div className="space-y-6">
          <article className="rounded-3xl border border-line bg-white p-6 sm:p-7">
            <header className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.04em]">Branches</h2>
                <p className="mt-1 text-sm text-muted">Goals branched from this one.</p>
              </div>
              <button
                type="button"
                onClick={openCreateGoal}
                aria-label={`Create branch from ${goal.title}`}
                className="grid size-9 shrink-0 place-items-center rounded-full border border-ink bg-ink text-white shadow-sm transition-colors hover:bg-ink-soft"
              >
                <BranchPlusIcon />
              </button>
            </header>
            {branches.length === 0 ? (
              <p className="mt-5 rounded-2xl bg-wash px-4 py-6 text-center text-sm leading-6 text-muted">
                No branches yet. Branch off to explore a variation without losing this goal.
              </p>
            ) : (
              <ul className="mt-5 space-y-2">
                {branches.map((branch) => (
                  <li key={branch.id}>
                    <Link
                      to="/app/goals/$goalId"
                      params={{ goalId: branch.id }}
                      className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3 transition-colors hover:border-blue"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{branch.title}</span>
                      <ChevronRightIcon />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="rounded-3xl border border-line bg-white p-6 sm:p-7">
            <h2 className="text-xl font-semibold tracking-[-0.04em]">Permissions · {permissions.length}</h2>
            {permissions.length === 0 ? (
              <p className="mt-2 text-sm leading-6 text-muted">Nothing granted yet. Permissions are reviewed when the goal is created.</p>
            ) : (
              <ul className="mt-4 flex flex-wrap gap-2">
                {permissions.map((permission) => (
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
            <dl className="mt-6 space-y-2 border-t border-line pt-5 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted">Last updated</dt>
                <dd className="font-semibold">{goal.updatedAt}</dd>
              </div>
              {parent ? (
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted">Branched from</dt>
                  <dd>
                    <Link
                      to="/app/goals/$goalId"
                      params={{ goalId: parent.id }}
                      className="max-w-44 truncate font-semibold text-blue hover:underline"
                    >
                      {parent.title}
                    </Link>
                  </dd>
                </div>
              ) : null}
            </dl>
          </article>
        </div>
      </section>
    </section>
  );
}
