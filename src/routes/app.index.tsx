import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { XGoalMark } from "../components/logo";
import { createClient } from "../lib/supabase/client";

type DrawerState = "open" | "closed";
type GoalStatus = "active" | "draft" | "paused" | "completed";
type GoalFilter = "all" | GoalStatus;

type Goal = {
  id: string;
  title: string;
  status: GoalStatus;
  workflowCount: number;
  updatedAt: string;
};

type UserSummary = {
  name: string;
  handle: string;
  email: string;
  avatarUrl: string | null;
};

export const Route = createFileRoute("/app/")({
  validateSearch: (search: Record<string, unknown>): { drawer?: DrawerState } => ({
    drawer:
      search.drawer === "closed" || search.drawer === "open"
        ? search.drawer
        : undefined,
  }),
  component: AppPage,
});

function Icon({
  children,
  className = "size-5",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function ArrowUpRightIcon() {
  return (
    <Icon className="size-4">
      <path d="M6.5 17.5 17.5 6.5" />
      <path d="M8 6.5h9.5V16" />
    </Icon>
  );
}

function ChevronDownIcon() {
  return (
    <Icon className="size-4">
      <path d="m6 9 6 6 6-6" />
    </Icon>
  );
}

function ChevronRightIcon() {
  return (
    <Icon className="size-4">
      <path d="m9 18 6-6-6-6" />
    </Icon>
  );
}

function PlusIcon() {
  return (
    <Icon className="size-4">
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

function GridIcon() {
  return (
    <Icon>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </Icon>
  );
}

function GoalIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="3" />
      <path d="m17.5 6.5 2-2M19.5 4.5h-3M19.5 4.5v3" />
    </Icon>
  );
}

function WorkflowIcon() {
  return (
    <Icon>
      <rect x="4" y="4" width="6" height="5" rx="1" />
      <rect x="14" y="15" width="6" height="5" rx="1" />
      <rect x="4" y="15" width="6" height="5" rx="1" />
      <path d="M10 6.5h2a2 2 0 0 1 2 2v6.5M10 17.5h4" />
    </Icon>
  );
}

function SettingsIcon({ className = "size-5" }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
      <path d="m19.4 15 .1.1a1.8 1.8 0 0 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3.1 1.3v.2a1.8 1.8 0 0 1-3.6 0v-.2a1.8 1.8 0 0 0-3.1-1.3l-.1.1a1.8 1.8 0 0 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-1.3-3.1h-.2a1.8 1.8 0 0 1 0-3.6h.2a1.8 1.8 0 0 0 1.3-3.1l-.1-.1a1.8 1.8 0 0 1 2.5-2.5l.1.1A1.8 1.8 0 0 0 10.2 2h.2a1.8 1.8 0 0 1 3.6 0v.2a1.8 1.8 0 0 0 3.1 1.3l.1-.1a1.8 1.8 0 0 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 1.3 3.1h.2a1.8 1.8 0 0 1 0 3.6h-.2a1.8 1.8 0 0 0-1.3 2.3Z" />
    </Icon>
  );
}

function PanelLeftIcon() {
  return (
    <Icon>
      <rect x="3.5" y="4" width="17" height="16" rx="2" />
      <path d="M8.5 4v16M14 10l-2 2 2 2" />
    </Icon>
  );
}

function XIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.9 2H22l-6.77 7.74L23.2 22h-6.24l-4.89-6.38L6.48 22H3.36l7.24-8.28L2.8 2h6.4l4.42 5.84L18.9 2Zm-1.1 17.84h1.73L8.26 4.04H6.4L17.8 19.84Z" />
    </svg>
  );
}

function getUserSummary(user: User): UserSummary {
  const metadata = user.user_metadata as Record<string, unknown>;
  const rawHandle =
    (typeof metadata.user_name === "string" && metadata.user_name) ||
    (typeof metadata.preferred_username === "string" && metadata.preferred_username) ||
    (typeof metadata.screen_name === "string" && metadata.screen_name) ||
    "your-handle";
  const handle = rawHandle.replace(/^@/, "");
  const name =
    (typeof metadata.full_name === "string" && metadata.full_name) ||
    (typeof metadata.name === "string" && metadata.name) ||
    handle;
  const avatarUrl =
    (typeof metadata.avatar_url === "string" && metadata.avatar_url) ||
    (typeof metadata.profile_image_url === "string" && metadata.profile_image_url) ||
    (typeof metadata.picture === "string" && metadata.picture) ||
    null;

  return {
    name,
    handle: `@${handle}`,
    email: user.email ?? "",
    avatarUrl,
  };
}

function AppPage() {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [authState, setAuthState] = useState<"loading" | "signed-in" | "signed-out">("loading");

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user ? getUserSummary(data.session.user) : null);
      setAuthState(data.session ? "signed-in" : "signed-out");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ? getUserSummary(session.user) : null);
      setAuthState(session ? "signed-in" : "signed-out");
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (authState === "loading") {
    return (
      <main className="grid min-h-screen place-items-center bg-paper text-ink">
        <p className="text-sm text-muted">Loading your workspace...</p>
      </main>
    );
  }

  if (authState === "signed-out" || !user) {
    return <OnboardingPage />;
  }

  return <Dashboard user={user} />;
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
          redirectTo: `${window.location.origin}/auth/callback`,
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
      <header className="mx-auto flex h-20 w-[calc(100%-2rem)] max-w-6xl items-center justify-between gap-6 sm:h-24 sm:w-[calc(100%-4rem)]">
        <Link to="/" className="flex items-center gap-3" aria-label="xGoal home">
          <XGoalMark className="size-9" />
          <span className="font-bold tracking-[-0.04em]">xGoal</span>
        </Link>
        <Link to="/" className="text-sm font-semibold text-muted transition-colors hover:text-ink">Back to home</Link>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-9rem)] w-[calc(100%-2rem)] max-w-6xl items-center gap-12 py-12 sm:w-[calc(100%-4rem)] sm:py-20 lg:grid-cols-[1fr_0.82fr] lg:gap-24">
        <article className="max-w-xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue sm:text-sm">Your workspace starts here</p>
          <h1 className="mt-6 max-w-xl text-6xl font-semibold leading-[0.92] tracking-[-0.085em] sm:text-7xl">Show up with a little more intention.</h1>
          <p className="mt-7 max-w-lg text-base leading-7 text-muted sm:text-lg sm:leading-8">Connect your X account and give xGoal the context it needs to help you build a useful presence.</p>
          <ul className="mt-10 max-w-lg divide-y divide-line border-y border-line">
            <li className="flex gap-4 py-4 text-sm leading-6 text-muted sm:py-5"><span className="font-bold text-blue">01</span><span>One secure sign-in for your xGoal workspace.</span></li>
            <li className="flex gap-4 py-4 text-sm leading-6 text-muted sm:py-5"><span className="font-bold text-blue">02</span><span>Your goals stay yours — nothing publishes without your approval.</span></li>
          </ul>
        </article>

        <article className="relative overflow-hidden rounded-3xl border border-line bg-white p-6 shadow-xl sm:p-8">
          <span className="pointer-events-none absolute -right-14 -top-14 size-36 rounded-full bg-blue-soft" />
          <section className="relative">
            <header className="flex items-center justify-between gap-4 text-xs font-bold uppercase tracking-[0.14em] text-muted"><span>Get started</span><span>1 / 1</span></header>
            <p className="mt-14 grid size-14 place-items-center rounded-2xl bg-ink text-white shadow-lg"><XIcon className="size-6" /></p>
            <h2 className="mt-7 text-4xl font-semibold tracking-[-0.06em]">Continue with X</h2>
            <p className="mt-4 max-w-sm text-sm leading-6 text-muted sm:text-base sm:leading-7">Use your X account to create your xGoal workspace and get started in one step.</p>
            <button type="button" onClick={handleContinueWithX} disabled={isSigningIn} aria-busy={isSigningIn} className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-ink px-5 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">{isSigningIn ? "Opening X..." : "Continue with X"}<ArrowUpRightIcon /></button>
            {error ? <p className="mt-4 text-center text-xs leading-5 text-red-600" role="alert">{error}</p> : null}
            <p className="mt-5 text-center text-xs leading-5 text-muted">You stay in control. xGoal starts with drafts and suggestions, not autoposting.</p>
          </section>
        </article>
      </section>
    </main>
  );
}

function Dashboard({ user }: { user: UserSummary }) {
  const navigate = useNavigate({ from: "/app/" });
  const { drawer } = Route.useSearch();
  const drawerOpen = drawer !== "closed";
  const [filter, setFilter] = useState<GoalFilter>("all");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");

  const visibleGoals = useMemo(
    () => (filter === "all" ? goals : goals.filter((goal) => goal.status === filter)),
    [filter, goals],
  );

  function toggleDrawer() {
    void navigate({
      search: (current) => ({
        ...current,
        drawer: drawerOpen ? "closed" : "open",
      }),
    });
  }

  function createGoal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newGoalTitle.trim();
    if (!title) return;

    setGoals((current) => [
      {
        id: crypto.randomUUID(),
        title,
        status: "draft",
        workflowCount: 0,
        updatedAt: "Just now",
      },
      ...current,
    ]);
    setNewGoalTitle("");
    setIsCreating(false);
  }

  async function signOut() {
    await createClient().auth.signOut();
  }

  return (
    <main className="flex min-h-screen bg-wash text-ink">
      <aside className={`sticky top-0 flex h-screen shrink-0 flex-col border-r border-line bg-paper transition-all duration-200 ${drawerOpen ? "w-72 p-5" : "w-20 p-3"}`} aria-label="Workspace navigation">
        <header className={`flex items-center ${drawerOpen ? "justify-between" : "justify-center"}`}>
          <Link to="/" className="flex items-center gap-3" aria-label="xGoal home">
            <XGoalMark className="size-9 shrink-0" />
            {drawerOpen ? <span className="font-bold tracking-[-0.04em]">xGoal</span> : null}
          </Link>
          {drawerOpen ? <button type="button" onClick={toggleDrawer} className="rounded-lg p-2 text-muted transition-colors hover:bg-wash hover:text-ink" aria-label="Collapse navigation"><PanelLeftIcon /></button> : null}
        </header>

        {!drawerOpen ? <button type="button" onClick={toggleDrawer} className="mt-7 self-center rounded-lg p-2 text-muted transition-colors hover:bg-wash hover:text-ink" aria-label="Expand navigation"><PanelLeftIcon /></button> : null}

        <nav className="mt-10 space-y-1" aria-label="Main navigation">
          <a href="#overview" className={`flex items-center rounded-xl bg-ink px-3 py-3 text-sm font-semibold text-white ${drawerOpen ? "gap-3" : "justify-center"}`} title={drawerOpen ? undefined : "Overview"}><GridIcon />{drawerOpen ? <span>Overview</span> : null}</a>
          <a href="#goals" className={`flex items-center rounded-xl px-3 py-3 text-sm font-semibold text-muted transition-colors hover:bg-wash hover:text-ink ${drawerOpen ? "gap-3" : "justify-center"}`} title={drawerOpen ? undefined : "Goals"}><GoalIcon />{drawerOpen ? <span>Goals</span> : null}</a>
          <a href="#workflows" className={`flex items-center rounded-xl px-3 py-3 text-sm font-semibold text-muted transition-colors hover:bg-wash hover:text-ink ${drawerOpen ? "gap-3" : "justify-center"}`} title={drawerOpen ? undefined : "Workflows"}><WorkflowIcon />{drawerOpen ? <span>Workflows</span> : null}</a>
        </nav>

        {drawerOpen ? <section className="mt-10 min-h-0 flex-1" aria-labelledby="goal-navigation-heading">
          <header className="flex items-center justify-between gap-3 px-2"><h2 id="goal-navigation-heading" className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Goals</h2><button type="button" onClick={() => setIsCreating(true)} className="rounded-lg p-1.5 text-muted transition-colors hover:bg-wash hover:text-ink" aria-label="Create a goal"><PlusIcon /></button></header>
          <label className="relative mt-3 block"><span className="sr-only">Filter goals by status</span><select value={filter} onChange={(event) => setFilter(event.target.value as GoalFilter)} className="w-full appearance-none rounded-xl border border-line bg-white px-3 py-2.5 pr-9 text-sm font-medium text-ink outline-none transition focus:border-blue"><option value="all">All goals</option><option value="active">Active</option><option value="draft">Drafts</option><option value="paused">Paused</option><option value="completed">Completed</option></select><span className="pointer-events-none absolute right-3 top-3 text-muted"><ChevronDownIcon /></span></label>
          <ul className="mt-4 space-y-1 overflow-y-auto">{visibleGoals.map((goal) => <li key={goal.id}><a href={`#goal-${goal.id}`} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm text-muted transition-colors hover:bg-wash hover:text-ink"><span className="truncate">{goal.title}</span><span className="size-2 shrink-0 rounded-full bg-blue" /></a></li>)}{visibleGoals.length === 0 ? <li className="rounded-xl border border-dashed border-line px-3 py-4 text-xs leading-5 text-muted">No goals here yet. Start with one clear outcome.</li> : null}</ul>
        </section> : null}

        <footer className={`mt-auto border-t border-line pt-4 ${drawerOpen ? "" : "flex justify-center"}`}>
          <button type="button" className={`flex w-full items-center rounded-xl p-2 text-left transition-colors hover:bg-wash ${drawerOpen ? "gap-3" : "justify-center"}`} title={drawerOpen ? undefined : `${user.name} ${user.handle}`}><UserAvatar user={user} />{drawerOpen ? <span className="min-w-0 flex-1"><strong className="block truncate text-sm font-semibold text-ink">{user.name}</strong><small className="mt-0.5 block truncate text-xs text-muted">{user.handle}</small></span> : null}{drawerOpen ? <ChevronRightIcon /> : null}</button>
          {drawerOpen ? <button type="button" onClick={signOut} className="mt-2 flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-xs font-semibold text-muted transition-colors hover:bg-wash hover:text-ink"><SettingsIcon className="size-4" />Sign out</button> : null}
        </footer>
      </aside>

      <section className="min-w-0 flex-1" id="overview">
        <header className="flex min-h-20 items-center justify-between gap-6 border-b border-line bg-paper px-5 sm:px-8"><section><p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Workspace</p><h1 className="mt-1 text-xl font-semibold tracking-[-0.04em]">Overview</h1></section><button type="button" onClick={() => setIsCreating(true)} className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-transform hover:-translate-y-0.5"><PlusIcon />New goal</button></header>

        <section className="mx-auto max-w-7xl space-y-6 p-5 sm:p-8" aria-label="Dashboard content">
          <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><section><p className="text-sm font-medium text-blue">Your operating system for showing up</p><h2 className="mt-2 max-w-2xl text-4xl font-semibold tracking-[-0.07em] sm:text-5xl">Good to see you, {user.name.split(" ")[0]}.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Goals give your work direction. Workflows turn that direction into repeatable action.</p></section><p className="text-xs font-medium text-muted">{user.email}</p></header>

          <section className="grid gap-4 sm:grid-cols-3" aria-label="Workspace summary"><Metric label="Active goals" value={String(goals.filter((goal) => goal.status === "active").length)} detail="Your current focus" /><Metric label="Workflows" value={String(goals.reduce((total, goal) => total + goal.workflowCount, 0))} detail="Ready to deploy" /><Metric label="Permissions" value="0" detail="Review when you create a goal" /></section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
            <article id="goals" className="rounded-3xl border border-line bg-paper p-5 sm:p-7"><header className="flex items-start justify-between gap-4"><section><p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">The foundation</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.05em]">Goals</h2></section><button type="button" onClick={() => setIsCreating(true)} className="hidden items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold transition-colors hover:border-ink sm:inline-flex"><PlusIcon />Create</button></header>{visibleGoals.length === 0 ? <section className="mt-8 rounded-2xl border border-dashed border-line bg-white px-6 py-12 text-center"><p className="mx-auto grid size-12 place-items-center rounded-2xl bg-blue-pale text-blue"><GoalIcon /></p><h3 className="mt-5 text-xl font-semibold tracking-[-0.04em]">Create the first goal</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">Describe the outcome you want. xGoal will help turn the prompt into the right permissions, branches, and workflows.</p><button type="button" onClick={() => setIsCreating(true)} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-white"><PlusIcon />Create a goal</button></section> : <ul className="mt-8 space-y-3">{visibleGoals.map((goal) => <GoalCard key={goal.id} goal={goal} />)}</ul>}</article>
            <aside id="workflows" className="rounded-3xl bg-ink p-6 text-white sm:p-7"><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-soft">How xGoal works</p><h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em]">One goal. Many ways forward.</h2><ol className="mt-8 space-y-6"><li className="flex gap-4"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-bold text-blue-soft">01</span><span><strong className="block text-sm">Define the outcome</strong><small className="mt-1 block text-sm leading-5 text-white/60">Start with the result you want to create.</small></span></li><li className="flex gap-4"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-bold text-blue-soft">02</span><span><strong className="block text-sm">Review permissions</strong><small className="mt-1 block text-sm leading-5 text-white/60">Control what the agent can read, draft, or publish.</small></span></li><li className="flex gap-4"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-bold text-blue-soft">03</span><span><strong className="block text-sm">Deploy workflows</strong><small className="mt-1 block text-sm leading-5 text-white/60">Run multiple workflows from the same goal.</small></span></li></ol></aside>
          </section>
        </section>
      </section>

      {isCreating ? <section className="fixed inset-0 z-20 grid place-items-center bg-ink/30 p-5" role="dialog" aria-modal="true" aria-labelledby="new-goal-heading"><form onSubmit={createGoal} className="w-full max-w-lg rounded-3xl border border-line bg-paper p-6 shadow-2xl sm:p-8"><header className="flex items-start justify-between gap-4"><section><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue">New foundation</p><h2 id="new-goal-heading" className="mt-2 text-2xl font-semibold tracking-[-0.05em]">What are you working toward?</h2></section><button type="button" onClick={() => setIsCreating(false)} className="rounded-lg px-2 py-1 text-2xl leading-none text-muted hover:bg-wash hover:text-ink" aria-label="Close">×</button></header><label className="mt-8 block"><span className="text-sm font-semibold">Goal statement</span><textarea value={newGoalTitle} onChange={(event) => setNewGoalTitle(event.target.value)} autoFocus rows={4} placeholder="e.g. Build a thoughtful presence around product design" className="mt-2 w-full resize-none rounded-2xl border border-line bg-white p-4 text-sm leading-6 outline-none transition focus:border-blue" /></label><p className="mt-3 text-xs leading-5 text-muted">You can refine the details and permissions after the goal is created.</p><footer className="mt-7 flex justify-end gap-3"><button type="button" onClick={() => setIsCreating(false)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted hover:bg-wash hover:text-ink">Cancel</button><button type="submit" disabled={!newGoalTitle.trim()} className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Create goal<ArrowUpRightIcon /></button></footer></form></section> : null}
    </main>
  );
}

function UserAvatar({ user }: { user: UserSummary }) {
  return user.avatarUrl ? <img src={user.avatarUrl} alt="" className="size-9 shrink-0 rounded-xl object-cover" /> : <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue text-xs font-bold text-white">{user.name.slice(0, 1).toUpperCase()}</span>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="rounded-2xl border border-line bg-paper p-5"><p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">{label}</p><p className="mt-4 text-3xl font-semibold tracking-[-0.06em]">{value}</p><p className="mt-1 text-xs text-muted">{detail}</p></article>;
}

function GoalCard({ goal }: { goal: Goal }) {
  return <li id={`goal-${goal.id}`} className="rounded-2xl border border-line bg-white p-5 transition-colors hover:border-blue sm:p-6"><header className="flex items-start justify-between gap-4"><section className="min-w-0"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${goal.status === "active" ? "bg-blue-pale text-blue-dark" : "bg-wash text-muted"}`}>{goal.status}</span><h3 className="mt-4 truncate text-lg font-semibold tracking-[-0.04em]">{goal.title}</h3></section><button type="button" className="rounded-lg p-2 text-muted hover:bg-wash hover:text-ink" aria-label={`Open ${goal.title}`}><ChevronRightIcon /></button></header><footer className="mt-5 flex items-center justify-between gap-4 border-t border-line pt-4 text-xs text-muted"><span>{goal.workflowCount} workflows</span><span>Updated {goal.updatedAt}</span></footer></li>;
}
