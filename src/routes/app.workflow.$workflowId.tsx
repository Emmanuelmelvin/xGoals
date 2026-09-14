import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app/workflow/$workflowId")({
  head: ({ params }) => ({
    meta: [{ title: `xGoal — ${params.workflowId}` }],
  }),
  component: WorkflowDetailPage,
});

function WorkflowDetailPage() {
  const { workflowId } = Route.useParams();

  return <section className="min-h-screen bg-paper"><header className="sticky top-0 z-10 flex min-h-20 items-center gap-4 border-b border-line bg-paper px-5 sm:px-8"><Link to="/app/workflows" className="text-sm font-semibold text-muted transition-colors hover:text-ink">Workflows</Link><span className="text-muted">/</span><p className="text-sm font-semibold">{workflowId}</p></header><section className="mx-auto max-w-5xl space-y-8 p-5 sm:p-8"><header><p className="text-sm font-medium text-blue">Workflow detail</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.07em]">{workflowId}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted">This workflow will run from a goal, with every action reviewed against its permission set.</p></header><section className="grid gap-4 md:grid-cols-3"><article className="rounded-2xl border border-line bg-white p-5"><p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Status</p><p className="mt-4 text-lg font-semibold">Draft</p><p className="mt-1 text-xs text-muted">Not deployed</p></article><article className="rounded-2xl border border-line bg-white p-5"><p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Goal</p><p className="mt-4 text-lg font-semibold">Not connected</p><p className="mt-1 text-xs text-muted">Choose a goal to continue</p></article><article className="rounded-2xl border border-line bg-white p-5"><p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Permissions</p><p className="mt-4 text-lg font-semibold">0 reviewed</p><p className="mt-1 text-xs text-muted">Nothing can run yet</p></article></section><section className="rounded-3xl border border-line bg-wash p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue">Next step</p><h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em]">Connect this workflow to a goal.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted">A workflow inherits its context from a goal, but its triggers and permissions remain independently reviewable.</p><Link to="/app/goals" className="mt-6 inline-flex rounded-xl bg-blue px-4 py-2.5 text-sm font-bold text-white">View goals</Link></section></section></section>;
}
