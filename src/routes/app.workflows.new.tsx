import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useDashboard } from "../components/dashboard-layout";
import { fieldInputClass, PermissionSwitch } from "../components/dashboard/goal-form";
import { PERMISSION_GROUPS, createDeployment, loadGoalPermissions } from "../components/dashboard/goal-persistence";
import { ArrowLeftIcon } from "../components/dashboard/icons";
import { SelectDropdown } from "../components/dropdown";
import { useToast } from "../components/toast";
import { DateTimePicker, addDays, formatDateLong, roundUpToNextHour, startOfDay } from "../components/dashboard/schedule-picker";

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
  const [startsAt, setStartsAt] = useState<Date | null>(() => roundUpToNextHour(new Date()));
  const [endsAtDate, setEndsAtDate] = useState<Date | null>(() => addDays(roundUpToNextHour(new Date()), 14));
  const [isIndefinite, setIsIndefinite] = useState(false);
  const [inheritedPermissions, setInheritedPermissions] = useState<string[]>([]);
  const [permissionsStatus, setPermissionsStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [isSaving, setIsSaving] = useState(false);

  const selectedGoal = goals.find((goal) => goal.id === goalId);

  useEffect(() => {
    if (!goalParam) return;
    setGoalId(goalParam);
    setNameTouched(false);
    setScopeTouched(false);
  }, [goalParam]);

  useEffect(() => {
    if (!selectedGoal || nameTouched) return;
    setName(selectedGoal.title);
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
    loadGoalPermissions(user.id, selectedGoal.id).then(({ permissions: loaded, error }) => {
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
  }, [selectedGoal, user.id]);

  function toggleMilestone(title: string, next: boolean) {
    setScopeTouched(true);
    setIncluded(next ? [...included, title] : included.filter((item) => item !== title));
  }

  const scheduleError = useMemo(() => {
    if (!startsAt) return "Pick a start date and time.";
    if (isIndefinite) return null;
    if (!endsAtDate) return "Pick an end date and time.";
    if (endsAtDate.getTime() <= startsAt.getTime()) return "The end needs to be after the start.";
    return null;
  }, [startsAt, endsAtDate, isIndefinite]);

  const runLengthDays = useMemo(() => {
    if (isIndefinite || !startsAt || !endsAtDate) return null;
    const diffMs = endsAtDate.getTime() - startsAt.getTime();
    if (diffMs <= 0) return null;
    return Math.max(1, Math.ceil(diffMs / 86_400_000));
  }, [startsAt, endsAtDate, isIndefinite]);

  const canSave =
    !!selectedGoal && name.trim().length > 0 && included.length > 0 && !!startsAt && !scheduleError;

  function handleStartsAtChange(next: Date | null) {
    setStartsAt(next);
    if (next && endsAtDate && endsAtDate.getTime() <= next.getTime()) {
      setEndsAtDate(addDays(next, 1));
    }
  }

  function applyQuickLength(days: number) {
    if (!startsAt) return;
    setIsIndefinite(false);
    setEndsAtDate(addDays(startsAt, days));
  }

  function handleIndefiniteChange(next: boolean) {
    setIsIndefinite(next);
    if (!next && startsAt && endsAtDate && endsAtDate.getTime() <= startsAt.getTime()) {
      setEndsAtDate(addDays(startsAt, 1));
    }
  }

  async function handleDeploy() {
    if (isSaving || !selectedGoal) return;
    const cleanName = name.trim();
    if (!cleanName || included.length === 0 || !startsAt || scheduleError) {
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
        permissions: inheritedPermissions,
        runLengthDays,
        endsAt: isIndefinite || !endsAtDate ? null : endsAtDate.toISOString(),
        startsAt: startsAt.toISOString(),
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

  if (!isGoalsLoading && goals.length === 0) {
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
              options={goals.map((goal) => ({ value: goal.id, label: goal.title }))}
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
                Pick a start and an end — date and time. The run length is calculated for you.
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

          <section className="mt-4 flex flex-col gap-4 lg:flex-row">
            <DateTimePicker
              id="workflow-from"
              label="From"
              hint="When the run window opens."
              value={startsAt}
              onChange={handleStartsAtChange}
              minDate={startOfDay(new Date())}
              defaultTime="09:00"
            />
            <DateTimePicker
              id="workflow-to"
              label="To"
              hint={isIndefinite ? "Disabled while indefinite is on." : "When the run window closes."}
              value={isIndefinite ? null : endsAtDate}
              onChange={setEndsAtDate}
              minDate={startsAt ?? startOfDay(new Date())}
              disabled={isIndefinite}
              error={isIndefinite ? null : scheduleError}
              defaultTime="17:00"
            />
          </section>

          <section className="mt-4 flex flex-wrap items-center gap-2" aria-label="Quick run lengths">
            <span className="text-xs font-semibold text-muted">Quick:</span>
            {QUICK_LENGTHS.map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => applyQuickLength(days)}
                disabled={!startsAt}
                className="rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-bold text-muted transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
              >
                {days} days
              </button>
            ))}
          </section>

          <p className="mt-3 text-xs leading-5 text-muted" aria-live="polite">
            {isIndefinite || !startsAt
              ? "Runs until you stop it."
              : !endsAtDate || !runLengthDays
                ? "Pick an end after the start."
                : `${runLengthDays} day${runLengthDays === 1 ? "" : "s"} · ${formatDateLong(startsAt)} → ${formatDateLong(endsAtDate)}.`}
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
