import { createContext, useContext, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { createClient } from "../lib/supabase/client";
import { analyzeGoal, type GoalAnalysis } from "../lib/ai/agent-server-fns";
import { useToast } from "./toast";
import { ArrowUpRightIcon, PanelLeftIcon } from "./dashboard/icons";
import { GoalCreationDialog, normalizeGoalAnalysis, type GoalCreationStep } from "./dashboard/goal-creation-dialog";
import { loadGoalsForUser, persistGoal, type GoalCreationMode } from "./dashboard/goal-persistence";
import { OnboardingPage } from "./dashboard/onboarding-page";
import { WorkspaceSidebar } from "./dashboard/workspace-sidebar";
import type { DashboardContextValue, DrawerState, Goal, GoalFilter, UserSummary } from "./dashboard/types";

export type { DrawerState, Goal, GoalFilter, UserSummary } from "./dashboard/types";

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) throw new Error("useDashboard must be used inside DashboardRouteLayout.");
  return context;
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

function DashboardShell({ user, drawer, children }: { user: UserSummary; drawer?: DrawerState; children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const drawerOpen = drawer !== "closed";
  const [filter, setFilter] = useState<GoalFilter>("all");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isGoalsLoading, setIsGoalsLoading] = useState(true);
  const [goalError, setGoalError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSavingGoal, setIsSavingGoal] = useState(false);
  const [goalCreationStep, setGoalCreationStep] = useState<GoalCreationStep>("input");
  const [goalAnalysis, setGoalAnalysis] = useState<GoalAnalysis | null>(null);
  const [scheduledFor, setScheduledFor] = useState("");
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

  function openGoalCreation() {
    setIsCreating(true);
    setGoalCreationStep("input");
    setGoalAnalysis(null);
    setScheduledFor("");
    setGoalError(null);
  }

  function closeGoalCreation() {
    if (isAnalyzing || isSavingGoal) return;
    setIsCreating(false);
    setGoalCreationStep("input");
    setGoalAnalysis(null);
    setScheduledFor("");
    setGoalError(null);
  }

  async function analyzeNewGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newGoalTitle.trim();
    const prompt = newGoalPrompt.trim();
    if (!title || !prompt) return;
    setIsAnalyzing(true);
    setGoalError(null);
    try {
      const analysis = await analyzeGoal({ data: { title, prompt } });
      setGoalAnalysis(normalizeGoalAnalysis(analysis));
      setGoalCreationStep("review");
    } catch (error) {
      setGoalError(error instanceof Error ? error.message : "The goal analysis failed.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function saveGoal(mode: GoalCreationMode) {
    const title = newGoalTitle.trim();
    const prompt = newGoalPrompt.trim();
    if (!title || !prompt || !goalAnalysis) return;
    if (mode === "schedule" && !scheduledFor) {
      setGoalError("Choose a time for the workflow schedule first.");
      return;
    }

    setIsSavingGoal(true);
    setGoalError(null);
    const result = await persistGoal({ ownerId: user.id, title, prompt, analysis: goalAnalysis, mode, scheduledFor });
    if (!result.data) {
      setGoalError(result.error ?? "The goal could not be created.");
      setIsSavingGoal(false);
      return;
    }

    setGoals((current) => [result.data!, ...current]);
    setNewGoalTitle("");
    setNewGoalPrompt("");
    setGoalAnalysis(null);
    setScheduledFor("");
    setIsSavingGoal(false);
    setIsCreating(false);
    if (result.error) setGoalError(result.error);
    toast.success(mode === "deploy" ? "Goal created and workflow deployed" : mode === "schedule" ? "Goal created and workflow scheduled" : "Goal created", { description: result.error ? `The goal was saved, but ${result.error}` : mode === "goal" ? "Your editable plan is ready to shape." : "Your reviewed plan is ready for the next run." });
  }

  async function signOut() { await createClient().auth.signOut(); }

  const contextValue: DashboardContextValue = { user, goals, visibleGoals, isGoalsLoading, goalError, filter, setFilter, openCreateGoal: openGoalCreation };
  return <DashboardContext.Provider value={contextValue}><main className="relative flex min-h-screen overflow-x-hidden bg-wash text-ink">{drawerOpen ? <button type="button" onClick={toggleDrawer} className="fixed inset-0 z-20 bg-ink/20 lg:hidden" aria-label="Close navigation" /> : null}<WorkspaceSidebar user={user} drawer={drawer} drawerOpen={drawerOpen} visibleGoals={visibleGoals} isGoalsLoading={isGoalsLoading} goalError={goalError} filter={filter} onFilterChange={setFilter} onCreateGoal={openGoalCreation} onToggleDrawer={toggleDrawer} onSignOut={signOut} />{!isCreating ? <button type="button" onClick={toggleDrawer} aria-expanded={drawerOpen} aria-label={drawerOpen ? "Close navigation" : "Open navigation"} className="fixed right-4 top-4 z-40 rounded-xl border border-line bg-paper p-2.5 text-muted shadow-sm transition-colors hover:bg-wash hover:text-ink lg:hidden"><PanelLeftIcon /></button> : null}<section className={`min-w-0 flex-1 ${drawerOpen ? "lg:ml-72" : "lg:ml-20"}`}>{children}</section></main>{isCreating ? <GoalCreationDialog step={goalCreationStep} title={newGoalTitle} prompt={newGoalPrompt} analysis={goalAnalysis} scheduledFor={scheduledFor} isAnalyzing={isAnalyzing} isSaving={isSavingGoal} error={goalError} onTitleChange={setNewGoalTitle} onPromptChange={setNewGoalPrompt} onAnalysisChange={setGoalAnalysis} onScheduledForChange={setScheduledFor} onAnalyze={analyzeNewGoal} onBack={() => { setGoalCreationStep("input"); setGoalError(null); }} onClose={closeGoalCreation} onSave={saveGoal} /> : null}</DashboardContext.Provider>;
}
