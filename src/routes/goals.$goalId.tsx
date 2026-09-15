import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { VisibilityBadge, SkillList } from "../components/dashboard/goal-card";
import { PERMISSION_GROUPS, loadPermissionsForPublicGoal, loadPublicGoal } from "../components/dashboard/goal-persistence";
import { BranchIcon, BranchPlusIcon, ChevronRightIcon, PlusIcon } from "../components/dashboard/icons";
import { PublicHeader } from "../components/public-header";
import { createClient } from "../lib/supabase/client";
import type { PublicGoalDetail } from "../components/dashboard/types";

export const Route = createFileRoute("/goals/$goalId")({
  head: () => ({
    meta: [{ title: "xGoal — Public goal" }],
  }),
  component: PublicGoalPage,
});

const permissionLabels = new Map(
  PERMISSION_GROUPS.flatMap((group) => group.entries.map((entry) => [entry.permission, entry.label] as const)),
);

function OwnerLine({ goal }: { goal: PublicGoalDetail }) {
  const owner = goal.owner;
  const name = owner?.displayName ?? owner?.handle ?? "Unknown creator";
  return (
    <span className="inline-flex min-w-0 items-center gap-2 text-sm text-muted">
      {owner?.avatarUrl ? (
        <img src={owner.avatarUrl} alt="" className="size-6 shrink-0 rounded-full object-cover" />
      ) : null}
      <span className="truncate">
        By <span className="font-semibold text-ink">{name}</span>
        {owner?.handle && owner.displayName ? <span> · {owner.handle}</span> : null}
      </span>
      <span aria-hidden="true">·</span>
      <span>Updated {goal.updatedAt}</span>
    </span>
  );
}

function PublicGoalPage() {
  const { goalId } = Route.useParams();
  const [goal, setGoal] = useState<PublicGoalDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [viewerId, setViewerId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setLoadError(null);
    setGoal(null);
    setPermissions([]);
    loadPublicGoal(goalId).then(({ goal: loaded, error }) => {
      if (!mounted) return;
      setGoal(loaded);
      setLoadError(error);
      setIsLoading(false);
      if (loaded) {
        loadPermissionsForPublicGoal(loaded.id).then(({ permissions: granted }) => {
          if (mounted) setPermissions(granted);
        });
      }
    });
    return () => {
      mounted = false;
    };
  }, [goalId]);

  useEffect(() => {
    let mounted = true;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (mounted) setViewerId(data.user?.id ?? null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const isOwner = viewerId !== undefined && viewerId !== null && goal !== null && goal.ownerId === viewerId;

  return (
    <section className="min-h-screen bg-paper text-ink">
      <PublicHeader showExplore />

      {isLoading ? (
        <p className="mx-auto max-w-6xl p-5 text-sm text-muted sm:p-8">Loading goal…</p>
      ) : loadError || !goal ? (
        <section className="mx-auto max-w-6xl p-5 sm:p-8">
          <section className="rounded-3xl border border-dashed border-line bg-wash px-6 py-16 text-center">
            <h1 className="text-xl font-semibold tracking-[-0.04em]">Goal not found</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
              This goal may be private, deleted, or the link is wrong.
            </p>
            <Link
              to="/goals"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue px-4 py-2.5 text-sm font-bold text-white"
            >
              Explore public goals
            </Link>
          </section>
        </section>
      ) : (
        <section className="mx-auto max-w-6xl space-y-8 p-5 sm:p-8">
          <header>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-blue">Public goal</p>
              <VisibilityBadge visibility={goal.visibility} />
            </div>
            {goal.parent ? (
              <Link
                to="/goals/$goalId"
                params={{ goalId: goal.parent.id }}
                className="mt-3 inline-flex max-w-full items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-ink hover:text-ink"
              >
                <BranchIcon />
                <span className="shrink-0">Branched from</span>
                <span className="truncate text-ink">{goal.parent.title}</span>
              </Link>
            ) : null}
            <h1 className="mt-2 max-w-3xl text-4xl font-semibold tracking-[-0.07em] sm:text-5xl">{goal.title}</h1>
            {goal.description ? (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{goal.description}</p>
            ) : null}
            <div className="mt-5">
              <OwnerLine goal={goal} />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {isOwner ? (
                <Link
                  to="/app/goals/$goalId"
                  params={{ goalId: goal.id }}
                  className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-ink-soft"
                >
                  Open in workspace
                </Link>
              ) : (
                <>
                  <Link
                    to="/app/goals/branch/$goalId"
                    params={{ goalId: goal.id }}
                    className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-ink-soft"
                  >
                    <BranchPlusIcon /> Branch from this goal
                  </Link>
                  <Link
                    to="/app/workflows/new"
                    search={{ goal: goal.id }}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-dark"
                  >
                    <PlusIcon /> Run workflow
                  </Link>
                </>
              )}
            </div>
            {isOwner ? null : (
              <p className="mt-2 text-xs leading-5 text-muted">
                Branches and workflows you create stay private in your workspace. Sign in is required.
              </p>
            )}
          </header>

          <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
            <div className="space-y-6">
              <article className="rounded-3xl border border-line bg-white p-6 sm:p-7">
                <h2 className="text-xl font-semibold tracking-[-0.04em]">Milestones</h2>
                {goal.milestones.length === 0 ? (
                  <p className="mt-2 text-sm leading-6 text-muted">No milestones listed for this goal.</p>
                ) : (
                  <ol className="mt-5 space-y-2.5 pl-6 marker:text-muted list-[lower-roman]">
                    {goal.milestones.map((milestone, index) => (
                      <li key={`${milestone.title}-${index}`} className="pl-1 text-sm leading-6 text-ink">
                        {milestone.title}
                      </li>
                    ))}
                  </ol>
                )}
              </article>

              <article className="rounded-3xl border border-line bg-white p-6 sm:p-7">
                <h2 className="text-xl font-semibold tracking-[-0.04em]">Skills</h2>
                <SkillList skills={goal.skills} emptyText="No skills listed for this goal." />
              </article>

              <article className="rounded-3xl border border-line bg-white p-6 sm:p-7">
                <header className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold tracking-[-0.04em]">Branches</h2>
                    <p className="mt-1 text-sm text-muted">Public variations of this goal.</p>
                  </div>
                </header>
                {goal.branches.length === 0 ? (
                  <p className="mt-5 rounded-2xl bg-wash px-4 py-6 text-center text-sm leading-6 text-muted">
                    {goal.parentGoalId
                      ? "Only top level goals can have branches."
                      : "No public branches yet. Branch off to explore a variation."}
                  </p>
                ) : (
                  <ul className="mt-5 space-y-2">
                    {goal.branches.map((branch) => (
                      <li key={branch.id}>
                        <Link
                          to="/goals/$goalId"
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
            </div>

            <div className="space-y-6">
              <article className="rounded-3xl border border-line bg-white p-6 sm:p-7">
                <h2 className="text-xl font-semibold tracking-[-0.04em]">Permissions · {permissions.length}</h2>
                {permissions.length === 0 ? (
                  <p className="mt-2 text-sm leading-6 text-muted">No permissions listed for this goal.</p>
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
                <p className="mt-4 text-xs leading-5 text-muted">
                  Scopes a forked workflow may request — each run still needs the owner's approval.
                </p>
              </article>
            </div>
          </section>
        </section>
      )}
    </section>
  );
}
