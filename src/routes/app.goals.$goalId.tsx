import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useDashboard, type Goal } from "../components/dashboard-layout";
import { GoalCardActions, GoalCardMeta, WorkflowStatusSummary, useCreateWorkflow } from "../components/dashboard/goal-card";
import { PERMISSION_GROUPS, deleteGoal, loadDeploymentsForUser, loadGoalPermissions } from "../components/dashboard/goal-persistence";
import { ArrowLeftIcon, BranchIcon, BranchPlusIcon, ChevronRightIcon, PlusIcon } from "../components/dashboard/icons";
import { fieldInputClass } from "../components/dashboard/goal-form";
import { useToast } from "../components/toast";
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

function DeleteBranchDialog({ goalTitle, workflowCount, isDeleting, onClose, onConfirm }: { goalTitle: string; workflowCount: number; isDeleting: boolean; onClose: () => void; onConfirm: () => void }) {
  const [value, setValue] = useState("");
  const confirmed = value.trim() === "confirm";

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="delete-branch-title">
      <button type="button" aria-label="Cancel deletion" onClick={onClose} className="absolute inset-0 cursor-default bg-ink/40" />
      <section className="relative w-full max-w-md rounded-3xl border border-line bg-white p-6 shadow-xl sm:p-7">
        <h2 id="delete-branch-title" className="text-xl font-semibold tracking-[-0.04em]">
          Delete this branch?
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          This permanently deletes <strong className="font-semibold text-ink">“{goalTitle}”</strong>
          {workflowCount > 0 ? (
            <> and its <strong className="font-semibold text-ink">{workflowCount} workflow{workflowCount === 1 ? "" : "s"}</strong></>
          ) : null}
          . This can't be undone.
        </p>
        <label className="mt-5 block">
          <span className="text-sm font-semibold">Type <span className="rounded-md bg-wash px-1.5 py-0.5 font-mono text-[0.8125rem]">confirm</span> to continue</span>
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            autoFocus
            autoComplete="off"
            maxLength={32}
            placeholder="confirm"
            className={fieldInputClass}
          />
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:bg-wash hover:text-ink disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!confirmed || isDeleting}
            aria-busy={isDeleting}
            className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isDeleting ? "Deleting…" : "Delete branch"}
          </button>
        </div>
      </section>
    </div>
  );
}

function GoalDetailPage() {
  const { goalId } = Route.useParams();
  const { user, goals, isGoalsLoading, goalError, refreshGoals } = useDashboard();
  const { toast } = useToast();
  const navigate = useNavigate();
  const goal = goals.find((item) => item.id === goalId);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isBranch = !!goal?.parentGoalId;
  const childBranchCount = goal ? goals.filter((item) => item.parentGoalId === goal.id).length : 0;

  useEffect(() => {
    setDeleteOpen(false);
  }, [goalId]);

  function handleEdit() {
    if (!goal) return;
    void navigate({ to: "/app/goals/new", search: { edit: goal.id } });
  }

  async function handleDelete() {
    if (!goal || isDeleting) return;
    const noun = goal.parentGoalId ? "branch" : "goal";
    setIsDeleting(true);
    try {
      const { error } = await deleteGoal({ ownerId: user.id, goalId: goal.id });
      if (error) {
        toast.error(`The ${noun} could not be deleted.`, { description: error });
        return;
      }
      await refreshGoals();
      toast.success(noun === "branch" ? "Branch deleted" : "Goal deleted");
      void navigate({ to: "/app/goals" });
    } catch (err) {
      toast.error(`The ${noun} could not be deleted.`, {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <section className="min-h-screen bg-paper">
      <header className="sticky top-0 z-10 flex min-h-20 items-center justify-between gap-6 border-b border-line bg-paper px-5 sm:px-8">
        <Link
          to="/app/goals"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-ink"
        >
          <ArrowLeftIcon /> Goals
        </Link>
        {goal ? (
          <GoalCardActions
            goal={goal}
            onEdit={handleEdit}
            onDelete={() => setDeleteOpen(true)}
            tooltipPlacement="bottom"
          />
        ) : null}
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
      {goal && deleteOpen ? (
        <DeleteBranchDialog
          noun={isBranch ? "branch" : "goal"}
          goalTitle={goal.title}
          workflowCount={goal.workflowCount}
          childBranchCount={childBranchCount}
          isDeleting={isDeleting}
          onClose={() => setDeleteOpen(false)}
          onConfirm={() => void handleDelete()}
        />
      ) : null}
    </section>
  );
}

function GoalDetailContent({ goal }: { goal: Goal }) {
  const { user, goals } = useDashboard();
  const navigate = useNavigate();
  const { createWorkflow, isDeploying } = useCreateWorkflow(goal);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    loadDeploymentsForUser(user.id).then(({ deployments: loaded }) => {
      if (mounted) setDeployments(loaded.filter((deployment) => deployment.goalId === goal.id));
    });
    loadGoalPermissions(user.id, goal.id).then(({ permissions: loaded, error: loadError }) => {
      if (!mounted) return;
      if (loadError) {
        setPermissionsError(loadError);
        return;
      }
      setPermissions(loaded);
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
        {parent ? (
          <Link
            to="/app/goals/$goalId"
            params={{ goalId: parent.id }}
            className="mt-3 inline-flex max-w-full items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-ink hover:text-ink"
          >
            <BranchIcon />
            <span className="shrink-0">Branched from</span>
            <span className="truncate text-ink">{parent.title}</span>
          </Link>
        ) : null}
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
              {!goal.parentGoalId ? (
                <button
                  type="button"
                  onClick={() => void navigate({ to: "/app/goals/branch/$goalId", params: { goalId: goal.id } })}
                  aria-label={`Create branch from ${goal.title}`}
                  className="grid size-9 shrink-0 place-items-center rounded-full border border-ink bg-ink text-white shadow-sm transition-colors hover:bg-ink-soft"
                >
                  <BranchPlusIcon />
                </button>
              ) : null}
            </header>
            {branches.length === 0 ? (
              <p className="mt-5 rounded-2xl bg-wash px-4 py-6 text-center text-sm leading-6 text-muted">
                {goal.parentGoalId
                  ? "Only top-level goals can have branches."
                  : "No branches yet. Branch off to explore a variation without losing this goal."}
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
            {permissionsError ? (
              <p className="mt-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                Permissions couldn't be loaded right now.
              </p>
            ) : permissions.length === 0 ? (
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
