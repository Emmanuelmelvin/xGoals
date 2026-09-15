import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useDashboard } from "../components/dashboard-layout";
import { fieldInputClass, PermissionSwitch } from "../components/dashboard/goal-form";
import { PERMISSION_GROUPS, createDeployment, loadGoalPermissions, loadPermissionsForPublicGoal, loadPublicGoal } from "../components/dashboard/goal-persistence";
import { ArrowLeftIcon } from "../components/dashboard/icons";
import { SelectDropdown, useDropdown } from "../components/dropdown";
import { useToast } from "../components/toast";
import type { Goal, PublicGoal } from "../components/dashboard/types";
import { addDays, formatDateLong, formatDateTimeLong, isSameDay, roundUpToNextHour, startOfDay } from "../components/dashboard/schedule-picker";

export const Route = createFileRoute("/app/workflows/new")({
  validateSearch: (search: Record<string, unknown>): { goal?: string; drawer?: "open" | "closed" } => ({
    goal: typeof search.goal === "string" && search.goal ? search.goal : undefined,
    drawer: search.drawer === "closed" || search.drawer === "open" ? search.drawer : undefined,
  }),
  head: () => ({
    meta: [{ title: "xGoal — New workflow" }],
  }),
  component: NewWorkflowPage,
});

const permissionLabels = new Map(
  PERMISSION_GROUPS.flatMap((group) => group.entries.map((entry) => [entry.permission, entry.label] as const)),
);

const QUICK_LENGTHS = [7, 14, 30] as const;

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;
const QUICK_TIMES = ["09:00", "12:00", "17:00"] as const;

function toTimeInputValue(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function applyTime(base: Date, timeValue: string): Date | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(timeValue);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  const next = new Date(base);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

function DateTimePopover({ id, label, hint, value, onChange, minDate, disabled, error, defaultTime = "09:00", placeholder = "Pick date & time" }: { id: string; label: string; hint?: string; value: Date | null; onChange: (next: Date | null) => void; minDate?: Date | null; disabled?: boolean; error?: string | null; defaultTime?: string; placeholder?: string }) {
  const { open, closeMenu, toggleMenu, containerRef } = useDropdown();
  const [step, setStep] = useState<"date" | "time">("date");
  const initialView = value ?? minDate ?? new Date();
  const [viewYear, setViewYear] = useState(initialView.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialView.getMonth());

  useEffect(() => {
    if (!open) return;
    setStep("date");
    const base = value ?? minDate ?? new Date();
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
  }, [open ]);

  const minDay = minDate ? startOfDay(minDate) : null;
  const maxDay = startOfDay(addDays(new Date(), 365));
  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startOffset = firstOfMonth.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => new Date(viewYear, viewMonth, index + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const monthLabel = firstOfMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const prevDisabled =
    !!disabled || (!!minDay && (viewYear < minDay.getFullYear() || (viewYear === minDay.getFullYear() && viewMonth <= minDay.getMonth())));
  const nextDisabled =
    !!disabled || (viewYear > maxDay.getFullYear() || (viewYear === maxDay.getFullYear() && viewMonth >= maxDay.getMonth()));

  function goMonth(delta: -1 | 1) {
    if (delta === -1 && prevDisabled) return;
    if (delta === 1 && nextDisabled) return;
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  function isDayDisabled(day: Date): boolean {
    const dayStart = startOfDay(day);
    if (minDay && dayStart < minDay) return true;
    if (dayStart > maxDay) return true;
    return false;
  }

  function pickDay(day: Date) {
    if (isDayDisabled(day)) return;
    const base = value && isSameDay(value, day) ? value : (applyTime(day, value ? toTimeInputValue(value) : defaultTime) ?? day);
    const next = new Date(day);
    next.setHours(base.getHours(), base.getMinutes(), 0, 0);
    onChange(next);
    setStep("time");
  }

  function handleTimeChange(timeValue: string) {
    const base = value ?? new Date(viewYear, viewMonth, Math.min(new Date().getDate(), daysInMonth));
    const next = applyTime(base, timeValue);
    if (next) onChange(next);
  }

  const timeValue = value ? toTimeInputValue(value) : "";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggleMenu}
        aria-expanded={open}
        aria-haspopup="dialog"
        disabled={disabled}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3 text-left transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span className="text-sm font-semibold">
          {value ? formatDateTimeLong(value) : placeholder}
        </span>
        <span aria-hidden="true" className="text-xs text-muted">{open ? "▲" : "▼"}</span>
      </button>
      {open && !disabled ? (
        <div
          role="dialog"
          aria-label={`${label} calendar`}
          className="absolute bottom-full left-0 z-30 mb-2 w-[300px] max-w-[calc(100vw-3rem)] overflow-hidden rounded-2xl border border-line bg-white shadow-xl"
        >
          {step === "date" ? (
            <div className="p-3">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => goMonth(-1)}
                  disabled={prevDisabled}
                  aria-label="Previous month"
                  className="grid size-8 place-items-center rounded-lg border border-line text-sm font-bold text-muted transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-line disabled:hover:text-muted"
                >
                  <span aria-hidden="true">←</span>
                </button>
                <p className="text-sm font-bold" aria-live="polite">{monthLabel}</p>
                <button
                  type="button"
                  onClick={() => goMonth(1)}
                  disabled={nextDisabled}
                  aria-label="Next month"
                  className="grid size-8 place-items-center rounded-lg border border-line text-sm font-bold text-muted transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-line disabled:hover:text-muted"
                >
                  <span aria-hidden="true">→</span>
                </button>
              </div>
              {hint ? <p className="mt-1.5 text-xs leading-5 text-muted">{hint}</p> : null}
              <div role="grid" aria-label={`${label} — ${monthLabel}`} className="mt-2">
                <div role="row" className="grid grid-cols-7 gap-0.5">
                  {WEEKDAYS.map((day) => (
                    <span key={day} role="columnheader" className="py-1 text-center text-[0.65rem] font-bold uppercase tracking-wide text-muted">
                      {day}
                    </span>
                  ))}
                </div>
                <div className="mt-0.5 grid grid-cols-7 gap-0.5">
                  {cells.map((day, index) => {
                    if (!day) return <span key={`empty-${index}`} className="size-8" aria-hidden="true" />;
                    const selected = !!value && isSameDay(value, day);
                    const isToday = isSameDay(day, new Date());
                    const dayDisabled = isDayDisabled(day);
                    return (
                      <button
                        key={day.toISOString()}
                        type="button"
                        role="gridcell"
                        aria-selected={selected}
                        aria-label={day.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                        disabled={dayDisabled}
                        onClick={() => pickDay(day)}
                        className={`grid size-8 place-items-center rounded-lg text-[0.8125rem] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue ${
                          selected
                            ? "bg-blue text-white hover:bg-blue-dark"
                            : dayDisabled
                              ? "cursor-not-allowed text-line"
                              : "text-ink hover:bg-blue-pale"
                        } ${!selected && isToday ? "ring-1 ring-inset ring-blue/40" : ""}`}
                      >
                        {day.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>
              {error ? (
                <p role="alert" className="mt-2 text-xs font-semibold leading-5 text-red-700">{error}</p>
              ) : null}
            </div>
          ) : (
            <div className="p-4">
              <p className="text-sm font-semibold">
                {value ? value.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) : "Pick a time"}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted">What time should it {id === "workflow-from" ? "start" : "end"}?</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {QUICK_TIMES.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleTimeChange(preset)}
                    aria-pressed={timeValue === preset}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold tabular-nums transition-colors ${timeValue === preset ? "border-blue bg-blue text-white" : "border-line text-muted hover:border-ink hover:text-ink"}`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <label htmlFor={`${id}-time`} className="mt-3 block">
                <span className="text-xs font-semibold text-muted">Time</span>
                <input
                  id={`${id}-time`}
                  type="time"
                  value={timeValue}
                  onChange={(event) => handleTimeChange(event.target.value)}
                  className={`${fieldInputClass} mt-1.5 tabular-nums`}
                />
              </label>
              {error ? (
                <p role="alert" className="mt-2 text-xs font-semibold leading-5 text-red-700">{error}</p>
              ) : null}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep("date")}
                  className="rounded-xl px-3 py-2 text-sm font-semibold text-muted transition-colors hover:bg-wash hover:text-ink"
                >
                  ← Date
                </button>
                <button
                  type="button"
                  onClick={closeMenu}
                  disabled={!value}
                  className="flex-1 rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function NewWorkflowPage() {
  const { goal: goalParam, drawer } = Route.useSearch();
  const { user, goals, isGoalsLoading, refreshGoals } = useDashboard();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [goalId, setGoalId] = useState(goalParam ?? "");
  const drawerSearch = drawer ? { drawer } : {};
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [included, setIncluded] = useState<string[]>([]);
  const [scopeTouched, setScopeTouched] = useState(false);
  const [startMode, setStartMode] = useState<"now" | "schedule">("now");
  const [scheduledStart, setScheduledStart] = useState<Date | null>(() => roundUpToNextHour(new Date()));
  const [endsAtDate, setEndsAtDate] = useState<Date | null>(() => addDays(roundUpToNextHour(new Date()), 14));
  const [isIndefinite, setIsIndefinite] = useState(false);
  const [inheritedPermissions, setInheritedPermissions] = useState<string[]>([]);
  const [permissionsStatus, setPermissionsStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [isSaving, setIsSaving] = useState(false);

  const ownGoal = goals.find((goal) => goal.id === goalId);
  const [publicGoal, setPublicGoal] = useState<{ goalId: string; goal: PublicGoal | null } | null>(null);

  useEffect(() => {
    if (ownGoal || isGoalsLoading || !goalId || publicGoal?.goalId === goalId) return;
    let mounted = true;
    loadPublicGoal(goalId).then(({ goal }) => {
      if (!mounted) return;
      setPublicGoal({ goalId, goal });
    });
    return () => {
      mounted = false;
    };
  }, [ownGoal, isGoalsLoading, goalId, publicGoal]);

  const selectedGoal: Goal | undefined =
    ownGoal ?? (publicGoal && publicGoal.goalId === goalId ? publicGoal.goal ?? undefined : undefined);

  const goalOptions = goals.map((goal) => ({ value: goal.id, label: goal.title }));
  if (selectedGoal && !ownGoal) {
    goalOptions.push({ value: selectedGoal.id, label: `${selectedGoal.title} · public` });
  }

  useEffect(() => {
    if (!goalParam) return;
    setGoalId(goalParam);
    setNameTouched(false);
    setScopeTouched(false);
  }, [goalParam]);

  useEffect(() => {
    if (!selectedGoal || nameTouched) return;
    setName(`Run (${selectedGoal.title})`);
  }, [selectedGoal, nameTouched]);

  useEffect(() => {
    if (!selectedGoal || scopeTouched) return;
    setIncluded(selectedGoal.milestones.map((milestone) => milestone.title));
  }, [selectedGoal, scopeTouched]);

  useEffect(() => {
    if (!selectedGoal) {
      setInheritedPermissions([]);
      setPermissionsStatus("idle");
      return;
    }
    setPermissionsStatus("loading");
    let mounted = true;
    const loader = ownGoal
      ? loadGoalPermissions(user.id, selectedGoal.id)
      : loadPermissionsForPublicGoal(selectedGoal.id);
    loader.then(({ permissions: loaded, error }) => {
      if (!mounted) return;
      if (error) {
        setPermissionsStatus("error");
        return;
      }
      setInheritedPermissions(loaded);
      setPermissionsStatus("ready");
    });
    return () => {
      mounted = false;
    };
  }, [selectedGoal, ownGoal, user.id]);

  function toggleMilestone(title: string, next: boolean) {
    setScopeTouched(true);
    setIncluded(next ? [...included, title] : included.filter((item) => item !== title));
  }

  const scheduleError = useMemo(() => {
    if (startMode === "schedule" && !scheduledStart) return "Pick a start date and time.";
    if (isIndefinite) return null;
    if (!endsAtDate) return "Pick an end date and time.";
    const startBase = startMode === "now" ? new Date() : scheduledStart;
    if (startBase && endsAtDate.getTime() <= startBase.getTime()) return "The end needs to be after the start.";
    return null;
  }, [startMode, scheduledStart, endsAtDate, isIndefinite]);

  const runLengthDays = useMemo(() => {
    if (isIndefinite || !endsAtDate) return null;
    const startBase = startMode === "now" ? new Date() : scheduledStart;
    if (!startBase) return null;
    const diffMs = endsAtDate.getTime() - startBase.getTime();
    if (diffMs <= 0) return null;
    return Math.max(1, Math.ceil(diffMs / 86_400_000));
  }, [startMode, scheduledStart, endsAtDate, isIndefinite]);

  const canSave =
    !!selectedGoal && name.trim().length > 0 && included.length > 0 && (startMode === "now" || !!scheduledStart) && !scheduleError;

  function handleScheduledStartChange(next: Date | null) {
    setScheduledStart(next);
    if (next && endsAtDate && endsAtDate.getTime() <= next.getTime()) {
      setEndsAtDate(addDays(next, 1));
    }
  }

  function applyQuickLength(days: number) {
    const base = startMode === "now" ? new Date() : scheduledStart;
    if (!base) return;
    setIsIndefinite(false);
    setEndsAtDate(addDays(base, days));
  }

  function handleIndefiniteChange(next: boolean) {
    setIsIndefinite(next);
    const base = startMode === "now" ? new Date() : scheduledStart;
    if (!next && base && endsAtDate && endsAtDate.getTime() <= base.getTime()) {
      setEndsAtDate(addDays(base, 1));
    }
  }

  async function handleDeploy() {
    if (isSaving || !selectedGoal) return;
    const cleanName = name.trim();
    const deployStart = startMode === "now" ? new Date() : scheduledStart;
    if (!cleanName || included.length === 0 || !deployStart || scheduleError) {
      toast.error("Pick a goal, name the run, and keep at least one milestone in scope.", {
        description: scheduleError ?? undefined,
      });
      return;
    }
    setIsSaving(true);
    try {
      const { id, error } = await createDeployment({
        ownerId: user.id,
        goalId: selectedGoal.id,
        name: cleanName,
        milestones: included,
        skills: selectedGoal.skills,
        permissions: inheritedPermissions,
        runLengthDays,
        endsAt: isIndefinite || !endsAtDate ? null : endsAtDate.toISOString(),
        startsAt: deployStart.toISOString(),
      });
      if (!id || error) {
        toast.error("The workflow could not be deployed.", { description: error ?? undefined });
        return;
      }
      await refreshGoals();
      toast.success("Workflow running", { description: "Your workflow is live and running." });
      void navigate({ to: "/app/workflow/$workflowId", params: { workflowId: id } });
    } catch (err) {
      toast.error("The workflow could not be deployed.", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (!isGoalsLoading && goals.length === 0 && !goalId) {
    return (
      <section className="min-h-screen bg-paper">
        <section className="mx-auto w-full max-w-2xl p-5 sm:p-8">
          <section className="rounded-3xl border border-dashed border-line bg-wash px-6 py-16 text-center">
            <h1 className="text-xl font-semibold tracking-[-0.04em]">Create a goal first</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
              Workflows run from a goal. Set the direction first, then deploy the run.
            </p>
            <Link
              to="/app/goals/new"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue px-4 py-2.5 text-sm font-bold text-white"
            >
              Create a goal
            </Link>
          </section>
        </section>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-paper">
      <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between gap-4 border-b border-line bg-paper px-5 py-3 sm:px-8">
        <Link
          to="/app/workflows"
          search={drawerSearch}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-ink"
        >
          <ArrowLeftIcon /> Workflows
        </Link>
        <span className="inline-flex rounded-full bg-wash px-2.5 py-1 text-xs font-bold text-muted">New workflow</span>
      </header>

      <section className="mx-auto w-full max-w-2xl space-y-6 p-5 sm:p-8">
        <header>
          <p className="text-sm font-medium text-blue">New workflow</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.07em] sm:text-5xl">Start a run.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
            {selectedGoal ? (
              <>
                Configuring a run from <strong className="font-semibold text-ink">“{selectedGoal.title}”</strong> —
                review the scope, run window, and permissions, then deploy.
              </>
            ) : (
              "A workflow is a running instance of a goal — pick the goal, set the scope and the run window, then deploy."
            )}
          </p>
        </header>

        <section className="space-y-5 rounded-3xl border border-line bg-white p-5 sm:p-6">
          <div className="block">
            <span id="new-workflow-goal-label" className="text-sm font-semibold">Goal</span>
            <SelectDropdown
              ariaLabelledBy="new-workflow-goal-label"
              value={goalId}
              options={goalOptions}
              onChange={(next) => {
                setGoalId(next);
                setNameTouched(false);
                setScopeTouched(false);
              }}
              placeholder="Choose a goal…"
              fullWidth
              triggerClassName="mt-2"
            />
          </div>
          {selectedGoal && !ownGoal ? (
            <p className="mt-2 text-xs leading-5 text-muted">
              Public goal — this run stays private to you.
            </p>
          ) : null}
          <label className="block">
            <span className="text-sm font-semibold">Run name</span>
            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setNameTouched(true);
              }}
              maxLength={160}
              placeholder="e.g. Morning engagement run"
              className={fieldInputClass}
            />
          </label>
        </section>

        <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
          <p className="text-sm font-semibold">Milestones in scope</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            {selectedGoal ? "Uncheck anything this run should skip." : "Choose a goal to see its milestones."}
          </p>
          {selectedGoal ? (
            selectedGoal.milestones.length === 0 ? (
              <p className="mt-4 text-sm text-muted">This goal has no milestones yet.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {selectedGoal.milestones.map((milestone) => {
                  const checked = included.includes(milestone.title);
                  return (
                    <li key={milestone.title}>
                      <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition-colors ${checked ? "border-blue/40 bg-blue-pale/40" : "border-line bg-white"}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => toggleMilestone(milestone.title, event.target.checked)}
                          className="size-4 shrink-0 accent-blue"
                        />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{milestone.title}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )
          ) : null}
        </section>

        <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
          <header className="flex items-start justify-between gap-4">
            <section>
              <h2 className="text-sm font-semibold">When should it run?</h2>
              <p className="mt-1 text-xs leading-5 text-muted">
                Start now or schedule it — then set the end. The run length is calculated for you.
              </p>
            </section>
            <section className="flex shrink-0 items-center gap-2.5">
              <span className="text-xs font-semibold text-muted">Indefinite</span>
              <PermissionSwitch
                checked={isIndefinite}
                onChange={handleIndefiniteChange}
                label="Run indefinitely without an end date"
              />
            </section>
          </header>

          <div className="relative mt-6 pl-8">
            <ol className="space-y-6">
              <li className="relative">
                <span aria-hidden="true" className="absolute -left-5 -bottom-6 top-7 w-px bg-line" />
                <span aria-hidden="true" className={`absolute -left-8 top-1 grid size-6 place-items-center rounded-full border text-[0.65rem] font-bold ${startMode === "now" ? "border-blue bg-blue text-white" : "border-line bg-white text-muted"}`}>
                  {startMode === "now" ? "●" : "○"}
                </span>
                <p className="text-sm font-semibold">From</p>
                <div className="mt-2 inline-flex rounded-full border border-line bg-wash p-1" role="group" aria-label="Start mode">
                  {(["now", "schedule"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setStartMode(mode)}
                      aria-pressed={startMode === mode}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${startMode === mode ? "bg-ink text-white" : "text-muted hover:text-ink"}`}
                    >
                      {mode === "now" ? "Now" : "Schedule"}
                    </button>
                  ))}
                </div>
                {startMode === "now" ? (
                  <p className="mt-2 text-xs leading-5 text-muted">Starts immediately when you deploy.</p>
                ) : (
                  <div className="mt-2">
                    <DateTimePopover
                      id="workflow-from"
                      label="Start"
                      hint="When the run window opens."
                      value={scheduledStart}
                      onChange={handleScheduledStartChange}
                      minDate={startOfDay(new Date())}
                      defaultTime="09:00"
                    />
                  </div>
                )}
              </li>

              <li className="relative">
                <span aria-hidden="true" className="absolute -left-8 top-1 grid size-6 place-items-center rounded-full border border-line bg-white text-[0.65rem] font-bold text-muted">
                  ○
                </span>
                <p className="text-sm font-semibold">To</p>
                {isIndefinite ? (
                  <p className="mt-2 text-xs leading-5 text-muted">Runs until you stop it.</p>
                ) : (
                  <div className="mt-2">
                    <DateTimePopover
                      id="workflow-to"
                      label="End"
                      hint="When the run window closes."
                      value={endsAtDate}
                      onChange={setEndsAtDate}
                      minDate={startMode === "now" ? startOfDay(new Date()) : (scheduledStart ?? startOfDay(new Date()))}
                      error={scheduleError}
                      defaultTime="17:00"
                    />
                  </div>
                )}
                <section className="mt-3 flex flex-wrap items-center gap-2" aria-label="Quick run lengths">
                  <span className="text-xs font-semibold text-muted">Quick:</span>
                  {QUICK_LENGTHS.map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => applyQuickLength(days)}
                      disabled={startMode === "schedule" && !scheduledStart}
                      className="rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-bold text-muted transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {days} days
                    </button>
                  ))}
                </section>
              </li>
            </ol>
          </div>

          <p className="mt-5 text-xs leading-5 text-muted" aria-live="polite">
            {isIndefinite
              ? startMode === "now"
                ? "Starts now · runs until you stop it."
                : scheduledStart
                  ? `Starts ${formatDateLong(scheduledStart)} · runs until you stop it.`
                  : "Runs until you stop it."
              : startMode === "now"
                ? !endsAtDate || !runLengthDays
                  ? "Pick an end after now."
                  : `${runLengthDays} day${runLengthDays === 1 ? "" : "s"} · Now → ${formatDateLong(endsAtDate)}.`
                : !scheduledStart || !endsAtDate || !runLengthDays
                  ? "Pick a start and an end."
                  : `${runLengthDays} day${runLengthDays === 1 ? "" : "s"} · ${formatDateLong(scheduledStart)} → ${formatDateLong(endsAtDate)}.`}
          </p>
        </section>

        <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
          <p className="text-sm font-semibold">Permissions</p>
          <p className="mt-1 text-xs leading-5 text-muted">Inherited from the goal and frozen at deploy time.</p>
          {!selectedGoal ? (
            <p className="mt-4 text-sm text-muted">Choose a goal to review its permissions.</p>
          ) : permissionsStatus === "loading" ? (
            <p className="mt-4 text-sm text-muted">Loading inherited permissions…</p>
          ) : permissionsStatus === "error" ? (
            <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              Permissions couldn't be loaded — this run will deploy without a permission snapshot.
            </p>
          ) : inheritedPermissions.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No permissions granted on this goal yet.</p>
          ) : (
            <ul className="mt-4 flex flex-wrap gap-2">
              {inheritedPermissions.map((permission) => (
                <li
                  key={permission}
                  title={permission}
                  className="rounded-full bg-wash px-3 py-1.5 text-xs font-semibold text-ink"
                >
                  {permissionLabels.get(permission) ?? permission}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex items-center justify-between gap-2 pb-4">
          <p className="text-xs text-muted">
            {included.length} milestone{included.length === 1 ? "" : "s"} in scope
            {isIndefinite || runLengthDays === null ? " · indefinite" : ` · ${runLengthDays} day${runLengthDays === 1 ? "" : "s"}`}
          </p>
          <div className="flex gap-2">
            <Link
              to="/app/workflows"
              search={drawerSearch}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-muted transition-colors hover:bg-wash hover:text-ink"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={() => void handleDeploy()}
              disabled={isSaving || !canSave}
              aria-busy={isSaving}
              className="rounded-xl bg-blue px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Deploying…" : "Deploy workflow"}
            </button>
          </div>
        </section>
      </section>
    </section>
  );
}
