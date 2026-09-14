import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { XGoalMark } from "../components/logo";
import { createClient } from "../lib/supabase/client";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

const STEPS = [
  {
    number: "01",
    title: "Set the direction",
    body: "Describe what you want to be known for and what meaningful progress looks like.",
  },
  {
    number: "02",
    title: "Let the agent look",
    body: "It finds the next useful idea, conversation, or draft for the goal you set.",
  },
  {
    number: "03",
    title: "Keep your voice",
    body: "Review, edit, and approve every piece before it becomes part of your presence.",
  },
];

function ArrowUpRightIcon({ className = "size-5" }: { className?: string }) {
  return <ArrowUpRight className={className} aria-hidden="true" strokeWidth={1.8} />;
}

function GoalBoard() {
  return (
    <div className="relative mx-auto w-full max-w-[69.5rem]">
      <div className="pointer-events-none absolute -left-8 top-16 hidden -rotate-6 rounded-2xl border border-white/80 bg-white px-4 py-3 text-sm font-semibold text-ink shadow-[0_14px_40px_rgba(16,20,28,0.12)] lg:block">
        draft first
      </div>
      <div className="pointer-events-none absolute -right-7 bottom-16 hidden rotate-6 rounded-2xl border border-white/80 bg-blue px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(37,99,235,0.22)] lg:block">
        keep your voice
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-line bg-white shadow-[0_24px_70px_rgba(16,20,28,0.12)]">
        <div className="flex h-12 items-center gap-2 border-b border-line bg-wash px-4 sm:px-6">
          <span className="size-2 rounded-full bg-blue" />
          <span className="size-2 rounded-full bg-ink/25" />
          <span className="size-2 rounded-full bg-ink/15" />
          <p className="ml-auto text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted">
            xGoal workspace
          </p>
        </div>

        <div className="grid lg:grid-cols-[0.31fr_1fr]">
          <aside className="border-b border-line bg-wash p-5 lg:border-b-0 lg:border-r sm:p-7">
            <div className="flex items-center gap-3 border-b border-line pb-6">
              <XGoalMark className="size-9" />
              <div>
                <p className="text-sm font-bold text-ink">Your presence</p>
                <p className="text-xs text-muted">AI agents community</p>
              </div>
            </div>
            <nav className="mt-6 space-y-2" aria-label="Workspace preview navigation">
              <p className="rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-ink shadow-sm">
                Overview
              </p>
              <p className="px-3 py-2.5 text-sm text-muted">Drafts</p>
              <p className="px-3 py-2.5 text-sm text-muted">Conversations</p>
              <p className="px-3 py-2.5 text-sm text-muted">Activity</p>
            </nav>
          </aside>

          <div className="p-5 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-7">
              <div>
                <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-blue">
                  Active goal
                </p>
                <h2 className="mt-3 max-w-xl text-2xl font-semibold leading-tight tracking-[-0.04em] text-ink sm:text-3xl">
                  Become more visible in the AI agents community.
                </h2>
                <p className="mt-3 max-w-lg text-sm leading-6 text-muted">
                  30 days · practical technical posts · everything approved by you
                </p>
              </div>
              <p className="rounded-full bg-blue-soft px-3 py-1.5 text-xs font-bold text-blue-dark">
                67% complete
              </p>
            </div>

            <div className="grid gap-7 pt-7 md:grid-cols-[1fr_0.8fr]">
              <div>
                <div className="flex items-center justify-between text-sm font-semibold">
                  <p className="text-ink">Goal progress</p>
                  <p className="text-blue">8 of 12 posts</p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-blue-soft">
                  <div className="h-full w-2/3 rounded-full bg-blue" />
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-line p-4">
                    <p className="text-2xl font-bold tracking-[-0.05em] text-ink">3 / 5</p>
                    <p className="mt-1 text-xs text-muted">conversations started</p>
                  </div>
                  <div className="rounded-2xl border border-line p-4">
                    <p className="text-2xl font-bold tracking-[-0.05em] text-ink">4</p>
                    <p className="mt-1 text-xs text-muted">drafts to review</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-blue-pale p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-blue-dark">
                    Next useful move
                  </p>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[0.65rem] font-bold text-blue">
                    Draft
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold leading-tight tracking-[-0.03em] text-ink">
                  Review a draft about agent reliability.
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted">
                  Connected to your recent work and a conversation where you can add value.
                </p>
                <Link
                  to="/app"
                  className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-blue-dark"
                >
                  Open draft <ArrowUpRightIcon className="size-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LandingPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let supabase;

    try {
      supabase = createClient();
    } catch {
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setIsAuthenticated(Boolean(data.session));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session));
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen overflow-hidden bg-paper text-ink">
      <header className="mx-auto flex h-20 w-[calc(100%-2rem)] max-w-[75rem] items-center justify-between gap-6 sm:h-24 sm:w-[calc(100%-4rem)]">
        <Link to="/" className="flex items-center gap-3" aria-label="xGoal home">
          <XGoalMark className="size-9" />
          <span className="text-lg font-bold tracking-[-0.04em]">xGoal</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm font-semibold sm:gap-6" aria-label="Site navigation">
          <Link
            to="/app"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue px-4 py-2.5 text-white shadow-[0_4px_12px_rgba(16,20,28,0.14)] transition-transform hover:-translate-y-0.5"
          >
            {isAuthenticated ? "Go to Dashboard" : "Start xGoal"} <ArrowUpRightIcon className="size-4" />
          </Link>
        </nav>
      </header>

      <main>
        <section className="relative isolate mx-auto mb-14 w-[calc(100%-2rem)] max-w-[75rem] overflow-hidden rounded-[2rem] bg-blue-soft px-5 py-16 text-center sm:mb-20 sm:w-[calc(100%-4rem)] sm:rounded-[2.5rem] sm:px-8 sm:py-24">
          <div className="pointer-events-none absolute -left-10 top-12 hidden size-24 animate-[float-slow_7s_ease-in-out_infinite] rounded-[1.5rem] border border-white/70 bg-white/60 shadow-[0_14px_34px_rgba(37,99,235,0.12)] lg:block" />
          <div className="pointer-events-none absolute -right-8 bottom-10 hidden size-28 animate-[float-reverse_8s_ease-in-out_infinite] rounded-[1.75rem] border border-white/70 bg-blue/15 lg:block" />
          <div className="relative z-10 mx-auto max-w-[62rem]">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-dark sm:text-sm">
              The goal-driven content workspace
            </p>
            <h1 className="mx-auto mt-6 max-w-[60rem] text-[clamp(3.65rem,8.5vw,7.6rem)] font-semibold leading-[0.91] tracking-[-0.085em] text-ink">
              A clearer way to show up on X.
            </h1>
            <p className="mx-auto mt-7 max-w-[38rem] text-base leading-7 text-muted sm:text-lg sm:leading-8">
              Set a direction. Let an agent find the next useful move. Keep your voice,
              your judgment, and the final say.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/app"
                className="inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-blue px-5 py-3 text-sm font-bold text-white shadow-[0_5px_18px_rgba(16,20,28,0.18)] transition-transform hover:-translate-y-0.5"
              >
                Create your first goal <ArrowUpRightIcon />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex min-h-12 items-center justify-center gap-3 rounded-xl border border-white/80 bg-white/60 px-5 py-3 text-sm font-bold text-ink transition-colors hover:bg-white"
              >
                See how it works
              </a>
            </div>
            <p className="mt-5 text-sm text-muted">
              No autoposting. No content treadmill. Just useful momentum.
            </p>
          </div>
        </section>

        <section className="mx-auto w-[calc(100%-2rem)] max-w-[75rem] sm:w-[calc(100%-4rem)]">
          <GoalBoard />
        </section>

        <section className="mx-auto flex min-h-[13rem] w-[calc(100%-2rem)] max-w-[75rem] items-center justify-center px-4 py-16 text-center sm:w-[calc(100%-4rem)] sm:py-24">
          <p className="max-w-[58rem] text-[clamp(2rem,4.5vw,3.75rem)] leading-[1.1] tracking-[-0.06em] text-muted">
            For the <strong className="font-bold text-blue">builders.</strong> The{" "}
            <strong className="font-bold text-ink">researchers.</strong> The{" "}
            <strong className="font-bold text-blue-dark">“anyone still up?”</strong> people.
          </p>
        </section>

        <section
          id="how-it-works"
          className="mx-auto w-[calc(100%-2rem)] max-w-[75rem] border-t border-line py-16 sm:w-[calc(100%-4rem)] sm:py-24"
        >
          <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:gap-24">
            <div className="max-w-[28rem]">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue sm:text-sm">
                How it works
              </p>
              <h2 className="mt-5 text-4xl font-semibold leading-[0.98] tracking-[-0.07em] sm:text-6xl">
                One goal. One useful move at a time.
              </h2>
              <p className="mt-6 text-base leading-7 text-muted sm:text-lg">
                xGoal turns a vague intention into a focused rhythm you can see and shape.
              </p>
            </div>
            <ol className="divide-y divide-line border-y border-line">
              {STEPS.map((step) => (
                <li key={step.number} className="grid gap-4 py-7 sm:grid-cols-[4.5rem_1fr] sm:gap-6 sm:py-9">
                  <p className="text-sm font-bold text-blue">{step.number}</p>
                  <div>
                    <h3 className="text-xl font-semibold tracking-[-0.04em] sm:text-2xl">{step.title}</h3>
                    <p className="mt-2 max-w-[34rem] text-base leading-7 text-muted">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto mb-10 w-[calc(100%-2rem)] max-w-[75rem] overflow-hidden rounded-[2rem] bg-ink px-6 py-12 text-white sm:mb-16 sm:w-[calc(100%-4rem)] sm:rounded-[2.5rem] sm:px-12 sm:py-16">
          <div className="grid items-end gap-10 lg:grid-cols-[1fr_0.85fr] lg:gap-20">
            <div className="max-w-[38rem]">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-soft sm:text-sm">
                Your next 30 days
              </p>
              <h2 className="mt-5 text-[clamp(2.7rem,5vw,4.75rem)] font-semibold leading-[0.96] tracking-[-0.075em]">
                Your ideas are already there. Give them a direction.
              </h2>
              <p className="mt-6 max-w-[31rem] text-base leading-7 text-white/65">
                Start with an outcome. Let xGoal help with the follow-through.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-2xl border border-white/15 bg-white/5 p-5">
                <p className="text-sm font-bold text-white">Draft-first</p>
                <p className="mt-2 text-sm leading-6 text-white/55">Nothing publishes without your approval.</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/5 p-5">
                <p className="text-sm font-bold text-white">Goal-centered</p>
                <p className="mt-2 text-sm leading-6 text-white/55">The work follows your intent, not the feed.</p>
              </div>
            </div>
          </div>
          <Link
            to="/app"
            className="mt-10 inline-flex min-h-12 items-center gap-3 rounded-xl bg-white px-5 py-3 text-sm font-bold text-ink transition-transform hover:-translate-y-0.5"
          >
            Start with a goal <ArrowUpRightIcon />
          </Link>
        </section>
      </main>

      <footer className="mx-auto flex w-[calc(100%-2rem)] max-w-[75rem] items-center justify-between gap-4 border-t border-line py-8 text-sm text-muted sm:w-[calc(100%-4rem)]">
        <div className="flex items-center gap-2 font-semibold text-ink">
          <XGoalMark className="size-5" />
          xGoal
        </div>
        <p>Built for useful momentum.</p>
      </footer>
    </div>
  );
}
