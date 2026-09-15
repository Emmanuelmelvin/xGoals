import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type Ref, type RefObject } from "react";
import { CheckIcon, ChevronDownIcon } from "./dashboard/icons";

export type DropdownPlacement = "top" | "bottom";
export type DropdownAlign = "start" | "end";

const panelPositionClass: Record<DropdownPlacement, Record<DropdownAlign, string>> = {
  top: { start: "bottom-full left-0 mb-2", end: "bottom-full right-0 mb-2" },
  bottom: { start: "left-0 top-full mt-2", end: "right-0 top-full mt-2" },
};

const triggerClass =
  "inline-flex min-w-0 items-center justify-between gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold text-ink outline-none transition hover:border-ink focus-visible:border-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue disabled:cursor-not-allowed disabled:opacity-60";

/**
 * Shared open/close behavior for dropdowns: tracks the container so an
 * outside pointer press or Escape dismisses the menu.
 */
export function useDropdown() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open ]);

  return {
    open,
    openMenu: () => setOpen(true),
    closeMenu: () => setOpen(false),
    toggleMenu: () => setOpen((value) => !value),
    containerRef,
  };
}

/**
 * Viewport-aware positioning: starts from the preferred placement/align, then
 * flips when the open panel would spill past the viewport edge (e.g. a
 * right-edge trigger whose menu would clip on the right). Measured in a
 * layout effect so the correction lands before paint — no visible flicker.
 */
function useAutoPlacement({
  open,
  panelRef,
  placement,
  align,
}: {
  open: boolean;
  panelRef: RefObject<HTMLDivElement | null>;
  placement: DropdownPlacement;
  align: DropdownAlign;
}) {
  const [effective, setEffective] = useState({ placement, align });

  useEffect(() => {
    if (open) setEffective({ placement, align });
  }, [open, placement, align ]);

  useLayoutEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    const margin = 8;
    setEffective((current) => {
      let nextPlacement = current.placement;
      let nextAlign = current.align;
      if (current.align === "start" && rect.right > window.innerWidth - margin) nextAlign = "end";
      else if (current.align === "end" && rect.left < margin) nextAlign = "start";
      if (current.placement === "bottom" && rect.bottom > window.innerHeight - margin) nextPlacement = "top";
      else if (current.placement === "top" && rect.top < margin) nextPlacement = "bottom";
      if (nextPlacement === current.placement && nextAlign === current.align) return current;
      return { placement: nextPlacement, align: nextAlign };
    });
  }, [open, panelRef ]);

  return effective;
}

/**
 * Keyboard navigation across menu items: arrows move, Home/End jump,
 * Enter/Space picks, Escape closes (refocusing the trigger), Tab dismisses.
 */
function useDropdownList({
  open,
  count,
  isDisabled,
  initialIndex,
}: {
  open: boolean;
  count: number;
  isDisabled: (index: number) => boolean;
  initialIndex: number;
}) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (open) setActiveIndex(initialIndex);
  }, [open, initialIndex ]);

  useEffect(() => {
    if (!open) return;
    itemRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex ]);

  function focusItem(index: number) {
    setActiveIndex(index);
    itemRefs.current[index]?.focus();
  }

  function step(delta: 1 | -1) {
    if (count === 0) return;
    let next = activeIndex;
    for (let round = 0; round < count; round += 1) {
      next = (next + delta + count) % count;
      if (!isDisabled(next)) break;
    }
    if (!isDisabled(next)) focusItem(next);
  }

  function jump(to: "first" | "last") {
    if (count === 0) return;
    const order = Array.from({ length: count }, (_, index) => index);
    if (to === "last") order.reverse();
    const target = order.find((index) => !isDisabled(index));
    if (target !== undefined) focusItem(target);
  }

  return { activeIndex, setActiveIndex, itemRefs, step, jump };
}

export function DropdownPanel({
  placement = "bottom",
  align = "start",
  widthClassName = "w-full min-w-44",
  role = "menu",
  ariaLabel,
  ariaLabelledBy,
  panelRef,
  onKeyDown,
  className = "",
  children,
}: {
  placement?: DropdownPlacement;
  align?: DropdownAlign;
  widthClassName?: string;
  role?: "menu" | "listbox";
  ariaLabel?: string;
  ariaLabelledBy?: string;
  panelRef?: Ref<HTMLDivElement>;
  onKeyDown?: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      ref={panelRef}
      role={role}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className={`absolute z-30 max-h-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-line bg-white p-1.5 shadow-lg ${panelPositionClass[placement][align]} ${widthClassName} ${className}`}
    >
      {children}
    </div>
  );
}

export function DropdownItem({
  title,
  description,
  role = "menuitem",
  selected = false,
  highlighted = false,
  disabled = false,
  itemRef,
  onSelect,
  onHover,
  onFocusItem,
}: {
  title: string;
  description?: string;
  role?: "menuitem" | "option";
  selected?: boolean;
  highlighted?: boolean;
  disabled?: boolean;
  itemRef?: (element: HTMLButtonElement | null) => void;
  onSelect: () => void;
  onHover?: () => void;
  onFocusItem?: () => void;
}) {
  return (
    <button
      ref={itemRef}
      type="button"
      role={role}
      aria-selected={role === "option" ? selected : undefined}
      disabled={disabled}
      onClick={onSelect}
      onMouseEnter={onHover}
      onFocus={onFocusItem}
      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left outline-none transition-colors hover:bg-wash focus-visible:outline-2 focus-visible:outline-blue disabled:cursor-not-allowed disabled:opacity-40 ${highlighted ? "bg-wash" : ""}`}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">{title}</span>
        {description ? <span className="mt-0.5 block text-xs leading-5 text-muted">{description}</span> : null}
      </span>
      {selected ? (
        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-blue text-white" aria-hidden="true">
          <CheckIcon className="size-3" />
        </span>
      ) : null}
    </button>
  );
}

export type DropdownOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

type SelectDropdownProps = {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  placeholder?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  placement?: DropdownPlacement;
  align?: DropdownAlign;
  triggerClassName?: string;
  menuClassName?: string;
};

/**
 * General single-select dropdown: a button trigger with a floating listbox.
 * Drop-in replacement for native selects where the app needs its own styling.
 */
export function SelectDropdown({
  value,
  options,
  onChange,
  ariaLabel,
  ariaLabelledBy,
  placeholder = "Select…",
  disabled = false,
  fullWidth = false,
  placement = "bottom",
  align = "start",
  triggerClassName = "",
  menuClassName = "",
}: SelectDropdownProps) {
  const { open, openMenu, closeMenu, toggleMenu, containerRef } = useDropdown();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;
  const isDisabled = (index: number) => options[index]?.disabled ?? true;
  const firstEnabled = options.findIndex((option) => !option.disabled);
  const initialIndex = selected && !selected.disabled ? selectedIndex : firstEnabled >= 0 ? firstEnabled : 0;
  const { activeIndex, setActiveIndex, itemRefs, step, jump } = useDropdownList({
    open,
    count: options.length,
    isDisabled,
    initialIndex,
  });

  useEffect(() => {
    if (open) panelRef.current?.focus({ preventScroll: true });
  }, [open ]);

  const { placement: resolvedPlacement, align: resolvedAlign } = useAutoPlacement({ open, panelRef, placement, align });

  function close(refocus: boolean) {
    closeMenu();
    if (refocus) triggerRef.current?.focus();
  }

  function pick(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    close(true);
  }

  function onTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!disabled) openMenu();
    }
  }

  function onPanelKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      step(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      step(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      jump("first");
    } else if (event.key === "End") {
      event.preventDefault();
      jump("last");
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      pick(activeIndex);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close(true);
    } else if (event.key === "Tab") {
      close(false);
    }
  }

  return (
    <div ref={containerRef} className={fullWidth ? "relative w-full min-w-0" : "relative inline-flex min-w-0"}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        onClick={toggleMenu}
        onKeyDown={onTriggerKeyDown}
        className={`${triggerClass} ${fullWidth ? "w-full" : ""} ${triggerClassName}`}
      >
        <span className={`min-w-0 flex-1 truncate text-left ${selected ? "" : "font-medium text-muted"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDownIcon
          className={`size-4 shrink-0 text-muted transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <DropdownPanel
          role="listbox"
          ariaLabel={ariaLabel}
          ariaLabelledBy={ariaLabelledBy}
          placement={resolvedPlacement}
          align={resolvedAlign}
          panelRef={panelRef}
          onKeyDown={onPanelKeyDown}
          className={menuClassName}
        >
          {options.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-muted">No options available</p>
          ) : (
            options.map((option, index) => (
              <DropdownItem
                key={option.value}
                role="option"
                title={option.label}
                description={option.description}
                selected={option.value === value}
                highlighted={index === activeIndex}
                disabled={option.disabled}
                itemRef={(element) => {
                  itemRefs.current[index] = element;
                }}
                onSelect={() => pick(index)}
                onHover={() => {
                  if (!option.disabled) setActiveIndex(index);
                }}
                onFocusItem={() => setActiveIndex(index)}
              />
            ))
          )}
        </DropdownPanel>
      ) : null}
    </div>
  );
}

export type DropdownAction = {
  key: string;
  title: string;
  description?: string;
  disabled?: boolean;
  onSelect: () => void;
};

/**
 * General action-menu dropdown: a button trigger with a floating menu of
 * actions. For custom triggers (e.g. split buttons), compose `useDropdown`
 * with `DropdownPanel` and `DropdownItem` directly instead.
 */
export function MenuDropdown({
  trigger,
  actions,
  ariaLabel,
  disabled = false,
  fullWidth = false,
  placement = "bottom",
  align = "start",
  triggerClassName = "",
  menuClassName = "",
}: {
  trigger: ReactNode;
  actions: DropdownAction[];
  ariaLabel?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  placement?: DropdownPlacement;
  align?: DropdownAlign;
  triggerClassName?: string;
  menuClassName?: string;
}) {
  const { open, openMenu, closeMenu, toggleMenu, containerRef } = useDropdown();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const isDisabled = (index: number) => actions[index]?.disabled ?? true;
  const firstEnabled = actions.findIndex((action) => !action.disabled);
  const { activeIndex, setActiveIndex, itemRefs, step, jump } = useDropdownList({
    open,
    count: actions.length,
    isDisabled,
    initialIndex: firstEnabled >= 0 ? firstEnabled : 0,
  });

  useEffect(() => {
    if (open) panelRef.current?.focus({ preventScroll: true });
  }, [open ]);

  const { placement: resolvedPlacement, align: resolvedAlign } = useAutoPlacement({ open, panelRef, placement, align });

  function close(refocus: boolean) {
    closeMenu();
    if (refocus) triggerRef.current?.focus();
  }

  function pick(index: number) {
    const action = actions[index];
    if (!action || action.disabled) return;
    action.onSelect();
    close(true);
  }

  function onTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!disabled) openMenu();
    }
  }

  function onPanelKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      step(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      step(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      jump("first");
    } else if (event.key === "End") {
      event.preventDefault();
      jump("last");
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      pick(activeIndex);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close(true);
    } else if (event.key === "Tab") {
      close(false);
    }
  }

  return (
    <div ref={containerRef} className={fullWidth ? "relative w-full min-w-0" : "relative inline-flex min-w-0"}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={toggleMenu}
        onKeyDown={onTriggerKeyDown}
        className={`${triggerClass} ${fullWidth ? "w-full" : ""} ${triggerClassName}`}
      >
        <span className="min-w-0 flex-1 truncate text-left">{trigger}</span>
        <ChevronDownIcon
          className={`size-4 shrink-0 text-muted transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <DropdownPanel
          role="menu"
          ariaLabel={ariaLabel}
          placement={resolvedPlacement}
          align={resolvedAlign}
          panelRef={panelRef}
          onKeyDown={onPanelKeyDown}
          className={menuClassName}
        >
          {actions.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-muted">No actions available</p>
          ) : (
            actions.map((action, index) => (
              <DropdownItem
                key={action.key}
                role="menuitem"
                title={action.title}
                description={action.description}
                highlighted={index === activeIndex}
                disabled={action.disabled}
                itemRef={(element) => {
                  itemRefs.current[index] = element;
                }}
                onSelect={() => pick(index)}
                onHover={() => {
                  if (!action.disabled) setActiveIndex(index);
                }}
                onFocusItem={() => setActiveIndex(index)}
              />
            ))
          )}
        </DropdownPanel>
      ) : null}
    </div>
  );
}
