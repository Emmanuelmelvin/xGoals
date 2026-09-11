import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app/credits")({
  head: () => ({
    meta: [{ title: "xGoal — Credits" }],
  }),
  component: CreditsPage,
});

function CreditsPage() {
  return (
    <section className="min-h-screen bg-paper">
      <header className="flex min-h-20 items-center justify-between gap-6 border-b border-line px-5 sm:px-8">
        <section>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Workspace</p>
          <h1 className="mt-1 text-xl font-semibold tracking-[-0.04em]">Credits</h1>
        </section>
        <Link to="/app" className="text-sm font-semibold text-muted transition-colors hover:text-ink">
          Back to overview
        </Link>
      </header>

      <section className="mx-auto max-w-6xl space-y-8 p-5 sm:p-8">
        <header>
          <p className="text-sm font-medium text-blue">Usage</p>
          <h2 className="mt-2 text-4xl font-semibold tracking-[-0.07em]">Track your usage here soon.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Credits will show how much agent work, analysis, and scheduled runs your workspace has used.
          </p>
        </header>

        <article className="rounded-3xl border border-dashed border-line bg-wash px-6 py-16 text-center">
          <h3 className="text-xl font-semibold tracking-[-0.04em]">Usage tracking is coming soon</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
            Nothing to set up yet. Your goals and workflows keep working as usual.
          </p>
        </article>
      </section>
    </section>
  );
}
