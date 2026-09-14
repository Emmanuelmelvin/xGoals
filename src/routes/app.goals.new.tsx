import { useEffect, useRef, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useDashboard } from "../components/dashboard-layout";
import { PERMISSION_GROUPS, createGoal, type GoalCreationMode } from "../components/dashboard/goal-persistence";
import { ChevronDownIcon, PlusIcon, TrashIcon } from "../components/dashboard/icons";
import { Tooltip } from "../components/tooltip";
import { useToast } from "../components/toast";

export const Route = createFileRoute("/app/goals/new")({
  validateSearch: (search: Record<string, unknown>): { drawer?: "open" | "closed" } => ({
    drawer: search.drawer === "closed" || search.drawer === "open" ? search.drawer : undefined,
  }),
  head: () => ({
    meta: [{ title: "xGoal — New goal" }],
  }),
  component: NewGoalPage,
});

const STEPS = ["Details", "Milestones", "Permissions"] as const;

const MILESTONE_MIN_LENGTH = 3;
const MILESTONE_MAX_LENGTH = 120;

const inputClass =
  "mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-blue focus:ring-2 focus:ring-blue/10";

function StepIndicator({ step }: { step: number }) {
  return (
    <ol className="mt-8 flex items-center gap-2" aria-label="Goal creation steps">
      {STEPS.map((label, index) => {
        const isDone = index < step;
        const isCurrent = index === step;
        return (
          <li key={label} className="flex min-w-0 flex-1 items-center gap-2" aria-current={isCurrent ? "step" : undefined}>
            <span
              className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors ${isDone ? "bg-blue text-white" : isCurrent ? "bg-blue-pale text-blue-dark" : "bg-wash text-muted"
                }`}
            >
              {isDone ? "✓" : index + 1}
            </span>
            <span className={`truncate text-xs font-bold sm:text-sm ${isCurrent ? "text-ink" : "text-muted"}`}>{label}</span>
            {index < STEPS.length - 1 ? <span className="mx-1 hidden h-px min-w-4 flex-1 bg-line sm:block" aria-hidden="true" /> : null}
          </li>
        );
      })}
    </ol>
  );
}

function PermissionSwitch({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-blue" : "bg-line"}`}
    >
      <span
        className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${checked ? "left-[1.375rem]" : "left-0.5"}`}
        aria-hidden="true"
      />
    </button>
  );
}

function NewGoalPage() {
  const { drawer } = Route.useSearch();
  const { user, refreshGoals } = useDashboard();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [milestones, setMilestones] = useState<string[]>([""]);
  const [granted, setGranted] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [deployMenuOpen, setDeployMenuOpen] = useState(false);
  const deployMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!deployMenuOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (deployMenuRef.current && !deployMenuRef.current.contains(event.target as Node)) setDeployMenuOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setDeployMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [deployMenuOpen]);

  const goalsSearch = drawer ? { drawer } : {};

  const detailsValid = title.trim().length > 0 && description.trim().length > 0;
  const milestonesValid = milestones.some((milestone) => milestone.trim().length >= MILESTONE_MIN_LENGTH);
  const canProceed = step === 0 ? detailsValid : step === 1 ? milestonesValid : true;

  function updateMilestone(index: number, value: string) {
    setMilestones(milestones.map((milestone, milestoneIndex) => (milestoneIndex === index ? value : milestone)));
  }

  function removeMilestone(index: number) {
    if (milestones.length <= 1) return;
    setMilestones(milestones.filter((_, milestoneIndex) => milestoneIndex !== index));
  }

  function togglePermission(permission: string, next: boolean) {
    setGranted(next ? [...granted, permission] : granted.filter((item) => item !== permission));
  }

  function goNext() {
    if (step === 0 && !detailsValid) {
      toast.error("Add a title and description to continue.");
      return;
    }
    if (step === 1 && !milestonesValid) {
      toast.error(`Each milestone needs at least ${MILESTONE_MIN_LENGTH} characters.`);
      return;
    }
    setStep(step + 1);
  }

  async function handleCreate(mode: GoalCreationMode) {
    if (isSaving) return;
    const cleanMilestones = milestones.map((milestone) => milestone.trim()).filter((milestone) => milestone.length >= MILESTONE_MIN_LENGTH);
    if (!title.trim() || !description.trim() || cleanMilestones.length === 0) {
      toast.error("Finish the details and add at least one milestone before creating the goal.");
      return;
    }
    setIsSaving(true);
    setDeployMenuOpen(false);
    try {
      const result = await createGoal({
        ownerId: user.id,
        title: title.trim(),
        description: description.trim(),
        milestones: cleanMilestones,
        permissions: granted,
        mode,
      });
      if (!result.id) {
        const message = result.error ?? "The goal could not be created.";
        toast.error("The goal could not be created.", { description: message });
        return;
      }
      await refreshGoals();
      toast.success("Goal created", {
        description: result.error
          ? `Saved, but ${result.error}`
          : mode === "active"
            ? "Your goal is active and ready for deployment."
            : "Your milestones and permissions are saved as a draft.",
      });
      void navigate({ to: "/app/goals", search: goalsSearch });
    } catch (err) {
      const message = err instanceof Error ? err.message : "The goal could not be created.";
      toast.error("The goal could not be created.", { description: message });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="min-h-screen bg-paper">
      <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between gap-4 border-b border-line bg-paper/95 px-5 py-3 backdrop-blur sm:px-8">
        <Link to="/app/goals" search={goalsSearch} className="text-sm font-semibold text-muted transition-colors hover:text-ink">
          ← Goals
        </Link>
        <span className="inline-flex rounded-full bg-wash px-2.5 py-1 text-xs font-bold text-muted">Step {step + 1} of 3</span>
      </header>

      <section className="mx-auto w-full max-w-2xl p-5 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue">New goal</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.07em] sm:text-5xl">
          {step === 0 ? "What are you working toward?" : step === 1 ? "How will you get there?" : "What can the agent do?"}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
          {step === 0
            ? "Start with the outcome you want in plain words."
            : step === 1
              ? "Break the goal into milestones — concrete checkpoints you can verify."
              : "Grant only the permissions this goal needs. Nothing runs without your approval."}
        </p>

        <StepIndicator step={step} />

        <section className="mt-8">
          {step === 0 ? (
            <section className="space-y-5">
              <label className="block">
                <span className="text-sm font-semibold">Goal title</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  autoFocus
                  maxLength={160}
                  placeholder="e.g. Build a thoughtful presence"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Description</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={5}
                  maxLength={8000}
                  placeholder="Describe the outcome, the audience, and what xGoal should help you do."
                  className={`${inputClass} resize-y`}
                />
              </label>
            </section>
          ) : null}

          {step === 1 ? (
            <section>
              <p className="text-sm font-semibold">Milestones</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                A goal needs at least one milestone — a single line of {MILESTONE_MIN_LENGTH}–{MILESTONE_MAX_LENGTH} characters.
              </p>
              <ul className="mt-4 space-y-3">
                {milestones.map((milestone, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Tooltip label={milestones.length <= 1 ? "A goal needs at least one milestone" : `Remove milestone ${index + 1}`} placement="top">
                      <button
                        type="button"
                        onClick={() => removeMilestone(index)}
                        disabled={milestones.length <= 1}
                        aria-label={milestones.length <= 1 ? "Cannot remove the last milestone" : `Remove milestone ${index + 1}`}
                        className="grid size-9 shrink-0 place-items-center rounded-xl border border-line bg-white text-muted transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-line disabled:hover:text-muted"
                      >
                        <TrashIcon />
                      </button>
                    </Tooltip>
                    <section className="min-w-0 flex-1">
                      <label className="block">
                        <span className="sr-only">Milestone {index + 1}</span>
                        <input
                          type="text"
                          value={milestone}
                          onChange={(event) => updateMilestone(index, event.target.value)}
                          minLength={MILESTONE_MIN_LENGTH}
                          maxLength={MILESTONE_MAX_LENGTH}
                          placeholder={`Milestone ${index + 1} — what should be true?`}
                          className={`${inputClass} mt-0`}
                        />
                      </label>
                    </section>
                    {index === milestones.length - 1 ? (
                      <Tooltip label="Add milestone" placement="top">
                        <button
                          type="button"
                          onClick={() => setMilestones([...milestones, ""])}
                          aria-label="Add milestone"
                          className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue text-white"
                        >
                          <PlusIcon />
                        </button>
                      </Tooltip>
                    ) : (
                      <span className="size-9 shrink-0" aria-hidden="true" />
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {step === 2 ? (
            <section className="space-y-6">
              <section className="rounded-2xl border border-line bg-white p-4">
                <p className="truncate text-sm font-bold">{title.trim() || "Untitled goal"}</p>
                <p className="mt-1 text-xs text-muted">
                  {milestones.filter((milestone) => milestone.trim()).length} milestone
                  {milestones.filter((milestone) => milestone.trim()).length === 1 ? "" : "s"} · {granted.length} permission
                  {granted.length === 1 ? "" : "s"} granted
                </p>
              </section>

              {PERMISSION_GROUPS.map((group) => (
                <section key={group.title}>
                  <p className="text-sm font-semibold">{group.title}</p>
                  <ul className="mt-3 space-y-2">
                    {group.entries.map((entry) => {
                      const checked = granted.includes(entry.permission);
                      return (
                        <li
                          key={entry.permission}
                          className={`flex items-center gap-4 rounded-2xl border p-4 transition-colors ${checked ? "border-blue/40 bg-blue-pale/40" : "border-line bg-white"}`}
                        >
                          <section className="min-w-0 flex-1">
                            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                              {entry.label}
                              {entry.sensitive ? (
                                <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-red-700">
                                  High impact
                                </span>
                              ) : null}
                            </p>
                            <p className="mt-0.5 text-xs leading-5 text-muted">{entry.description}</p>
                          </section>
                          <PermissionSwitch checked={checked} onChange={(next) => togglePermission(entry.permission, next)} label={entry.label} />
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </section>
          ) : null}

          <section className="mt-6 flex items-center justify-between gap-2 pt-4">
            {step === 0 ? (
              <Link
                to="/app/goals"
                search={goalsSearch}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-muted transition-colors hover:bg-wash hover:text-ink"
              >
                Cancel
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-muted transition-colors hover:bg-wash hover:text-ink"
              >
                Back
              </button>
            )}
            {step < 2 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={!canProceed}
                className="inline-flex items-center gap-2 rounded-xl bg-blue px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <span aria-hidden="true">→</span>
              </button>
            ) : (
              <div ref={deployMenuRef} className="relative">
                <div className="flex">
                  <button
                    type="button"
                    onClick={() => void handleCreate("draft")}
                    disabled={isSaving}
                    aria-busy={isSaving}
                    className="inline-flex items-center gap-2 rounded-l-xl rounded-r-none bg-blue px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isSaving ? "Creating…" : "Create goal"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeployMenuOpen(!deployMenuOpen)}
                    disabled={isSaving}
                    aria-expanded={deployMenuOpen}
                    aria-haspopup="menu"
                    aria-label="More creation options"
                    className="grid place-items-center rounded-l-none rounded-r-xl border-l border-white/30 bg-blue px-2.5 text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronDownIcon />
                  </button>
                </div>
                {deployMenuOpen ? (
                  <div role="menu" aria-label="Creation options" className="absolute bottom-full right-0 z-20 mb-2 w-72 rounded-2xl border border-line bg-white p-1.5 shadow-lg">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => void handleCreate("draft")}
                      className="block w-full rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-wash"
                    >
                      <span className="block text-sm font-bold">Create goal</span>
                      <span className="mt-0.5 block text-xs leading-5 text-muted">Save milestones and permissions as a draft.</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => void handleCreate("active")}
                      className="mt-1 block w-full rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-wash"
                    >
                      <span className="block text-sm font-bold">Create goal and run deployment</span>
                      <span className="mt-0.5 block text-xs leading-5 text-muted">Activate the goal so deployment can run from it.</span>
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </section>
        </section>
      </section>
    </section>
  );
}
