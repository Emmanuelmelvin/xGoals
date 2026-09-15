import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useDashboard } from "../components/dashboard-layout";
import { createGoal, loadGoalPermissions, updateGoal, type GoalCreationMode } from "../components/dashboard/goal-persistence";
import { ArrowLeftIcon, CheckIcon, ChevronDownIcon } from "../components/dashboard/icons";
import { DropdownItem, DropdownPanel, useDropdown } from "../components/dropdown";
import { MilestoneEditor, PermissionEditor, SkillsEditor, VisibilityPicker, cleanSkillDrafts, hasPartialSkillDraft, hasSkillContent, MILESTONE_MIN_LENGTH, fieldInputClass as inputClass, type SkillDraft } from "../components/dashboard/goal-form";
import { useToast } from "../components/toast";
import type { GoalVisibility } from "../components/dashboard/types";

export const Route = createFileRoute("/app/goals/new")({
  validateSearch: (search: Record<string, unknown>): { drawer?: "open" | "closed"; edit?: string } => ({
    drawer: search.drawer === "closed" || search.drawer === "open" ? search.drawer : undefined,
    edit: typeof search.edit === "string" && search.edit ? search.edit : undefined,
  }),
  head: ({ match }) => ({
    meta: [{ title: match.search.edit ? "xGoal — Edit goal" : "xGoal — New goal" }],
  }),
  component: NewGoalPage,
});

const STEPS = ["Details", "Milestones", "Permissions"] as const;

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
              {isDone ? <CheckIcon className="size-3.5" /> : index + 1}
            </span>
            <span className={`truncate text-xs font-bold sm:text-sm ${isCurrent ? "text-ink" : "text-muted"}`}>{label}</span>
            {index < STEPS.length - 1 ? <span className="mx-1 hidden h-px min-w-4 flex-1 bg-line sm:block" aria-hidden="true" /> : null}
          </li>
        );
      })}
    </ol>
  );
}

function NewGoalPage() {
  const { drawer, edit } = Route.useSearch();
  const { user, goals, isGoalsLoading, refreshGoals } = useDashboard();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [milestones, setMilestones] = useState<string[]>([""]);
  const [skills, setSkills] = useState<SkillDraft[]>([]);
  const [granted, setGranted] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<GoalVisibility>("private");
  const [isSaving, setIsSaving] = useState(false);
  const [prefilledEdit, setPrefilledEdit] = useState(false);
  const [permissionsFailed, setPermissionsFailed] = useState(false);
  const deployMenu = useDropdown();

  const editGoal = edit ? goals.find((goal) => goal.id === edit) : undefined;
  const editNotFound = !!edit && !isGoalsLoading && !editGoal;
  const cannotEditBranch = !!editGoal?.parentGoalId;

  useEffect(() => {
    if (!editGoal || prefilledEdit || editGoal.parentGoalId) return;
    if (title !== "" || description !== "" || granted.length > 0 || milestones.some((milestone) => milestone.trim() !== "") || hasSkillContent(skills)) {
      setPrefilledEdit(true);
      return;
    }
    setTitle(editGoal.title);
    setDescription(editGoal.description ?? "");
    setMilestones(editGoal.milestones.length > 0 ? editGoal.milestones.map((milestone) => milestone.title) : [""]);
    setSkills(editGoal.skills.map((skill) => ({ name: skill.name, body: skill.body })));
    setPrefilledEdit(true);
    let mounted = true;
    loadGoalPermissions(user.id, editGoal.id).then(({ permissions: loaded, error: loadError }) => {
      if (!mounted) return;
      if (loadError) {
        toast.error("Permissions couldn't be loaded.", { description: loadError });
        setPermissionsFailed(true);
        return;
      }
      setGranted(loaded);
    });
    return () => {
      mounted = false;
    };
  }, [editGoal, prefilledEdit, user.id]);

  const goalsSearch = drawer ? { drawer } : {};

  const detailsValid = title.trim().length > 0 && description.trim().length > 0;
  const milestonesValid = milestones.some((milestone) => milestone.trim().length >= MILESTONE_MIN_LENGTH);
  const canProceed = step === 0 ? detailsValid : step === 1 ? milestonesValid : true;

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
    if (hasPartialSkillDraft(skills)) {
      toast.error("Each skill needs a name and content.", { description: "Fill in both, or remove the skill." });
      return;
    }
    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const cleanSkills = cleanSkillDrafts(skills);
    if (editGoal) {
      if (editGoal.parentGoalId) {
        toast.error("Branches can't be edited.");
        return;
      }
      setIsSaving(true);
      try {
        const { error } = await updateGoal({
          ownerId: user.id,
          goalId: editGoal.id,
          title: cleanTitle,
          description: cleanDescription,
          milestones: cleanMilestones,
          skills: cleanSkills,
          permissions: permissionsFailed ? null : granted,
        });
        if (error) {
          toast.error("The goal could not be updated.", { description: error });
          return;
        }
        await refreshGoals();
        toast.success("Goal updated");
        void navigate({ to: "/app/goals/$goalId", params: { goalId: editGoal.id }, search: goalsSearch });
      } catch (err) {
        const message = err instanceof Error ? err.message : "The goal could not be updated.";
        toast.error("The goal could not be updated.", { description: message });
      } finally {
        setIsSaving(false);
      }
      return;
    }
    setIsSaving(true);
    try {
      const result = await createGoal({
        ownerId: user.id,
        title: cleanTitle,
        description: cleanDescription,
        milestones: cleanMilestones,
        skills: cleanSkills,
        permissions: granted,
        visibility,
      });
      if (!result.id) {
        const message = result.error ?? "The goal could not be created.";
        toast.error("The goal could not be created.", { description: message });
        return;
      }
      await refreshGoals();
      if (mode === "deploy") {
        toast.success("Goal created", {
          description:
            result.error ?? "Now configure your workflow — review the scope, run window, and permissions.",
        });
        void navigate({ to: "/app/workflows/new", search: { ...goalsSearch, goal: result.id } });
        return;
      }
      toast.success("Goal created", {
        description: result.error ? `Saved, but ${result.error}` : "Your milestones and permissions are saved.",
      });
      void navigate({ to: "/app/goals", search: goalsSearch });
    } catch (err) {
      const message = err instanceof Error ? err.message : "The goal could not be created.";
      toast.error("The goal could not be created.", { description: message });
    } finally {
      setIsSaving(false);
    }
  }

  if (editNotFound) {
    return (
      <section className="min-h-screen bg-paper">
        <section className="mx-auto w-full max-w-2xl p-5 sm:p-8">
          <section className="rounded-3xl border border-dashed border-line bg-wash px-6 py-16 text-center">
            <h1 className="text-xl font-semibold tracking-[-0.04em]">Goal not found</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
              This goal may have been deleted, or you may not have access to it.
            </p>
            <Link
              to="/app/goals"
              search={goalsSearch}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue px-4 py-2.5 text-sm font-bold text-white"
            >
              Back to goals
            </Link>
          </section>
        </section>
      </section>
    );
  }

  if (cannotEditBranch && editGoal) {
    return (
      <section className="min-h-screen bg-paper">
        <section className="mx-auto w-full max-w-2xl p-5 sm:p-8">
          <section className="rounded-3xl border border-dashed border-line bg-wash px-6 py-16 text-center">
            <h1 className="text-xl font-semibold tracking-[-0.04em]">Branches can't be edited</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
              Only top level goals can be edited. Create a branch from the original goal to explore a variation instead.
            </p>
            <Link
              to="/app/goals/$goalId"
              params={{ goalId: editGoal.id }}
              search={goalsSearch}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue px-4 py-2.5 text-sm font-bold text-white"
            >
              Back to goal
            </Link>
          </section>
        </section>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-paper">
      <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between gap-4 border-b border-line bg-paper px-5 py-3 sm:px-8">
        {editGoal ? (
          <Link to="/app/goals/$goalId" params={{ goalId: editGoal.id }} search={goalsSearch} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-ink">
            <ArrowLeftIcon /> Back to goal
          </Link>
        ) : (
          <Link to="/app/goals" search={goalsSearch} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-ink">
            <ArrowLeftIcon /> Goals
          </Link>
        )}
        <span className="inline-flex rounded-full bg-wash px-2.5 py-1 text-xs font-bold text-muted">Step {step + 1} of 3</span>
      </header>

      <section className="mx-auto w-full max-w-2xl p-5 sm:p-8">
        <p className="text-sm font-medium text-blue">{editGoal ? "Edit goal" : "New goal"}</p>
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
              {editGoal ? null : <VisibilityPicker value={visibility} onChange={setVisibility} />}
            </section>
          ) : null}

          {step === 1 ? (
            <section className="space-y-6">
              <MilestoneEditor milestones={milestones} onChange={setMilestones} />
              <SkillsEditor
                skills={skills}
                onChange={setSkills}
                onError={(message, description) => toast.error(message, { description })}
              />
            </section>
          ) : null}

          {step === 2 ? (
            <section className="space-y-6">
              {editGoal && permissionsFailed ? (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                  Permissions couldn't be loaded, so saving won't change them. Your existing permissions stay as they are.
                </p>
              ) : null}
              <section className="rounded-2xl border border-line bg-white p-4">
                <p className="truncate text-sm font-bold">{title.trim() || "Untitled goal"}</p>
                <p className="mt-1 text-xs text-muted">
                  {milestones.filter((milestone) => milestone.trim()).length} milestone
                  {milestones.filter((milestone) => milestone.trim()).length === 1 ? "" : "s"} · {granted.length} permission
                  {granted.length === 1 ? "" : "s"} granted
                </p>
              </section>

              <PermissionEditor granted={granted} onToggle={togglePermission} />
            </section>
          ) : null}

          <section className="mt-6 flex items-center justify-between gap-2 pt-4">
            {step === 0 ? (
              editGoal ? (
                <Link
                  to="/app/goals/$goalId"
                  params={{ goalId: editGoal.id }}
                  search={goalsSearch}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-muted transition-colors hover:bg-wash hover:text-ink"
                >
                  Cancel
                </Link>
              ) : (
                <Link
                  to="/app/goals"
                  search={goalsSearch}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-muted transition-colors hover:bg-wash hover:text-ink"
                >
                  Cancel
                </Link>
              )
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
            ) : editGoal ? (
              <button
                type="button"
                onClick={() => void handleCreate("goal")}
                disabled={isSaving}
                aria-busy={isSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSaving ? "Saving…" : "Save changes"}
              </button>
            ) : (
              <div ref={deployMenu.containerRef} className="relative">
                <div className="flex">
                  <button
                    type="button"
                      onClick={() => void handleCreate("goal")}
                    disabled={isSaving}
                    aria-busy={isSaving}
                    className="inline-flex items-center gap-2 rounded-l-xl rounded-r-none bg-blue px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isSaving ? "Creating…" : "Create goal"}
                  </button>
                  <button
                    type="button"
                    onClick={deployMenu.toggleMenu}
                    disabled={isSaving}
                    aria-expanded={deployMenu.open}
                    aria-haspopup="menu"
                    aria-label="More creation options"
                    className="grid place-items-center rounded-l-none rounded-r-xl border-l border-white/30 bg-blue px-2.5 text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronDownIcon />
                  </button>
                </div>
                {deployMenu.open ? (
                  <DropdownPanel placement="top" align="end" widthClassName="w-72" ariaLabel="Creation options">
                    <DropdownItem
                      title="Create goal"
                      description="Save milestones and permissions without deploying."
                      onSelect={() => {
                        deployMenu.closeMenu();
                        void handleCreate("goal");
                      }}
                    />
                    <DropdownItem
                      title="Create goal and run deployment"
                      description="Create the goal and start a running deployment from it."
                      onSelect={() => {
                        deployMenu.closeMenu();
                        void handleCreate("deploy");
                      }}
                    />
                  </DropdownPanel>
                ) : null}
              </div>
            )}
          </section>
        </section>
      </section>
    </section>
  );
}
