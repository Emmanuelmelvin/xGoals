import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";

export type TooltipPlacement = "top" | "bottom" | "left" | "right";

const placementClass: Record<TooltipPlacement, string> = {
  top: "bottom-full left-1/2 mb-2 -translate-x-1/2",
  bottom: "left-1/2 top-full mt-2 -translate-x-1/2",
  left: "right-full top-1/2 mr-2 -translate-y-1/2",
  right: "left-full top-1/2 ml-2 -translate-y-1/2",
};

type TooltipProps = {
  label: string;
  placement?: TooltipPlacement;
  children: ReactNode;
};

/**
 * Small hover/focus hint for icon-only buttons, badges, and truncated items.
 * CSS-only: appears on hover and keyboard focus, links to its trigger with
 * aria-describedby, and stays out of the way for touch and reduced-motion users.
 */
export function Tooltip({ label, placement = "top", children }: TooltipProps) {
  const id = useId();
  const trigger = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, { "aria-describedby": id })
    : children;

  return (
    <span className="group/tooltip relative inline-flex min-w-0">
      {trigger}
      <span
        role="tooltip"
        id={id}
        className={`pointer-events-none absolute z-50 w-max max-w-56 rounded-lg bg-ink px-2.5 py-1.5 text-center text-xs font-semibold leading-5 text-white opacity-0 shadow-lg transition-opacity delay-150 duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100 motion-reduce:transition-none motion-reduce:delay-0 ${placementClass[placement]}`}
      >
        {label}
      </span>
    </span>
  );
}
