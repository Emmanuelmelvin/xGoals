import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { createClient } from "../../lib/supabase/client";
import { XGoalMark } from "../logo";
import { ArrowUpRightIcon, XIcon } from "./icons";

export function OnboardingPage({ returnTo }: { returnTo?: string }) {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinueWithX() {
    setIsSigningIn(true);
    setError(null);
    try {
      const callback =
        returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")
          ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnTo)}`
          : `${window.location.origin}/auth/callback`;
      const { error: signInError } = await createClient().auth.signInWithOAuth({ provider: "x", options: { redirectTo: callback } });
      if (signInError) { setError(signInError.message); setIsSigningIn(false); }
    } catch { setError("X sign-in is not configured yet. Check your Supabase environment variables."); setIsSigningIn(false); }
  }

  return <main className="min-h-screen bg-paper text-ink"><header className="mx-auto flex h-20 w-[calc(100%-2rem)] max-w-6xl items-center justify-between gap-6 sm:h-24 sm:w-[calc(100%-4rem)]"><Link to="/" className="flex items-center gap-3" aria-label="xGoal home"><XGoalMark className="size-9" /><span className="font-bold tracking-[-0.04em]">xGoal</span></Link><Link to="/" className="text-sm font-semibold text-muted transition-colors hover:text-ink">Back to home</Link></header><section className="mx-auto grid min-h-[calc(100vh-9rem)] w-[calc(100%-2rem)] max-w-6xl items-center gap-12 py-12 sm:w-[calc(100%-4rem)] sm:py-20 lg:grid-cols-[1fr_0.82fr] lg:gap-24"><article className="max-w-xl"><p className="text-sm font-medium text-blue">Your workspace starts here</p><h1 className="mt-6 max-w-xl text-6xl font-semibold leading-[0.92] tracking-[-0.085em] sm:text-7xl">Show up with a little more intention.</h1><p className="mt-7 max-w-lg text-base leading-7 text-muted sm:text-lg sm:leading-8">Connect your X account and give xGoal the context it needs to help you build a useful presence.</p><ul className="mt-10 max-w-lg divide-y divide-line border-y border-line"><li className="flex gap-4 py-4 text-sm leading-6 text-muted sm:py-5"><span className="font-bold text-blue">01</span><span>One secure sign-in for your xGoal workspace.</span></li><li className="flex gap-4 py-4 text-sm leading-6 text-muted sm:py-5"><span className="font-bold text-blue">02</span><span>Your goals stay yours — nothing publishes without your approval.</span></li></ul></article><article className="relative overflow-hidden rounded-3xl border border-line bg-white p-6 shadow-xl sm:p-8"><span className="pointer-events-none absolute -right-14 -top-14 size-36 rounded-full bg-blue-soft" /><section className="relative"><header className="flex items-center justify-between gap-4 text-xs font-semibold text-muted"><span>Get started</span><span>1 / 1</span></header><p className="mt-14 grid size-14 place-items-center rounded-2xl bg-ink text-white shadow-lg"><XIcon /></p><h2 className="mt-7 text-4xl font-semibold tracking-[-0.06em]">Continue with X</h2><p className="mt-4 max-w-sm text-sm leading-6 text-muted sm:text-base sm:leading-7">Use your X account to create your xGoal workspace and get started in one step.</p><button type="button" onClick={handleContinueWithX} disabled={isSigningIn} className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-blue px-5 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">{isSigningIn ? "Opening X..." : "Continue with X"}<ArrowUpRightIcon /></button>{error ? <p className="mt-4 text-center text-xs leading-5 text-red-600" role="alert">{error}</p> : null}<p className="mt-5 text-center text-xs leading-5 text-muted">You stay in control. xGoal starts with drafts and suggestions, not autoposting.</p></section></article></section></main>;
}
