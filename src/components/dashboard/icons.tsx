import type { IconProps } from "./types";

export function Icon({ children, className = "size-5" }: IconProps) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
}

export function ArrowUpRightIcon() {
  return <Icon className="size-4"><path d="M6.5 17.5 17.5 6.5" /><path d="M8 6.5h9.5V16" /></Icon>;
}

export function ChevronDownIcon() {
  return <Icon className="size-4"><path d="m6 9 6 6 6-6" /></Icon>;
}

export function ChevronRightIcon() {
  return <Icon className="size-4"><path d="m9 18 6-6-6-6" /></Icon>;
}

export function PlusIcon() {
  return <Icon className="size-4"><path d="M12 5v14M5 12h14" /></Icon>;
}

export function GridIcon() {
  return <Icon><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></Icon>;
}

export function GoalIcon() {
  return <Icon><circle cx="12" cy="12" r="7.5" /><circle cx="12" cy="12" r="3" /><path d="m17.5 6.5 2-2M19.5 4.5h-3M19.5 4.5v3" /></Icon>;
}

export function WorkflowIcon() {
  return <Icon><rect x="4" y="4" width="6" height="5" rx="1" /><rect x="14" y="15" width="6" height="5" rx="1" /><rect x="4" y="15" width="6" height="5" rx="1" /><path d="M10 6.5h2a2 2 0 0 1 2 2v6.5M10 17.5h4" /></Icon>;
}

export function SettingsIcon() {
  return <Icon className="size-4"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" /><path d="m19.4 15 .1.1a1.8 1.8 0 0 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3.1 1.3v.2a1.8 1.8 0 0 1-3.6 0v-.2a1.8 1.8 0 0 0-3.1-1.3l-.1.1a1.8 1.8 0 0 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-1.3-3.1h-.2a1.8 1.8 0 0 1 0-3.6h.2a1.8 1.8 0 0 0 1.3-3.1l-.1-.1a1.8 1.8 0 0 1 2.5-2.5l.1.1A1.8 1.8 0 0 0 10.2 2h.2a1.8 1.8 0 0 1 3.6 0v.2a1.8 1.8 0 0 0 3.1 1.3l.1-.1a1.8 1.8 0 0 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 1.3 3.1h.2a1.8 1.8 0 0 1 0 3.6h-.2a1.8 1.8 0 0 0-1.3 2.3Z" /></Icon>;
}

export function PanelLeftIcon() {
  return <Icon><rect x="3.5" y="4" width="17" height="16" rx="2" /><path d="M8.5 4v16M14 10l-2 2 2 2" /></Icon>;
}

export function CreditIcon() {
  return <Icon><rect x="3.5" y="6" width="17" height="13" rx="2" /><path d="M3.5 10h17M7 15h4" /></Icon>;
}

export function XIcon() {
  return <svg className="size-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.9 2H22l-6.77 7.74L23.2 22h-6.24l-4.89-6.38L6.48 22H3.36l7.24-8.28L2.8 2h6.4l4.42 5.84L18.9 2Zm-1.1 17.84h1.73L8.26 4.04H6.4L17.8 19.84Z" /></svg>;
}
