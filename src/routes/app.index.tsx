import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { XGoalMark } from "../components/logo";
import { createClient } from "../lib/supabase/client";

export const Route = createFileRoute("/app/")({
  component: OnboardingPage,
});

function XIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M18.9 2H22l-6.77 7.74L23.2 22h-6.24l-4.89-6.38L6.48 22H3.36l7.24-8.28L2.8 2h6.4l4.42 5.84L18.9 2Zm-1.1 17.84h1.73L8.26 4.04H6.4L17.8 19.84Z" />
    </svg>
  );
}

function ArrowUpRightIcon() {
  return (
    <svg
      className="size-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6.5 17.5 17.5 6.5" />
      <path d="M8 6.5h9.5V16" />
    </svg>
  );
}

function OnboardingPage() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinueWithX() {
    setIsSigningIn(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "x",
        options: {
          redirectTo:
            import.meta.env.VITE_SUPABASE_AUTH_REDIRECT_URL ??
            `${window.location.origin}/auth/callback`,
        },
      });

      if (signInError) {
        setError(signInError.message);
        setIsSigningIn(false);
      }
    } catch {
      setError("X sign-in is not configured yet. Check your Supabase environment variables.");
      setIsSigningIn(false);
    }
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="mx-auto flex h-20 w-[calc(100%-2rem)] max-w-[75rem] items-center justify-between gap-6 sm:h-24 sm:w-[calc(100%-4rem)]">
        <Link to="/" className="flex items-center gap-3" aria-label="xGoal home">
          <XGoalMark className="size-9" />
          <span className="font-bold tracking-[-0.04em]">xGoal</span>
        </Link>
        <Link to="/" className="text-sm font-semibold text-muted transition-colors hover:text-ink">
          Back to home
        </Link>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-9rem)] w-[calc(100%-2rem)] max-w-[75rem] items-center gap-12 py-12 sm:w-[calc(100%-4rem)] sm:py-20 lg:grid-cols-[1fr_0.82fr] lg:gap-24">
        <div className="max-w-[39rem]">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue sm:text-sm">
            Your workspace starts here
          </p>
          <h1 className="mt-6 max-w-[38rem] text-[clamp(3.25rem,7vw,6.5rem)] font-semibold leading-[0.92] tracking-[-0.085em]">
            Show up with a little more intention.
          </h1>
          <p className="mt-7 max-w-[32rem] text-base leading-7 text-muted sm:text-lg sm:leading-8">
            Connect your X account and give xGoal the context it needs to help you build a useful presence.
          </p>
          <ul className="mt-10 max-w-[31rem] divide-y divide-line border-y border-line">
            <li className="flex gap-4 py-4 text-sm leading-6 text-muted sm:py-5">
              <span className="font-bold text-blue">01</span>
              <span>One secure sign-in for your xGoal workspace.</span>
            </li>
            <li className="flex gap-4 py-4 text-sm leading-6 text-muted sm:py-5">
              <span className="font-bold text-blue">02</span>
              <span>Your goals stay yours — nothing publishes without your approval.</span>
            </li>
          </ul>
        </div>

        <article className="relative overflow-hidden rounded-[2rem] border border-line bg-white p-6 shadow-[0_24px_70px_rgba(16,20,28,0.1)] sm:p-8">
          <div className="pointer-events-none absolute -right-14 -top-14 size-36 rounded-full bg-blue-soft" />
          <div className="relative">
            <div className="flex items-center justify-between gap-4 text-xs font-bold uppercase tracking-[0.14em] text-muted">
              <span>Get started</span>
              <span>1 / 1</span>
            </div>

            <div className="mt-14 grid size-14 place-items-center rounded-2xl bg-ink text-white shadow-[0_8px_22px_rgba(16,20,28,0.16)]">
              <XIcon className="size-6" />
            </div>
            <h2 className="mt-7 text-3xl font-semibold tracking-[-0.06em] sm:text-4xl">
              Continue with X
            </h2>
            <p className="mt-4 max-w-[24rem] text-sm leading-6 text-muted sm:text-base sm:leading-7">
              Use your X account to create your xGoal workspace and get started in one step.
            </p>

            <button
              type="button"
              onClick={handleContinueWithX}
              disabled={isSigningIn}
              aria-busy={isSigningIn}
              className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-ink px-5 py-3 text-sm font-bold text-white shadow-[0_5px_18px_rgba(16,20,28,0.18)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSigningIn ? "Opening X..." : "Continue with X"}
              <ArrowUpRightIcon />
            </button>
            {error ? (
              <p className="mt-4 text-center text-xs leading-5 text-red-600" role="alert">
                {error}
              </p>
            ) : null}
            <p className="mt-5 text-center text-xs leading-5 text-muted">
              You stay in control. xGoal starts with drafts and suggestions, not autoposting.
            </p>
          </div>
        </article>
      </section>

      <footer className="mx-auto flex w-[calc(100%-2rem)] max-w-[75rem] items-center justify-between gap-4 border-t border-line py-7 text-xs text-muted sm:w-[calc(100%-4rem)]">
        <span>Private by default.</span>
        <span>xGoal</span>
      </footer>
    </main>
  );
}
