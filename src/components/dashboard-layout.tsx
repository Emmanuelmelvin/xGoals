import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { createClient } from "../lib/supabase/client";
import { PanelLeftIcon } from "./dashboard/icons";
import { Tooltip } from "./tooltip";
import { loadGoalsForUser } from "./dashboard/goal-persistence";
import { OnboardingPage } from "./dashboard/onboarding-page";
import { WorkspaceSidebar } from "./dashboard/workspace-sidebar";
import type { DashboardContextValue, DrawerState, Goal, UserSummary } from "./dashboard/types";

export type { Deployment, DeploymentStatus, DrawerState, Goal, UserSummary } from "./dashboard/types";

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
  const drawerOpen = drawer !== "closed";
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isGoalsLoading, setIsGoalsLoading] = useState(true);
  const [goalError, setGoalError] = useState<string | null>(null);

  async function refreshGoals() {
    setIsGoalsLoading(true);
    const { goals: loadedGoals, error } = await loadGoalsForUser(user.id);
    setGoals(loadedGoals);
    setGoalError(error);
    setIsGoalsLoading(false);
  }

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
    void navigate({ to: "/app/goals/new", search: drawer ? { drawer } : {} });
  }

  async function signOut() { await createClient().auth.signOut(); }

  const contextValue: DashboardContextValue = { user, goals, isGoalsLoading, goalError, refreshGoals, openCreateGoal: openGoalCreation };
  return <DashboardContext.Provider
    value={contextValue}><main className="relative flex min-h-screen overflow-x-clip bg-wash text-ink">
      <button
        type="button"
        onClick={toggleDrawer}
        aria-hidden={!drawerOpen}
        tabIndex={drawerOpen ? 0 : -1}
        aria-label="Close navigation"
        className={`fixed inset-0 z-20 bg-ink/20 transition-opacity duration-300 ease-out lg:hidden ${drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <WorkspaceSidebar
        user={user} drawer={drawer} drawerOpen={drawerOpen} onCreateGoal={openGoalCreation} onToggleDrawer={toggleDrawer} onSignOut={signOut} />
      <Tooltip label={drawerOpen ? "Close navigation" : "Open navigation"} placement="left">
        <button type="button" onClick={toggleDrawer} aria-expanded={drawerOpen} aria-label={drawerOpen ? "Close navigation" : "Open navigation"} className="fixed right-4 top-4 z-40 rounded-xl border border-line bg-paper p-2.5 text-muted shadow-sm transition-colors hover:bg-wash hover:text-ink lg:hidden"><PanelLeftIcon /></button>
      </Tooltip>
      <section className={`min-w-0 flex-1 transition-[margin] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${drawerOpen ? "lg:ml-72" : "lg:ml-20"}`}>{children}</section>
    </main>
  </DashboardContext.Provider>;
}
