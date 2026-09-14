export type DrawerState = "open" | "closed";

/** Lifecycle of a deployment (a workflow running from a goal). */
export type DeploymentStatus = "running" | "paused" | "stopped";

export type WorkflowStatusBreakdown = {
  running: number;
  paused: number;
  stopped: number;
};

export type Milestone = {
  title: string;
  completed: boolean;
};

export type Goal = {
  id: string;
  title: string;
  description: string | null;
  parentGoalId: string | null;
  workflowCount: number;
  workflows: WorkflowStatusBreakdown;
  branchCount: number;
  milestones: Milestone[];
  updatedAt: string;
};

export type Deployment = {
  id: string;
  goalId: string;
  name: string;
  status: DeploymentStatus;
};

export type UserSummary = {
  id: string;
  name: string;
  handle: string;
  email: string;
  avatarUrl: string | null;
  profileUrl: string;
};

export type DashboardContextValue = {
  user: UserSummary;
  goals: Goal[];
  isGoalsLoading: boolean;
  goalError: string | null;
  refreshGoals: () => Promise<void>;
  openCreateGoal: () => void;
};
