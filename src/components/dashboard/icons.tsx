import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  CreditCard,
  GitBranch,
  GitBranchPlus,
  Goal,
  LayoutGrid,
  LogOut,
  Milestone,
  PanelLeft,
  Pause,
  Pencil,
  Play,
  Plus,
  Settings,
  Square,
  Trash2,
  Workflow,
  X,
  type LucideProps,
} from "lucide-react";

type IconSizeProps = {
  className?: string;
};

function withLucideDefaults(Component: typeof Plus, defaultClassName: string) {
  return function Icon({ className = defaultClassName, ...props }: IconSizeProps & LucideProps) {
    return <Component className={className} aria-hidden="true" strokeWidth={1.8} {...props} />;
  };
}

export const ArrowUpRightIcon = withLucideDefaults(ArrowUpRight, "size-4");
export const ArrowLeftIcon = withLucideDefaults(ArrowLeft, "size-4");
export const CheckIcon = withLucideDefaults(Check, "size-4");
export const ChevronDownIcon = withLucideDefaults(ChevronDown, "size-4");
export const ChevronRightIcon = withLucideDefaults(ChevronRight, "size-4");
export const PlusIcon = withLucideDefaults(Plus, "size-4");
export const PencilIcon = withLucideDefaults(Pencil, "size-4");
export const TrashIcon = withLucideDefaults(Trash2, "size-4");
export const CloseIcon = withLucideDefaults(X, "size-4");
export const GridIcon = withLucideDefaults(LayoutGrid, "size-5");
export const GoalIcon = withLucideDefaults(Goal, "size-5");
export const WorkflowIcon = withLucideDefaults(Workflow, "size-5");
export const BranchIcon = withLucideDefaults(GitBranch, "size-4");
export const BranchPlusIcon = withLucideDefaults(GitBranchPlus, "size-4");
export const MilestoneIcon = withLucideDefaults(Milestone, "size-4");
export const ClockIcon = withLucideDefaults(Clock, "size-4");
export const PauseIcon = withLucideDefaults(Pause, "size-4");
export const PlayIcon = withLucideDefaults(Play, "size-4");
export const StopIcon = withLucideDefaults(Square, "size-4");
export const SettingsIcon = withLucideDefaults(Settings, "size-4");
export const SignOutIcon = withLucideDefaults(LogOut, "size-4");
export const PanelLeftIcon = withLucideDefaults(PanelLeft, "size-5");
export const CreditIcon = withLucideDefaults(CreditCard, "size-5");

/**
 * The X brand mark (Twitter/X logo), not a generic close icon.
 * Lucide no longer ships brand icons, so this stays custom.
 */
export function XIcon({ className = "size-6" }: IconSizeProps) {
  return <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.9 2H22l-6.77 7.74L23.2 22h-6.24l-4.89-6.38L6.48 22H3.36l7.24-8.28L2.8 2h6.4l4.42 5.84L18.9 2Zm-1.1 17.84h1.73L8.26 4.04H6.4L17.8 19.84Z" /></svg>;
}
