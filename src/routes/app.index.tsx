import { Link, createFileRoute } from "@tanstack/react-router";
import { XGoalsMark } from "../components/logo";

export const Route = createFileRoute("/app/")({
  component: AppPlaceholder,
});

function AppPlaceholder() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="mx-auto flex h-20 w-[calc(100%-2rem)] max-w-[75rem] items-center justify-between sm:h-24 sm:w-[calc(100%-4rem)]">
        <Link to="/" className="flex items-center gap-3" aria-label="XGoals home">
          <span className="grid size-9 place-items-center rounded-xl bg-ink text-white">
            <XGoalsMark className="size-5" />
          </span>
          <span className="font-bold tracking-[-0.04em]">XGoals</span>
        </Link>
        <Link to="/" className="text-sm font-semibold text-muted hover:text-ink">
          Back to home
        </Link>
      </header>
      <section className="mx-auto flex min-h-[calc(100vh-6rem)] w-[calc(100%-2rem)] max-w-[40rem] items-center justify-center py-16 text-center sm:w-[calc(100%-4rem)]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue">
            Workspace preview
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.07em] sm:text-6xl">
            Your workspace is on its way.
          </h1>
          <p className="mt-6 text-base leading-7 text-muted">
            Goals, drafts, and progress tracking will live here. Onboarding and X
            sign-in are coming next.
          </p>
          <Link
            to="/"
            className="mt-8 inline-flex min-h-12 items-center rounded-xl bg-ink px-5 py-3 text-sm font-bold text-white"
          >
            Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}
