import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useDashboard, type Goal } from "../components/dashboard-layout";
import { GoalCardActions, GoalCardMeta, MilestoneStatusIcon, StatusPill, WorkflowStatusSummary } from "../components/dashboard/goal-card";
import { PERMISSION_GROUPS, deleteGoal, loadDeploymentsForUser, loadGoalPermissions, updateGoalParent } from "../components/dashboard/goal-persistence";
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

type BranchDeleteDecision = { scope: "all" | "keep-one"; keepGoalId: string | null };

function DeleteBranchDialog({ noun, goalTitle, workflowCount, childBranches, isDeleting, onClose, onConfirm }: { noun: "branch" | "goal"; goalTitle: string; workflowCount: number; childBranches: { id: string; title: string; workflowCount: number }[]; isDeleting: boolean; onClose: () => void; onConfirm: (decision: BranchDeleteDecision) => void }) {
  const [value, setValue] = useState("");
  const [scope, setScope] = useState<"all" | "keep-one">("keep-one");
  const [keepGoalId, setKeepGoalId] = useState<string | null>(childBranches[0]?.id ?? null);
  const confirmed = value.trim() === "confirm";
  const showBranchOptions = noun === "goal" && childBranches.length > 0;
  const canConfirm = confirmed && !isDeleting && (!showBranchOptions || scope === "all" || !!keepGoalId);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4" role="dialog" aria-modal="true" aria-labelledby="delete-goal-title">
      <button type="button" aria-label="Cancel deletion" onClick={onClose} className="absolute inset-0 cursor-default bg-ink/40" />
      <section className="relative my-8 w-full max-w-md rounded-3xl border border-line bg-white p-6 shadow-xl sm:p-7">
        <h2 id="delete-goal-title" className="text-xl font-semibold tracking-[-0.04em]">
          Delete this {noun}?
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          This permanently deletes <strong className="font-semibold text-ink">“{goalTitle}”</strong>
          {workflowCount > 0 ? (
            <> and its <strong className="font-semibold text-ink">{workflowCount} workflow{workflowCount === 1 ? "" : "s"}</strong></>
          ) : null}
          . This can't be undone.
        </p>
        {showBranchOptions ? (
          <fieldset className="mt-5" disabled={isDeleting}>
            <legend className="text-sm font-semibold">Branches · {childBranches.length}</legend>
            <div className="mt-2 space-y-2">
              <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${scope === "all" ? "border-blue/40 bg-blue-pale/40" : "border-line bg-white"}`}>
                <input
                  type="radio"
                  name="branch-scope"
                  checked={scope === "all"}
                  onChange={() => setScope("all")}
                  className="mt-1 size-4 shrink-0 accent-blue"
                />
                <span>
                  <span className="block text-sm font-semibold text-ink">Delete all branches</span>
                  <span className="mt-0.5 block text-xs leading-5 text-muted">Removes this goal and every branch under it.</span>
                </span>
              </label>
              <div className={`rounded-2xl border transition-colors ${scope === "keep-one" ? "border-blue/40 bg-blue-pale/40" : "border-line bg-white"}`}>
                <label className="flex cursor-pointer items-start gap-3 p-4">
                  <input
                    type="radio"
                    name="branch-scope"
                    checked={scope === "keep-one"}
                    onChange={() => {
                      setScope("keep-one");
                      if (!keepGoalId && childBranches[0]) setKeepGoalId(childBranches[0].id);
                    }}
                    className="mt-1 size-4 shrink-0 accent-blue"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-ink">Keep one as the new top level</span>
                    <span className="mt-0.5 block text-xs leading-5 text-muted">It takes over — the other branches move under it.</span>
                  </span>
                </label>
              </div>
            </div>
            {scope === "keep-one" ? (
              <label className="mt-3 block">
                <span className="text-xs font-semibold text-muted">Branch to keep</span>
                <select
                  value={keepGoalId ?? ""}
                  onChange={(event) => setKeepGoalId(event.target.value || null)}
                  className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-blue focus:ring-2 focus:ring-blue/10"
                >
                  {childBranches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.title}{branch.workflowCount > 0 ? ` · ${branch.workflowCount} workflow${branch.workflowCount === 1 ? "" : "s"}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </fieldset>
        ) : null}
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
            onClick={() => onConfirm({ scope: showBranchOptions ? scope : "all", keepGoalId: showBranchOptions && scope === "keep-one" ? keepGoalId : null })}
            disabled={!canConfirm}
            aria-busy={isDeleting}
            className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isDeleting ? "Deleting…" : `Delete ${noun}`}
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
  const childBranches = goal ? goals.filter((item) => item.parentGoalId === goal.id).map((item) => ({ id: item.id, title: item.title, workflowCount: item.workflowCount })) : [];

  useEffect(() => {
    setDeleteOpen(false);
  }, [goalId]);

  function handleEdit() {
    if (!goal || goal.parentGoalId) return;
    void navigate({ to: "/app/goals/new", search: { edit: goal.id } });
  }

  async function handleDelete(decision: BranchDeleteDecision) {
    if (!goal || isDeleting) return;
    const noun = goal.parentGoalId ? "branch" : "goal";
    setIsDeleting(true);
    try {
      if (!goal.parentGoalId && childBranches.length > 0) {
        if (decision.scope === "keep-one" && decision.keepGoalId) {
          const { error: promoteError } = await updateGoalParent({ ownerId: user.id, goalId: decision.keepGoalId, parentGoalId: null });
          if (promoteError) {
            toast.error("The branch could not be promoted.", { description: promoteError });
            return;
          }
          for (const child of childBranches) {
            if (child.id === decision.keepGoalId) continue;
            const { error: moveError } = await updateGoalParent({ ownerId: user.id, goalId: child.id, parentGoalId: decision.keepGoalId });
            if (moveError) {
              toast.error(`“${child.title}” could not be moved.`, { description: moveError });
              return;
            }
          }
        } else {
          for (const child of childBranches) {
            const { error: childError } = await deleteGoal({ ownerId: user.id, goalId: child.id });
            if (childError) {
              toast.error(`“${child.title}” could not be deleted.`, { description: childError });
              return;
            }
          }
        }
      }
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
      <header className="sticky top-0 z-10 flex min-h-20 items-center gap-6 border-b border-line bg-paper px-5 sm:px-8">
        <Link
          to="/app/goals"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-ink"
        >
          <ArrowLeftIcon /> Goals
        </Link>
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
        <GoalDetailContent key={goal.id} goal={goal} onEdit={isBranch ? undefined : handleEdit} onDelete={() => setDeleteOpen(true)} />
      )}
      {goal && deleteOpen ? (
        <DeleteBranchDialog
          noun={isBranch ? "branch" : "goal"}
          goalTitle={goal.title}
          workflowCount={goal.workflowCount}
          childBranches={childBranches}
          isDeleting={isDeleting}
          onClose={() => setDeleteOpen(false)}
          onConfirm={(decision) => void handleDelete(decision)}
        />
      ) : null}
    </section>
  );
}

function GoalDetailContent({ goal, onEdit, onDelete }: { goal: Goal; onEdit?: () => void; onDelete: () => void }) {
  const { user, goals } = useDashboard();
  const navigate = useNavigate();
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
        <div className="mt-5 flex flex-wrap gap-2">
          <GoalCardActions goal={goal} onEdit={onEdit} onDelete={onDelete} />
        </div>
      </header>

      <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
        <div className="space-y-6">
          <article className="rounded-3xl border border-line bg-white p-6 sm:p-7">
            <h2 className="text-xl font-semibold tracking-[-0.04em]">Milestones</h2>
            {totalMilestones === 0 ? (
              <p className="mt-2 text-sm leading-6 text-muted">No milestones yet. Add checkpoints to track progress here.</p>
            ) : (
              <>
                <p className="mt-1 text-xs leading-5 text-muted">
                  {goal.milestones.filter((milestone) => milestone.completed).length} of {totalMilestones} done
                </p>
                <ol className="mt-5 space-y-2.5 pl-6 marker:text-muted list-[lower-roman]">
                  {goal.milestones.map((milestone, index) => (
                    <li key={`${milestone.title}-${index}`} className="pl-1 text-sm leading-6">
                      <span className="inline-flex items-center gap-2.5">
                        <MilestoneStatusIcon completed={milestone.completed} />
                        <span className={milestone.completed ? "text-muted line-through" : "text-ink"}>
                          {milestone.title}
                        </span>
                        <span className="sr-only">{milestone.completed ? "(completed)" : "(not completed)"}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </>
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
                onClick={() => void navigate({ to: "/app/workflows/new", search: { goal: goal.id } })}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-dark"
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
