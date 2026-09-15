import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { loadPublicGoals } from "../components/dashboard/goal-persistence";
import { BranchIcon, MilestoneIcon } from "../components/dashboard/icons";
import { XGoalMark } from "../components/logo";
import type { PublicGoal } from "../components/dashboard/types";

export const Route = createFileRoute("/goals/")({
  head: () => ({
    meta: [{ title: "xGoal — Explore public goals" }],
  }),
  component: PublicGoalsPage,
});

function OwnerLine({ goal }: { goal: PublicGoal }) {
  const owner = goal.owner;
  const name = owner?.handle ?? owner?.displayName ?? null;
  if (!name && !owner?.avatarUrl) return null;
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-muted">
      {owner?.avatarUrl ? (
        <img src={owner.avatarUrl} alt="" className="size-4 shrink-0 rounded-full object-cover" />
      ) : null}
      <span className="truncate">{name ?? "Unknown creator"}</span>
    </span>
  );
}

function PublicGoalCard({ goal }: { goal: PublicGoal }) {
  return (
    <li className="rounded-3xl border border-line bg-white p-6 transition-colors hover:border-blue">
      <h3 className="min-w-0 text-xl font-semibold tracking-[-0.05em]">
        <Link
          to="/goals/$goalId"
          params={{ goalId: goal.id }}
          className="rounded-lg transition-colors hover:text-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
        >
          {goal.title}
        </Link>
      </h3>
      {goal.description ? (
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{goal.description}</p>
      ) : null}
      <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4 text-xs">
        <span className="inline-flex items-center gap-1.5 font-semibold text-muted">
          <MilestoneIcon />
          <span className="tabular-nums">{goal.milestones.length}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 font-semibold text-muted">
          <BranchIcon />
          <span className="tabular-nums">{goal.branchCount}</span>
        </span>
        <OwnerLine goal={goal} />
        <span className="ml-auto text-muted">{goal.updatedAt}</span>
      </p>
    </li>
  );
}

function PublicGoalsPage() {
  const [goals, setGoals] = useState<PublicGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    loadPublicGoals().then(({ goals: loaded, error }) => {
      if (!mounted) return;
      setGoals(loaded);
      setLoadError(error);
      setIsLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-10 border-b border-line bg-paper">
        <div className="mx-auto flex min-h-20 w-[calc(100%-2rem)] max-w-6xl items-center justify-between gap-6 sm:w-[calc(100%-4rem)]">
          <Link to="/" className="flex items-center gap-3" aria-label="xGoal home">
            <XGoalMark className="size-9 shrink-0" />
            <span className="font-bold tracking-[-0.04em]">xGoal</span>
          </Link>
          <nav className="flex items-center gap-2" aria-label="Public navigation">
            <Link
              to="/app"
              className="rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-ink-soft"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl space-y-8 p-5 sm:p-8">
        <header>
          <p className="text-sm font-medium text-blue">Public goals</p>
          <h1 className="mt-2 max-w-3xl text-4xl font-semibold tracking-[-0.07em] sm:text-5xl">
            Explore goals worth forking.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Goals people share openly. Branch one into your workspace or run a private workflow from it —
            workflows always stay private to you.
          </p>
        </header>

        {isLoading ? (
          <p className="text-sm text-muted">Loading public goals…</p>
        ) : loadError ? (
          <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Public goals couldn't be loaded right now.
          </p>
        ) : goals.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-line bg-wash px-6 py-16 text-center">
            <h2 className="text-xl font-semibold tracking-[-0.04em]">No public goals yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
              When someone makes a goal public, it shows up here for everyone to discover.
            </p>
          </section>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {goals.map((goal) => (
              <PublicGoalCard key={goal.id} goal={goal} />
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
