import { Link, createFileRoute } from "@tanstack/react-router";
import { useDashboard } from "../components/dashboard-layout";

export const Route = createFileRoute("/app/workflows")({
  head: () => ({
    meta: [{ title: "xGoal — Workflows" }],
  }),
  component: WorkflowsPage,
});

function WorkflowsPage() {
  const { goals, openCreateGoal } = useDashboard();
  const workflowCount = goals.reduce((total, goal) => total + goal.workflowCount, 0);

  return <section className="min-h-screen bg-paper"><header className="flex min-h-20 items-center justify-between gap-6 border-b border-line px-5 sm:px-8"><section><p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Workspace</p><h1 className="mt-1 text-xl font-semibold tracking-[-0.04em]">Workflows</h1></section><Link to="/app/goals" className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-bold transition-colors hover:border-ink">Choose a goal</Link></header><section className="mx-auto max-w-6xl space-y-8 p-5 sm:p-8"><header><p className="text-sm font-medium text-blue">Repeatable action</p><h2 className="mt-2 text-4xl font-semibold tracking-[-0.07em]">Workflows are goal-specific.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Deploy more than one workflow from a goal. Each one can have its own trigger, permissions, and review path.</p></header><section className="rounded-3xl bg-ink p-6 text-white sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-soft">Workflow control plane</p><section className="mt-8 grid gap-6 sm:grid-cols-3"><Metric value={String(workflowCount)} label="Deployed" detail="Across your goals" /><Metric value="0" label="Running" detail="Nothing is automatic yet" /><Metric value="Review" label="Permission" detail="Always before publishing" /></section></section>{workflowCount === 0 ? <section className="rounded-3xl border border-dashed border-line bg-wash px-6 py-16 text-center"><h3 className="text-xl font-semibold tracking-[-0.04em]">No workflows deployed</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">Start from a goal, define what the workflow can do, and deploy it when you’re ready.</p><button type="button" onClick={openCreateGoal} className="mt-6 rounded-xl bg-blue px-4 py-2.5 text-sm font-bold text-white">Create a goal first</button></section> : null}</section></section>;
}

function Metric({ value, label, detail }: { value: string; label: string; detail: string }) { return <article className="rounded-2xl bg-white/10 p-5"><p className="text-3xl font-semibold tracking-[-0.06em]">{value}</p><p className="mt-4 text-sm font-semibold">{label}</p><p className="mt-1 text-xs text-white/60">{detail}</p></article>; }
