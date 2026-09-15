export type DrawerState = "open" | "closed";

/** Lifecycle of a deployment (a workflow running from a goal). */
export type DeploymentStatus = "running" | "paused" | "completed";

export type WorkflowStatusBreakdown = {
  running: number;
  paused: number;
  completed: number;
};

export type WorkflowDefinition = {
  milestones: Milestone[];
  skills: Skill[];
  permissions: string[];
  runLengthDays: number | null;
  endsAt: string | null;
  startsAt: string | null;
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

/** A named unit of agent know-how: how to act, not what it may touch. */
export type Skill = {
  name: string;
  body: string;
};

export type Goal = {
  id: string;
  title: string;
  description: string | null;
  parentGoalId: string | null;
  visibility: GoalVisibility;
  workflowCount: number;
  workflows: WorkflowStatusBreakdown;
  branchCount: number;
  milestones: Milestone[];
  skills: Skill[];
  updatedAt: string;
};

/** Who can discover a goal. Private goals are owner-only; public goals are listed on /goals. */
export type GoalVisibility = "private" | "public";

export type PublicGoalOwner = {
  displayName: string | null;
  handle: string | null;
  avatarUrl: string | null;
};

/** A public goal with its owner's public identity. Workflow data stays private. */
export type PublicGoal = Goal & {
  ownerId: string;
  owner: PublicGoalOwner | null;
};

export type PublicGoalBranch = {
  id: string;
  title: string;
  description: string | null;
  updatedAt: string;
  milestoneCount: number;
  owner: PublicGoalOwner | null;
};

export type PublicGoalDetail = PublicGoal & {
  /** Set only when the parent goal is also public. */
  parent: { id: string; title: string } | null;
  /** Public branches of this goal, newest first. */
  branches: PublicGoalBranch[];
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
