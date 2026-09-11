import type { ReactNode } from "react";

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

export type DashboardContextValue = {
  user: UserSummary;
  goals: Goal[];
  visibleGoals: Goal[];
  isGoalsLoading: boolean;
  goalError: string | null;
  filter: GoalFilter;
  setFilter: (filter: GoalFilter) => void;
  refreshGoals: () => Promise<void>;
  openCreateGoal: () => void;
};

export const goalFilterOptions: Array<{ value: GoalFilter; label: string }> = [
  { value: "all", label: "All goals" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Drafts" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
];

export type IconProps = { children: ReactNode; className?: string };
