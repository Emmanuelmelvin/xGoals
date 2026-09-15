import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { createClient } from "../lib/supabase/client";
import { XGoalMark } from "./logo";

/**
 * Header for unauthenticated-friendly pages. Unlike the static version it
 * replaced, it checks the session so signed-in visitors see
 * "Open workspace" instead of "Sign in".
 */
export function PublicHeader({ showExplore = false }: { showExplore?: boolean }) {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let mounted = true;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (mounted) setSignedIn(!!data.user);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-paper">
      <div className="mx-auto flex min-h-20 w-[calc(100%-2rem)] max-w-6xl items-center justify-between gap-6 sm:w-[calc(100%-4rem)]">
        <Link to="/" className="flex items-center gap-3" aria-label="xGoal home">
          <XGoalMark className="size-9 shrink-0" />
          <span className="font-bold tracking-[-0.04em]">xGoal</span>
        </Link>
        <nav className="flex items-center gap-2" aria-label="Public navigation">
          {showExplore ? (
            <Link
              to="/goals"
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:bg-wash hover:text-ink"
            >
              Explore
            </Link>
          ) : null}
          <Link
            to="/app"
            className="rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-ink-soft"
          >
            {signedIn ? "Open workspace" : "Sign in"}
          </Link>
        </nav>
      </div>
    </header>
  );
}
