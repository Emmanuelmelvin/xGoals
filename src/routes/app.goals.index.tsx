import { Link, createFileRoute } from "@tanstack/react-router";
import { useDashboard, type Goal } from "../components/dashboard-layout";
import { GoalCardActions, GoalCardMeta } from "../components/dashboard/goal-card";
import { GoalIcon, PlusIcon } from "../components/dashboard/icons";

export const Route = createFileRoute("/app/goals/")({
  head: () => ({
    meta: [{ title: "xGoal — Goals" }],
  }),
  component: GoalsPage,
});

function GoalsPage() {
  const { goals, isGoalsLoading, goalError, openCreateGoal } = useDashboard();

  return <section className="min-h-screen bg-paper"><header className="sticky top-0 z-10 flex min-h-20 items-center justify-between gap-6 border-b border-line bg-paper px-5 sm:px-8"><section><p className="text-xs font-semibold text-muted">Workspace</p><h1 className="mt-1 text-xl font-semibold tracking-[-0.04em]">Goals</h1></section><button type="button" onClick={openCreateGoal} className="inline-flex items-center gap-2 rounded-xl bg-blue px-4 py-2.5 text-sm font-bold text-white"><PlusIcon />New goal</button></header><section className="mx-auto max-w-6xl space-y-8 p-5 sm:p-8"><header><p className="text-sm font-medium text-blue">Your foundations</p><h2 className="mt-2 text-4xl font-semibold tracking-[-0.07em]">Every workflow starts here.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Goals hold the outcome, context, permissions, and branches that your workflows use.</p></header>{goalError ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{goalError}</p> : null}{isGoalsLoading ? <p className="text-sm text-muted">Loading goals…</p> : goals.length === 0 ? <section className="rounded-3xl border border-dashed border-line bg-wash px-6 py-16 text-center"><p className="mx-auto grid size-12 place-items-center rounded-2xl bg-blue-pale text-blue"><GoalIcon /></p><h3 className="mt-5 text-xl font-semibold tracking-[-0.04em]">No goals yet</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">Create one clear outcome, then we’ll break down the permissions and workflows it needs.</p><button type="button" onClick={openCreateGoal} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue px-4 py-2.5 text-sm font-bold text-white"><PlusIcon />Create a goal</button></section> : <ul className="grid gap-4 md:grid-cols-2">{goals.map((goal) => <GoalCard key={goal.id} goal={goal} />)}</ul>}</section></section>;
}

function GoalCard({ goal }: { goal: Goal }) { return <li id={`goal-${goal.id}`} className="rounded-3xl border border-line bg-white p-6 transition-colors hover:border-blue"><header className="flex items-start justify-between gap-4"><h3 className="min-w-0 text-xl font-semibold tracking-[-0.05em]"><Link to="/app/goals/$goalId" params={{ goalId: goal.id }} className="rounded-lg transition-colors hover:text-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue">{goal.title}</Link></h3><span className="flex shrink-0 items-center gap-0.5"><GoalCardActions goal={goal} /><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-pale text-blue"><GoalIcon /></span></span></header><footer className="mt-8 pt-4"><GoalCardMeta goal={goal} /></footer></li>; }
