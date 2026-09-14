import type { ReactNode } from "react";

export type DrawerState = "open" | "closed";

/** Lifecycle of a deployment (a workflow running from a goal). */
export type DeploymentStatus = "running" | "paused" | "stopped";

export type Goal = {
  id: string;
  title: string;
  workflowCount: number;
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

export type IconProps = { children: ReactNode; className?: string };
