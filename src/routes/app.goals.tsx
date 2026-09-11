import { Link, createFileRoute } from "@tanstack/react-router";
import { useDashboard, type Goal } from "../components/dashboard-layout";

export const Route = createFileRoute("/app/goals")({
  head: () => ({
    meta: [{ title: "xGoal — Goals" }],
  }),
  component: GoalsPage,
});

function GoalsPage() {
  const { visibleGoals, openCreateGoal } = useDashboard();

  return <section className="min-h-screen bg-paper"><header className="flex min-h-20 items-center justify-between gap-6 border-b border-line px-5 sm:px-8"><section><p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Workspace</p><h1 className="mt-1 text-xl font-semibold tracking-[-0.04em]">Goals</h1></section><button type="button" onClick={openCreateGoal} className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-white"><PlusIcon />New goal</button></header><section className="mx-auto max-w-6xl space-y-8 p-5 sm:p-8"><header><p className="text-sm font-medium text-blue">Your foundations</p><h2 className="mt-2 text-4xl font-semibold tracking-[-0.07em]">Every workflow starts here.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Goals hold the outcome, context, permissions, and branches that your workflows use.</p></header>{visibleGoals.length === 0 ? <section className="rounded-3xl border border-dashed border-line bg-wash px-6 py-16 text-center"><p className="mx-auto grid size-12 place-items-center rounded-2xl bg-blue-pale text-blue"><GoalIcon /></p><h3 className="mt-5 text-xl font-semibold tracking-[-0.04em]">No goals yet</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">Create one clear outcome, then we’ll break down the permissions and workflows it needs.</p><button type="button" onClick={openCreateGoal} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-white"><PlusIcon />Create a goal</button></section> : <ul className="grid gap-4 md:grid-cols-2">{visibleGoals.map((goal) => <GoalCard key={goal.id} goal={goal} />)}</ul>}</section></section>;
}

function PlusIcon() { return <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>; }
function GoalIcon() { return <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="7.5" /><circle cx="12" cy="12" r="3" /><path d="m17.5 6.5 2-2M19.5 4.5h-3M19.5 4.5v3" /></svg>; }
function GoalCard({ goal }: { goal: Goal }) { return <li id={`goal-${goal.id}`} className="rounded-3xl border border-line bg-white p-6 transition-colors hover:border-blue"><header className="flex items-start justify-between gap-4"><section><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${goal.status === "active" ? "bg-blue-pale text-blue-dark" : "bg-wash text-muted"}`}>{goal.status}</span><h3 className="mt-5 text-xl font-semibold tracking-[-0.05em]">{goal.title}</h3></section><span className="grid size-10 place-items-center rounded-xl bg-blue-pale text-blue"><GoalIcon /></span></header><footer className="mt-8 flex items-center justify-between gap-4 border-t border-line pt-4 text-xs text-muted"><span>{goal.workflowCount} workflows</span><span>Updated {goal.updatedAt}</span></footer></li>; }
