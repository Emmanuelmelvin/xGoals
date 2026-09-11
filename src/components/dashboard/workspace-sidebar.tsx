import { Link } from "@tanstack/react-router";
import { XGoalMark } from "../logo";
import { ChevronRightIcon, CreditIcon, GoalIcon, GridIcon, PanelLeftIcon, PlusIcon, SettingsIcon, WorkflowIcon } from "./icons";
import type { DrawerState, UserSummary } from "./types";

function UserAvatar({ user }: { user: UserSummary }) {
  return user.avatarUrl ? <img src={user.avatarUrl} alt="" className="size-9 shrink-0 rounded-xl object-cover" /> : <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue text-xs font-bold text-white">{user.name.slice(0, 1).toUpperCase()}</span>;
}

type WorkspaceSidebarProps = {
  user: UserSummary;
  drawer: DrawerState | undefined;
  drawerOpen: boolean;
  onCreateGoal: () => void;
  onToggleDrawer: () => void;
  onSignOut: () => void;
};

function navLinkClass(drawerOpen: boolean) {
  return drawerOpen ? "gap-3" : "mx-auto w-fit justify-center";
}

export function WorkspaceSidebar({ user, drawer, drawerOpen, onCreateGoal, onToggleDrawer, onSignOut }: WorkspaceSidebarProps) {
  const search = { drawer };

  if (!drawerOpen) {
    return (
      <aside className="fixed inset-y-0 left-0 z-30 flex h-screen w-20 shrink-0 -translate-x-full flex-col items-center border-r border-line bg-paper p-3 transition-transform duration-200 lg:translate-x-0" aria-label="Workspace navigation">
        <Link to="/" className="flex items-center" aria-label="xGoal home">
          <XGoalMark className="size-9 shrink-0" />
        </Link>
        <button type="button" onClick={onToggleDrawer} className="mt-7 hidden rounded-lg p-2 text-muted transition-colors hover:bg-wash hover:text-ink lg:block" aria-label="Expand navigation">
          <PanelLeftIcon />
        </button>
        <nav className="mt-8 flex flex-col items-center gap-1" aria-label="Main navigation">
          <Link to="/app" search={search} activeOptions={{ exact: true }} activeProps={{ className: "grid size-11 place-items-center rounded-xl bg-ink text-white" }} inactiveProps={{ className: "grid size-11 place-items-center rounded-xl text-muted transition-colors hover:bg-wash hover:text-ink" }} title="Overview">
            <GridIcon />
          </Link>
          <Link to="/app/goals" search={search} activeProps={{ className: "grid size-11 place-items-center rounded-xl bg-ink text-white" }} inactiveProps={{ className: "grid size-11 place-items-center rounded-xl text-muted transition-colors hover:bg-wash hover:text-ink" }} title="Goals">
            <GoalIcon />
          </Link>
          <Link to="/app/workflows" search={search} activeProps={{ className: "grid size-11 place-items-center rounded-xl bg-ink text-white" }} inactiveProps={{ className: "grid size-11 place-items-center rounded-xl text-muted transition-colors hover:bg-wash hover:text-ink" }} title="Workflows">
            <WorkflowIcon />
          </Link>
          <Link to="/app/credits" search={search} activeProps={{ className: "grid size-11 place-items-center rounded-xl bg-ink text-white" }} inactiveProps={{ className: "grid size-11 place-items-center rounded-xl text-muted transition-colors hover:bg-wash hover:text-ink" }} title="Credits">
            <CreditIcon />
          </Link>
        </nav>
        <footer className="mt-auto flex justify-center">
          <Link to="/app/profile" search={search} className="rounded-xl p-1 transition-colors hover:bg-wash" title={`${user.name} ${user.handle}`}>
            <UserAvatar user={user} />
          </Link>
        </footer>
      </aside>
    );
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex h-screen w-72 shrink-0 translate-x-0 flex-col border-r border-line bg-paper p-5 transition-transform duration-200" aria-label="Workspace navigation">
      <header className="flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3" aria-label="xGoal home">
          <XGoalMark className="size-9 shrink-0" />
          <span className="font-bold tracking-[-0.04em]">xGoal</span>
        </Link>
        <button type="button" onClick={onToggleDrawer} className="hidden rounded-lg p-2 text-muted transition-colors hover:bg-wash hover:text-ink lg:inline-flex" aria-label="Collapse navigation">
          <PanelLeftIcon />
        </button>
      </header>

      <nav className="mt-10 space-y-1" aria-label="Main navigation">
        <Link
          to="/app"
          search={search}
          activeOptions={{ exact: true }}
          activeProps={{ className: `flex items-center gap-3 rounded-xl bg-ink px-3 py-3 text-sm font-semibold text-white ${navLinkClass(drawerOpen)}` }}
          inactiveProps={{ className: `flex items-center rounded-xl px-3 py-3 text-sm font-semibold text-muted transition-colors hover:bg-wash hover:text-ink ${navLinkClass(drawerOpen)}` }}
        >
          <GridIcon />
          <span>Overview</span>
        </Link>

        <Link
          to="/app/goals"
          search={search}
          activeProps={{ className: `flex items-center gap-3 rounded-xl bg-ink px-3 py-3 text-sm font-semibold text-white ${navLinkClass(drawerOpen)}` }}
          inactiveProps={{ className: `flex items-center rounded-xl px-3 py-3 text-sm font-semibold text-muted transition-colors hover:bg-wash hover:text-ink ${navLinkClass(drawerOpen)}` }}
        >
          <GoalIcon />
          <span>Goals</span>
        </Link>

        <Link
          to="/app/workflows"
          search={search}
          activeProps={{ className: `flex items-center gap-3 rounded-xl bg-ink px-3 py-3 text-sm font-semibold text-white ${navLinkClass(drawerOpen)}` }}
          inactiveProps={{ className: `flex items-center rounded-xl px-3 py-3 text-sm font-semibold text-muted transition-colors hover:bg-wash hover:text-ink ${navLinkClass(drawerOpen)}` }}
        >
          <WorkflowIcon />
          <span>Workflows</span>
        </Link>

        <Link
          to="/app/credits"
          search={search}
          activeProps={{ className: `flex items-center gap-3 rounded-xl bg-ink px-3 py-3 text-sm font-semibold text-white ${navLinkClass(drawerOpen)}` }}
          inactiveProps={{ className: `flex items-center rounded-xl px-3 py-3 text-sm font-semibold text-muted transition-colors hover:bg-wash hover:text-ink ${navLinkClass(drawerOpen)}` }}
        >
          <CreditIcon />
          <span className="flex-1">Credits</span>
          <span className="rounded-full bg-wash px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-muted">Soon</span>
        </Link>
      </nav>

      <button type="button" onClick={onCreateGoal} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5">
        <PlusIcon />New goal
      </button>

      <footer className="mt-auto border-t border-line pt-4">
        <Link to="/app/profile" search={search} className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-wash">
          <UserAvatar user={user} />
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-sm font-semibold text-ink">{user.name}</strong>
            <small className="mt-0.5 block truncate text-xs text-muted">{user.handle}</small>
          </span>
          <ChevronRightIcon />
        </Link>
        <button type="button" onClick={onSignOut} className="mt-2 flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-xs font-semibold text-muted transition-colors hover:bg-wash hover:text-ink">
          <SettingsIcon />
          Sign out
        </button>
      </footer>
    </aside>
  );
}
