import { Link } from "@tanstack/react-router";
import { XGoalMark } from "../logo";
import { Tooltip } from "../tooltip";
import { ChevronRightIcon, CreditIcon, GlobeIcon, GoalIcon, GridIcon, PanelLeftIcon, PlusIcon, SignOutIcon, WorkflowIcon } from "./icons";
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

export function WorkspaceSidebar({ user, drawer, drawerOpen, onCreateGoal, onToggleDrawer, onSignOut }: WorkspaceSidebarProps) {
  const search = { drawer };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 flex h-screen shrink-0 flex-col border-r border-line bg-paper transition-[width,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-[width,transform] ${
        drawerOpen ? "w-72 translate-x-0" : "w-20 -translate-x-full lg:translate-x-0"
      }`}
      aria-label="Workspace navigation"
    >
      {/* Collapsed rail — intentionally overflow-visible so right-placed tooltips can extend over the main content. */}
      <div
        className={`flex h-full w-20 shrink-0 flex-col items-center overflow-visible p-3 transition-opacity ease-out ${
          drawerOpen ? "invisible absolute inset-y-0 left-0 opacity-0 duration-150" : "visible relative opacity-100 delay-150 duration-200"
        }`}
        aria-hidden={drawerOpen}
        inert={drawerOpen}
      >
        <Link to="/" className="flex items-center" aria-label="xGoal home">
          <XGoalMark className="size-9 shrink-0" />
        </Link>
        <Tooltip label="Expand navigation" placement="right">
          <button type="button" onClick={onToggleDrawer} className="mt-7 hidden rounded-lg p-2 text-muted transition-colors hover:bg-wash hover:text-ink lg:block" aria-label="Expand navigation">
            <PanelLeftIcon />
          </button>
        </Tooltip>
        <nav className="mt-8 flex flex-col items-center gap-1" aria-label="Main navigation">
          <Tooltip label="Overview" placement="right">
            <Link to="/app" search={search} activeOptions={{ exact: true }} activeProps={{ className: "grid size-11 place-items-center rounded-xl bg-blue text-white" }} inactiveProps={{ className: "grid size-11 place-items-center rounded-xl text-muted transition-colors hover:bg-wash hover:text-ink" }}>
              <GridIcon />
            </Link>
          </Tooltip>
          <Tooltip label="Goals" placement="right">
            <Link to="/app/goals" search={search} activeProps={{ className: "grid size-11 place-items-center rounded-xl bg-blue text-white" }} inactiveProps={{ className: "grid size-11 place-items-center rounded-xl text-muted transition-colors hover:bg-wash hover:text-ink" }}>
              <GoalIcon />
            </Link>
          </Tooltip>
          <Tooltip label="Workflows" placement="right">
            <Link to="/app/workflows" search={search} activeProps={{ className: "grid size-11 place-items-center rounded-xl bg-blue text-white" }} inactiveProps={{ className: "grid size-11 place-items-center rounded-xl text-muted transition-colors hover:bg-wash hover:text-ink" }}>
              <WorkflowIcon />
            </Link>
          </Tooltip>
          <Tooltip label="Explore public goals" placement="right">
            <Link to="/goals" activeProps={{ className: "grid size-11 place-items-center rounded-xl bg-blue text-white" }} inactiveProps={{ className: "grid size-11 place-items-center rounded-xl text-muted transition-colors hover:bg-wash hover:text-ink" }}>
              <GlobeIcon />
            </Link>
          </Tooltip>
          <Tooltip label="Credits" placement="right">
            <Link to="/app/credits" search={search} activeProps={{ className: "grid size-11 place-items-center rounded-xl bg-blue text-white" }} inactiveProps={{ className: "grid size-11 place-items-center rounded-xl text-muted transition-colors hover:bg-wash hover:text-ink" }}>
              <CreditIcon />
            </Link>
          </Tooltip>
        </nav>
        <footer className="mt-auto flex justify-center">
          <Tooltip label={`${user.name} ${user.handle}`} placement="right">
            <Link to="/app/profile" search={search} className="rounded-xl p-1 transition-colors hover:bg-wash">
              <UserAvatar user={user} />
            </Link>
          </Tooltip>
        </footer>
      </div>

      {/* Expanded drawer — clips its own labels during the width animation without clipping the collapsed rail's tooltips. */}
      <div
        className={`flex h-full w-72 max-w-full shrink-0 flex-col overflow-hidden p-5 transition-opacity ease-out ${
          drawerOpen ? "visible relative opacity-100 delay-150 duration-200" : "invisible absolute inset-y-0 left-0 opacity-0 duration-150"
        }`}
        aria-hidden={!drawerOpen}
        inert={!drawerOpen}
      >
      <header className="flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3" aria-label="xGoal home">
          <XGoalMark className="size-9 shrink-0" />
          <span className="font-bold tracking-[-0.04em]">xGoal</span>
        </Link>
        <Tooltip label="Collapse navigation" placement="bottom">
          <button type="button" onClick={onToggleDrawer} className="hidden rounded-lg p-2 text-muted transition-colors hover:bg-wash hover:text-ink lg:inline-flex" aria-label="Collapse navigation">
            <PanelLeftIcon />
          </button>
        </Tooltip>
      </header>

      <nav className="mt-10 space-y-1" aria-label="Main navigation">
        <Link
          to="/app"
          search={search}
          activeOptions={{ exact: true }}
          activeProps={{ className: "flex items-center gap-3 rounded-xl bg-blue px-3 py-3 text-sm font-semibold text-white" }}
          inactiveProps={{ className: "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-muted transition-colors hover:bg-wash hover:text-ink" }}
        >
          <GridIcon />
          <span className="whitespace-nowrap">Overview</span>
        </Link>

        <Link
          to="/app/goals"
          search={search}
          activeProps={{ className: "flex items-center gap-3 rounded-xl bg-blue px-3 py-3 text-sm font-semibold text-white" }}
          inactiveProps={{ className: "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-muted transition-colors hover:bg-wash hover:text-ink" }}
        >
          <GoalIcon />
          <span className="whitespace-nowrap">Goals</span>
        </Link>

        <Link
          to="/app/workflows"
          search={search}
          activeProps={{ className: "flex items-center gap-3 rounded-xl bg-blue px-3 py-3 text-sm font-semibold text-white" }}
          inactiveProps={{ className: "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-muted transition-colors hover:bg-wash hover:text-ink" }}
        >
          <WorkflowIcon />
          <span className="whitespace-nowrap">Workflows</span>
        </Link>

        <Link
          to="/app/credits"
          search={search}
          activeProps={{ className: "flex items-center gap-3 rounded-xl bg-blue px-3 py-3 text-sm font-semibold text-white" }}
          inactiveProps={{ className: "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-muted transition-colors hover:bg-wash hover:text-ink" }}
        >
          <CreditIcon />
          <span className="flex-1 whitespace-nowrap">Credits</span>
        </Link>

        <Link
          to="/goals"
          activeProps={{ className: "flex items-center gap-3 rounded-xl bg-blue px-3 py-3 text-sm font-semibold text-white" }}
          inactiveProps={{ className: "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-muted transition-colors hover:bg-wash hover:text-ink" }}
        >
          <GlobeIcon />
          <span className="flex-1 whitespace-nowrap">Explore</span>
        </Link>
      </nav>

      <button type="button" onClick={onCreateGoal} className="mt-4 inline-flex w-full shrink-0 items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-xl bg-blue px-4 py-2.5 text-sm font-bold text-white">
        <PlusIcon />New goal
      </button>

      <footer className="mt-auto shrink-0 border-t border-line pt-4">
        <Link to="/app/profile" search={search} className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-wash">
          <UserAvatar user={user} />
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-sm font-semibold text-ink">{user.name}</strong>
            <small className="mt-0.5 block truncate text-xs text-muted">{user.handle}</small>
          </span>
          <ChevronRightIcon />
        </Link>
        <button type="button" onClick={onSignOut} className="mt-2 flex w-full items-center gap-3 whitespace-nowrap rounded-xl px-2 py-2 text-left text-xs font-semibold text-muted transition-colors hover:bg-wash hover:text-ink">
          <SignOutIcon />
          Sign out
        </button>
      </footer>
      </div>
    </aside>
  );
}
