import { createContext, useContext, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { XGoalMark } from "./logo";
import { createClient } from "../lib/supabase/client";
import { analyzeGoal } from "../lib/ai/agent-server-fns";

export type DrawerState = "open" | "closed";
export type GoalStatus = "active" | "draft" | "paused" | "completed";
export type GoalFilter = "all" | GoalStatus;

export type Goal = {
  id: string;
  title: string;
  status: GoalStatus;
  workflowCount: number;
  updatedAt: string;
};

export type UserSummary = {
  id: string;
  name: string;
  handle: string;
  email: string;
  avatarUrl: string | null;
  profileUrl: string;
};

type DashboardContextValue = {
  user: UserSummary;
  goals: Goal[];
  visibleGoals: Goal[];
  isGoalsLoading: boolean;
  goalError: string | null;
  filter: GoalFilter;
  setFilter: (filter: GoalFilter) => void;
  openCreateGoal: () => void;
};

const goalFilterOptions: Array<{ value: GoalFilter; label: string }> = [
  { value: "all", label: "All goals" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Drafts" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
];

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) throw new Error("useDashboard must be used inside DashboardRouteLayout.");
  return context;
}

function Icon({ children, className = "size-5" }: { children: ReactNode; className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
}

function ArrowUpRightIcon() {
  return <Icon className="size-4"><path d="M6.5 17.5 17.5 6.5" /><path d="M8 6.5h9.5V16" /></Icon>;
}

function ChevronDownIcon() {
  return <Icon className="size-4"><path d="m6 9 6 6 6-6" /></Icon>;
}

function ChevronRightIcon() {
  return <Icon className="size-4"><path d="m9 18 6-6-6-6" /></Icon>;
}

function PlusIcon() {
  return <Icon className="size-4"><path d="M12 5v14M5 12h14" /></Icon>;
}

function GridIcon() {
  return <Icon><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></Icon>;
}

function GoalIcon() {
  return <Icon><circle cx="12" cy="12" r="7.5" /><circle cx="12" cy="12" r="3" /><path d="m17.5 6.5 2-2M19.5 4.5h-3M19.5 4.5v3" /></Icon>;
}

function WorkflowIcon() {
  return <Icon><rect x="4" y="4" width="6" height="5" rx="1" /><rect x="14" y="15" width="6" height="5" rx="1" /><rect x="4" y="15" width="6" height="5" rx="1" /><path d="M10 6.5h2a2 2 0 0 1 2 2v6.5M10 17.5h4" /></Icon>;
}

function SettingsIcon() {
  return <Icon className="size-4"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" /><path d="m19.4 15 .1.1a1.8 1.8 0 0 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3.1 1.3v.2a1.8 1.8 0 0 1-3.6 0v-.2a1.8 1.8 0 0 0-3.1-1.3l-.1.1a1.8 1.8 0 0 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-1.3-3.1h-.2a1.8 1.8 0 0 1 0-3.6h.2a1.8 1.8 0 0 0 1.3-3.1l-.1-.1a1.8 1.8 0 0 1 2.5-2.5l.1.1A1.8 1.8 0 0 0 10.2 2h.2a1.8 1.8 0 0 1 3.6 0v.2a1.8 1.8 0 0 0 3.1 1.3l.1-.1a1.8 1.8 0 0 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 1.3 3.1h.2a1.8 1.8 0 0 1 0 3.6h-.2a1.8 1.8 0 0 0-1.3 2.3Z" /></Icon>;
}

function PanelLeftIcon() {
  return <Icon><rect x="3.5" y="4" width="17" height="16" rx="2" /><path d="M8.5 4v16M14 10l-2 2 2 2" /></Icon>;
}

function XIcon() {
  return <svg className="size-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.9 2H22l-6.77 7.74L23.2 22h-6.24l-4.89-6.38L6.48 22H3.36l7.24-8.28L2.8 2h6.4l4.42 5.84L18.9 2Zm-1.1 17.84h1.73L8.26 4.04H6.4L17.8 19.84Z" /></svg>;
}

function getUserSummary(user: User): UserSummary {
  const metadata = user.user_metadata as Record<string, unknown>;
  const rawHandle = (typeof metadata.user_name === "string" && metadata.user_name) || (typeof metadata.preferred_username === "string" && metadata.preferred_username) || (typeof metadata.screen_name === "string" && metadata.screen_name) || "your-handle";
  const handle = rawHandle.replace(/^@/, "");
  const name = (typeof metadata.full_name === "string" && metadata.full_name) || (typeof metadata.name === "string" && metadata.name) || handle;
  const avatarSource = (typeof metadata.avatar_url === "string" && metadata.avatar_url) || (typeof metadata.profile_image_url === "string" && metadata.profile_image_url) || (typeof metadata.profile_image_url_https === "string" && metadata.profile_image_url_https) || (typeof metadata.picture === "string" && metadata.picture) || null;
  const avatarUrl = avatarSource ? avatarSource.replace("_normal.", "_400x400.") : null;
  const profileUrl = (typeof metadata.profile_url === "string" && metadata.profile_url) || (typeof metadata.url === "string" && metadata.url) || `https://x.com/${handle}`;
  return { id: user.id, name, handle: `@${handle}`, email: user.email ?? "", avatarUrl, profileUrl };
}

function isGoalStatus(value: unknown): value is GoalStatus {
  return value === "active" || value === "draft" || value === "paused" || value === "completed";
}

async function loadGoalsForUser(ownerId: string) {
  const supabase = createClient();
  const [{ data: goalRows, error: goalsError }, { data: workflowRows, error: workflowsError }] = await Promise.all([
    supabase.from("goals").select("id,title,status,updated_at").eq("owner_id", ownerId).order("updated_at", { ascending: false }),
    supabase.from("workflows").select("goal_id").eq("owner_id", ownerId),
  ]);

  if (goalsError) return { goals: [] as Goal[], error: goalsError.message };
  if (workflowsError) return { goals: [] as Goal[], error: workflowsError.message };

  const workflowCounts = new Map<string, number>();
  for (const workflow of workflowRows ?? []) {
    if (typeof workflow.goal_id === "string") workflowCounts.set(workflow.goal_id, (workflowCounts.get(workflow.goal_id) ?? 0) + 1);
  }

  return {
    goals: (goalRows ?? []).map((goal) => ({
      id: goal.id,
      title: goal.title,
      status: isGoalStatus(goal.status) ? goal.status : "draft",
      workflowCount: workflowCounts.get(goal.id) ?? 0,
      updatedAt: new Date(goal.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    })),
    error: null,
  };
}

export function DashboardRouteLayout({ drawer, children }: { drawer?: DrawerState; children: ReactNode }) {
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ? getUserSummary(session.user) : null);
      setAuthState(session ? "signed-in" : "signed-out");
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  if (authState === "loading") return <main className="grid min-h-screen place-items-center bg-paper text-ink"><p className="text-sm text-muted">Loading your workspace...</p></main>;
  if (authState === "signed-out" || !user) return <OnboardingPage />;
  return <DashboardShell user={user} drawer={drawer}>{children}</DashboardShell>;
}

function OnboardingPage() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function handleContinueWithX() {
    setIsSigningIn(true);
    setError(null);
    try {
      const { error: signInError } = await createClient().auth.signInWithOAuth({ provider: "x", options: { redirectTo: `${window.location.origin}/auth/callback` } });
      if (signInError) { setError(signInError.message); setIsSigningIn(false); }
    } catch { setError("X sign-in is not configured yet. Check your Supabase environment variables."); setIsSigningIn(false); }
  }
  return <main className="min-h-screen bg-paper text-ink"><header className="mx-auto flex h-20 w-[calc(100%-2rem)] max-w-6xl items-center justify-between gap-6 sm:h-24 sm:w-[calc(100%-4rem)]"><Link to="/" className="flex items-center gap-3" aria-label="xGoal home"><XGoalMark className="size-9" /><span className="font-bold tracking-[-0.04em]">xGoal</span></Link><Link to="/" className="text-sm font-semibold text-muted transition-colors hover:text-ink">Back to home</Link></header><section className="mx-auto grid min-h-[calc(100vh-9rem)] w-[calc(100%-2rem)] max-w-6xl items-center gap-12 py-12 sm:w-[calc(100%-4rem)] sm:py-20 lg:grid-cols-[1fr_0.82fr] lg:gap-24"><article className="max-w-xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue sm:text-sm">Your workspace starts here</p><h1 className="mt-6 max-w-xl text-6xl font-semibold leading-[0.92] tracking-[-0.085em] sm:text-7xl">Show up with a little more intention.</h1><p className="mt-7 max-w-lg text-base leading-7 text-muted sm:text-lg sm:leading-8">Connect your X account and give xGoal the context it needs to help you build a useful presence.</p><ul className="mt-10 max-w-lg divide-y divide-line border-y border-line"><li className="flex gap-4 py-4 text-sm leading-6 text-muted sm:py-5"><span className="font-bold text-blue">01</span><span>One secure sign-in for your xGoal workspace.</span></li><li className="flex gap-4 py-4 text-sm leading-6 text-muted sm:py-5"><span className="font-bold text-blue">02</span><span>Your goals stay yours — nothing publishes without your approval.</span></li></ul></article><article className="relative overflow-hidden rounded-3xl border border-line bg-white p-6 shadow-xl sm:p-8"><span className="pointer-events-none absolute -right-14 -top-14 size-36 rounded-full bg-blue-soft" /><section className="relative"><header className="flex items-center justify-between gap-4 text-xs font-bold uppercase tracking-[0.14em] text-muted"><span>Get started</span><span>1 / 1</span></header><p className="mt-14 grid size-14 place-items-center rounded-2xl bg-ink text-white shadow-lg"><XIcon /></p><h2 className="mt-7 text-4xl font-semibold tracking-[-0.06em]">Continue with X</h2><p className="mt-4 max-w-sm text-sm leading-6 text-muted sm:text-base sm:leading-7">Use your X account to create your xGoal workspace and get started in one step.</p><button type="button" onClick={handleContinueWithX} disabled={isSigningIn} className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-ink px-5 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">{isSigningIn ? "Opening X..." : "Continue with X"}<ArrowUpRightIcon /></button>{error ? <p className="mt-4 text-center text-xs leading-5 text-red-600" role="alert">{error}</p> : null}<p className="mt-5 text-center text-xs leading-5 text-muted">You stay in control. xGoal starts with drafts and suggestions, not autoposting.</p></section></article></section></main>;
}

function StatusDot({ status }: { status: GoalFilter }) {
  const color = status === "active" || status === "completed" ? "bg-blue" : status === "paused" ? "bg-muted" : status === "draft" ? "bg-line" : "bg-ink";
  return <span className={`size-2 shrink-0 rounded-full ${color}`} aria-hidden="true" />;
}

function GoalStatusFilter({ value, onChange }: { value: GoalFilter; onChange: (value: GoalFilter) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = goalFilterOptions.find((option) => option.value === value) ?? goalFilterOptions[0];
  return <section className="relative w-32 shrink-0"><button type="button" onClick={() => setIsOpen((current) => !current)} className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-white px-2.5 py-2 text-left text-xs font-semibold outline-none transition ${isOpen ? "border-blue shadow-sm" : "border-line hover:border-ink"}`} aria-haspopup="listbox" aria-expanded={isOpen}><span className="flex min-w-0 items-center gap-2.5"><StatusDot status={selected.value} /><span className="truncate">{selected.label}</span></span><span className={`text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}><ChevronDownIcon /></span></button>{isOpen ? <ul className="absolute right-0 top-full z-10 mt-2 w-48 overflow-hidden rounded-2xl border border-line bg-white p-1.5 shadow-xl" role="listbox" aria-label="Filter goals by status">{goalFilterOptions.map((option) => <li key={option.value}><button type="button" role="option" aria-selected={option.value === value} onClick={() => { onChange(option.value); setIsOpen(false); }} className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${option.value === value ? "bg-blue-pale font-semibold text-blue-dark" : "text-muted hover:bg-wash hover:text-ink"}`}><span className="flex items-center gap-2.5"><StatusDot status={option.value} />{option.label}</span>{option.value === value ? <span className="text-xs font-bold">Selected</span> : null}</button></li>)}</ul> : null}</section>;
}

function UserAvatar({ user }: { user: UserSummary }) {
  return user.avatarUrl ? <img src={user.avatarUrl} alt="" className="size-9 shrink-0 rounded-xl object-cover" /> : <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue text-xs font-bold text-white">{user.name.slice(0, 1).toUpperCase()}</span>;
}

function DashboardShell({ user, drawer, children }: { user: UserSummary; drawer?: DrawerState; children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const drawerOpen = drawer !== "closed";
  const [filter, setFilter] = useState<GoalFilter>("all");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isGoalsLoading, setIsGoalsLoading] = useState(true);
  const [goalError, setGoalError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalPrompt, setNewGoalPrompt] = useState("");
  const visibleGoals = useMemo(() => filter === "all" ? goals : goals.filter((goal) => goal.status === filter), [filter, goals]);

  useEffect(() => {
    let mounted = true;
    setIsGoalsLoading(true);
    loadGoalsForUser(user.id).then(({ goals: loadedGoals, error }) => {
      if (!mounted) return;
      setGoals(loadedGoals);
      setGoalError(error);
      setIsGoalsLoading(false);
    });
    return () => { mounted = false; };
  }, [user.id]);

  function toggleDrawer() {
    const nextSearch = new URLSearchParams(location.searchStr);
    nextSearch.set("drawer", drawerOpen ? "closed" : "open");
    void navigate({ href: `${location.pathname}?${nextSearch.toString()}${location.hash ? `#${location.hash}` : ""}` });
  }
  async function createGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newGoalTitle.trim();
    const prompt = newGoalPrompt.trim();
    if (!title || !prompt) return;

    setIsAnalyzing(true);
    setGoalError(null);

    let analysis;
    try {
      analysis = await analyzeGoal({ data: { title, prompt } });
    } catch (error) {
      setGoalError(error instanceof Error ? error.message : "The goal analysis failed.");
      setIsAnalyzing(false);
      return;
    }

    const { data, error } = await createClient().from("goals").insert({ owner_id: user.id, title, prompt }).select("id,title,status,updated_at").single();
    if (error || !data) {
      setGoalError(error?.message ?? "The goal could not be created.");
      setIsAnalyzing(false);
      return;
    }

    let permissionsErrorMessage: string | null = null;
    if (analysis.permissions.length > 0) {
      const { error: permissionsError } = await createClient().from("goal_permissions").insert(analysis.permissions.map((suggestion) => ({ goal_id: data.id, owner_id: user.id, permission: suggestion.permission, decision: "review", source: "ai" })));
      if (permissionsError) {
        permissionsErrorMessage = permissionsError.message;
        setGoalError(permissionsErrorMessage);
      }
    }

    setGoals((current) => [{ id: data.id, title: data.title, status: isGoalStatus(data.status) ? data.status : "draft", workflowCount: 0, updatedAt: "Just now" }, ...current]);
    if (!permissionsErrorMessage) setGoalError(null);
    setNewGoalTitle("");
    setNewGoalPrompt("");
    setIsAnalyzing(false);
    setIsCreating(false);
  }
  async function signOut() { await createClient().auth.signOut(); }

  const contextValue: DashboardContextValue = { user, goals, visibleGoals, isGoalsLoading, goalError, filter, setFilter, openCreateGoal: () => setIsCreating(true) };
  const search = { drawer };
  return <DashboardContext.Provider value={contextValue}><main className="relative flex min-h-screen overflow-x-hidden bg-wash text-ink">{drawerOpen ? <button type="button" onClick={toggleDrawer} className="fixed inset-0 z-20 bg-ink/20 lg:hidden" aria-label="Close navigation" /> : null}<aside className={`fixed inset-y-0 left-0 z-30 flex h-screen w-72 shrink-0 flex-col border-r border-line bg-paper p-5 transition-[transform,width,padding] duration-200 lg:sticky lg:top-0 lg:z-auto lg:translate-x-0 ${drawerOpen ? "translate-x-0" : "-translate-x-full lg:w-20 lg:p-3"}`} aria-label="Workspace navigation"><header className={`flex items-center ${drawerOpen ? "justify-between" : "justify-center"}`}><Link to="/" className="flex items-center gap-3" aria-label="xGoal home"><XGoalMark className="size-9 shrink-0" />{drawerOpen ? <span className="font-bold tracking-[-0.04em]">xGoal</span> : null}</Link>{drawerOpen ? <button type="button" onClick={toggleDrawer} className="hidden rounded-lg p-2 text-muted transition-colors hover:bg-wash hover:text-ink lg:inline-flex" aria-label="Collapse navigation"><PanelLeftIcon /></button> : null}</header>{!drawerOpen ? <button type="button" onClick={toggleDrawer} className="mt-7 hidden self-center rounded-lg p-2 text-muted transition-colors hover:bg-wash hover:text-ink lg:block" aria-label="Expand navigation"><PanelLeftIcon /></button> : null}<nav className="mt-10 space-y-1" aria-label="Main navigation"><Link to="/app" search={search} activeOptions={{ exact: true }} activeProps={{ className: `flex items-center gap-3 rounded-xl bg-ink px-3 py-3 text-sm font-semibold text-white ${drawerOpen ? "" : "mx-auto w-fit justify-center"}` }} inactiveProps={{ className: `flex items-center rounded-xl px-3 py-3 text-sm font-semibold text-muted transition-colors hover:bg-wash hover:text-ink ${drawerOpen ? "gap-3" : "mx-auto w-fit justify-center"}` }} title={drawerOpen ? undefined : "Overview"}><GridIcon />{drawerOpen ? <span>Overview</span> : null}</Link><Link to="/app/goals" search={search} activeProps={{ className: `flex items-center gap-3 rounded-xl bg-ink px-3 py-3 text-sm font-semibold text-white ${drawerOpen ? "" : "mx-auto w-fit justify-center"}` }} inactiveProps={{ className: `flex items-center rounded-xl px-3 py-3 text-sm font-semibold text-muted transition-colors hover:bg-wash hover:text-ink ${drawerOpen ? "gap-3" : "mx-auto w-fit justify-center"}` }} title={drawerOpen ? undefined : "Goals"}><GoalIcon />{drawerOpen ? <span>Goals</span> : null}</Link><Link to="/app/workflows" search={search} activeProps={{ className: `flex items-center gap-3 rounded-xl bg-ink px-3 py-3 text-sm font-semibold text-white ${drawerOpen ? "" : "mx-auto w-fit justify-center"}` }} inactiveProps={{ className: `flex items-center rounded-xl px-3 py-3 text-sm font-semibold text-muted transition-colors hover:bg-wash hover:text-ink ${drawerOpen ? "gap-3" : "mx-auto w-fit justify-center"}` }} title={drawerOpen ? undefined : "Workflows"}><WorkflowIcon />{drawerOpen ? <span>Workflows</span> : null}</Link></nav>{drawerOpen ? <section className="mt-10 min-h-0 flex-1" aria-labelledby="goal-navigation-heading"><header className="flex items-center gap-2 px-2"><h2 id="goal-navigation-heading" className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Goals</h2><span className="flex-1" /><GoalStatusFilter value={filter} onChange={setFilter} /><button type="button" onClick={() => setIsCreating(true)} className="rounded-lg p-1.5 text-muted transition-colors hover:bg-wash hover:text-ink" aria-label="Create a goal"><PlusIcon /></button></header><ul className="mt-4 space-y-1 overflow-y-auto">{isGoalsLoading ? <li className="rounded-xl border border-dashed border-line px-3 py-4 text-xs leading-5 text-muted">Loading goals...</li> : null}{goalError ? <li className="rounded-xl border border-dashed border-line px-3 py-4 text-xs leading-5 text-red-600">{goalError}</li> : null}{!isGoalsLoading ? visibleGoals.map((goal) => <li key={goal.id}><Link to="/app/goals" search={search} hash={`goal-${goal.id}`} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm text-muted transition-colors hover:bg-wash hover:text-ink"><span className="truncate">{goal.title}</span><span className="size-2 shrink-0 rounded-full bg-blue" /></Link></li>) : null}{!isGoalsLoading && !goalError && visibleGoals.length === 0 ? <li className="rounded-xl border border-dashed border-line px-3 py-4 text-xs leading-5 text-muted">No goals here yet. Start with one clear outcome.</li> : null}</ul></section> : null}<footer className={`mt-auto border-t border-line pt-4 ${drawerOpen ? "" : "flex justify-center"}`}><Link to="/app/profile" search={search} className={`flex w-full items-center rounded-xl p-2 text-left transition-colors hover:bg-wash ${drawerOpen ? "gap-3" : "justify-center"}`} title={drawerOpen ? undefined : `${user.name} ${user.handle}`}><UserAvatar user={user} />{drawerOpen ? <span className="min-w-0 flex-1"><strong className="block truncate text-sm font-semibold text-ink">{user.name}</strong><small className="mt-0.5 block truncate text-xs text-muted">{user.handle}</small></span> : null}{drawerOpen ? <ChevronRightIcon /> : null}</Link>{drawerOpen ? <button type="button" onClick={signOut} className="mt-2 flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-xs font-semibold text-muted transition-colors hover:bg-wash hover:text-ink"><SettingsIcon />Sign out</button> : null}</footer></aside>{!isCreating ? <button type="button" onClick={toggleDrawer} aria-expanded={drawerOpen} aria-label={drawerOpen ? "Close navigation" : "Open navigation"} className="fixed right-4 top-4 z-40 rounded-xl border border-line bg-paper p-2.5 text-muted shadow-sm transition-colors hover:bg-wash hover:text-ink lg:hidden"><PanelLeftIcon /></button> : null}<section className="min-w-0 flex-1">{children}</section></main>{isCreating ? <section className="fixed inset-0 z-20 grid place-items-center bg-ink/30 p-5" role="dialog" aria-modal="true" aria-labelledby="new-goal-heading"><form onSubmit={createGoal} className="w-full max-w-lg rounded-3xl border border-line bg-paper p-6 shadow-2xl sm:p-8"><header className="flex items-start justify-between gap-4"><section><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue">New foundation</p><h2 id="new-goal-heading" className="mt-2 text-2xl font-semibold tracking-[-0.05em]">What are you working toward?</h2></section><button type="button" onClick={() => setIsCreating(false)} className="rounded-lg px-2 py-1 text-2xl leading-none text-muted hover:bg-wash hover:text-ink" aria-label="Close">×</button></header><label className="mt-8 block"><span className="text-sm font-semibold">Goal title</span><input value={newGoalTitle} onChange={(event) => setNewGoalTitle(event.target.value)} autoFocus maxLength={160} placeholder="e.g. Build a thoughtful presence" className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-blue" /></label><label className="mt-5 block"><span className="text-sm font-semibold">What do you want to achieve?</span><textarea value={newGoalPrompt} onChange={(event) => setNewGoalPrompt(event.target.value)} rows={4} maxLength={8000} placeholder="Describe the outcome, the audience, and what xGoal should help you do." className="mt-2 w-full resize-none rounded-2xl border border-line bg-white p-4 text-sm leading-6 outline-none transition focus:border-blue" /></label><p className="mt-3 text-xs leading-5 text-muted">You can refine the details and permissions after the goal is created.</p><footer className="mt-7 flex justify-end gap-3"><button type="button" onClick={() => setIsCreating(false)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted hover:bg-wash hover:text-ink">Cancel</button><button type="submit" disabled={!newGoalTitle.trim() || !newGoalPrompt.trim() || isAnalyzing} aria-busy={isAnalyzing} className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{isAnalyzing ? "Analyzing with xGoal..." : "Create goal"}<ArrowUpRightIcon /></button></footer></form></section> : null}</DashboardContext.Provider>;
}
