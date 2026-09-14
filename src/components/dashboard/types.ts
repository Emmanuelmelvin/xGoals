export type DrawerState = "open" | "closed";

/** Lifecycle of a deployment (a workflow running from a goal). */
export type DeploymentStatus = "running" | "paused" | "stopped";

export type WorkflowStatusBreakdown = {
  running: number;
  paused: number;
  stopped: number;
};

export type WorkflowDefinition = {
  milestones: Milestone[];
  permissions: string[];
  runLengthDays: number | null;
  endsAt: string | null;
};

export type RunStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export type WorkflowRun = {
  id: string;
  status: RunStatus;
  startedAt: string | null;
  finishedAt: string | null;
  errorMessage: string | null;
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
  createdAt: string;
  definition: WorkflowDefinition;
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
