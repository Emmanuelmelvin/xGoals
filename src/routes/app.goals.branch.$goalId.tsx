import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useDashboard } from "../components/dashboard-layout";
import { MilestoneEditor, PermissionEditor, MILESTONE_MIN_LENGTH, fieldInputClass } from "../components/dashboard/goal-form";
import { createGoal, loadGoalPermissions } from "../components/dashboard/goal-persistence";
import { ArrowLeftIcon } from "../components/dashboard/icons";
import { useToast } from "../components/toast";

export const Route = createFileRoute("/app/goals/branch/$goalId")({
  head: () => ({
    meta: [{ title: "xGoal — New branch" }],
  }),
  component: NewBranchPage,
});

function NewBranchPage() {
  const { goalId } = Route.useParams();
  const { user, goals, isGoalsLoading, refreshGoals } = useDashboard();
  const { toast } = useToast();
  const navigate = useNavigate();
  const parent = goals.find((goal) => goal.id === goalId);
  const notFound = !isGoalsLoading && !parent;
  const cannotBranch = !!parent?.parentGoalId;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [milestones, setMilestones] = useState<string[]>([""]);
  const [granted, setGranted] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [inherited, setInherited] = useState(false);
  const [permissionsStatus, setPermissionsStatus] = useState<"loading" | "ready" | "error">("loading");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!parent || inherited) return;
    if (title !== "" || description !== "" || granted.length > 0 || milestones.some((milestone) => milestone.trim() !== "")) {
      setInherited(true);
      return;
    }
    setTitle(parent.title);
    setDescription(parent.description ?? "");
    setMilestones(parent.milestones.length > 0 ? parent.milestones.map((milestone) => milestone.title) : [""]);
    setInherited(true);
  }, [parent, inherited]);

  useEffect(() => {
    if (!parent) return;
    setPermissionsStatus("loading");
    let mounted = true;
    loadGoalPermissions(user.id, parent.id).then(({ permissions: loaded, error }) => {
      if (!mounted) return;
      if (error) {
        toast.error("Parent permissions couldn't be loaded.", { description: error });
        setPermissionsStatus("error");
        return;
      }
      setGranted(loaded);
      setPermissionsStatus("ready");
    });
    return () => {
      mounted = false;
    };
  }, [parent, user.id, reloadKey]);

  function togglePermission(permission: string, next: boolean) {
    setGranted(next ? [...granted, permission] : granted.filter((item) => item !== permission));
  }

  const milestoneCount = milestones.filter((milestone) => milestone.trim()).length;

  async function handleSave() {
    if (isSaving || !parent || parent.parentGoalId) return;
    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const cleanMilestones = milestones.map((milestone) => milestone.trim()).filter((milestone) => milestone.length >= MILESTONE_MIN_LENGTH);
    if (!cleanTitle || !cleanDescription || cleanMilestones.length === 0) {
      toast.error("Finish the details and add at least one milestone before creating the branch.");
      return;
    }
    setIsSaving(true);
    try {
      const result = await createGoal({
        ownerId: user.id,
        title: cleanTitle,
        description: cleanDescription,
        milestones: cleanMilestones,
        permissions: granted,
        parentGoalId: parent.id,
      });
      if (!result.id) {
        toast.error("The branch could not be created.", { description: result.error ?? undefined });
        return;
      }
      await refreshGoals();
      if (result.error) {
        toast.warning("Branch created, but some permissions failed to save.", { description: result.error });
      } else {
        toast.success("Branch created");
      }
      void navigate({ to: "/app/goals/$goalId", params: { goalId: result.id } });
    } catch (err) {
      toast.error("The branch could not be created.", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (isGoalsLoading && !parent) {
    return (
      <section className="min-h-screen bg-paper">
        <p className="mx-auto max-w-2xl p-5 text-sm text-muted sm:p-8">Loading parent goal…</p>
      </section>
    );
  }

  if (notFound || !parent) {
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
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue px-4 py-2.5 text-sm font-bold text-white"
            >
              Back to goals
            </Link>
          </section>
        </section>
      </section>
    );
  }

  if (cannotBranch) {
    return (
      <section className="min-h-screen bg-paper">
        <section className="mx-auto w-full max-w-2xl p-5 sm:p-8">
          <section className="rounded-3xl border border-dashed border-line bg-wash px-6 py-16 text-center">
            <h1 className="text-xl font-semibold tracking-[-0.04em]">Branches can't branch further</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
              Only top-level goals can have branches. Create a branch from the original goal instead.
            </p>
            <Link
              to="/app/goals/$goalId"
              params={{ goalId: parent.id }}
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
        <Link
          to="/app/goals/$goalId"
          params={{ goalId: parent.id }}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-ink"
        >
          <ArrowLeftIcon /> Back to goal
        </Link>
        <span className="inline-flex rounded-full bg-wash px-2.5 py-1 text-xs font-bold text-muted">New branch</span>
      </header>

      <section className="mx-auto w-full max-w-2xl space-y-6 p-5 sm:p-8">
        <header>
          <p className="text-sm font-medium text-blue">New branch</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.07em] sm:text-5xl">Branch off this goal.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
            Starting from{" "}
            <Link
              to="/app/goals/$goalId"
              params={{ goalId: parent.id }}
              className="font-semibold text-blue hover:underline"
            >
              {parent.title}
            </Link>{" "}
            — keep what works, remove what doesn't, add what's missing.
          </p>
        </header>

        <section className="space-y-5 rounded-3xl border border-line bg-white p-5 sm:p-6">
          <label className="block">
            <span className="text-sm font-semibold">Branch title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              autoFocus
              maxLength={160}
              placeholder="e.g. Build a thoughtful presence — evening edition"
              className={fieldInputClass}
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              maxLength={8000}
              placeholder="Describe how this branch differs from the original."
              className={`${fieldInputClass} resize-y`}
            />
          </label>
        </section>

        <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
          <MilestoneEditor milestones={milestones} onChange={setMilestones} />
        </section>

        <section className="rounded-3xl border border-line bg-white p-5 sm:p-6">
          <p className="text-sm font-semibold">Permissions</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Inherited from the parent goal — toggle anything that shouldn't carry over.
          </p>
          <div className="mt-4">
            {permissionsStatus === "loading" ? (
              <p className="text-sm text-muted">Loading inherited permissions…</p>
            ) : permissionsStatus === "error" ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm text-red-700">Parent permissions couldn't be loaded, so this branch starts with none.</p>
                <button
                  type="button"
                  onClick={() => setReloadKey((key) => key + 1)}
                  className="mt-2 text-sm font-bold text-red-700 hover:underline"
                >
                  Try again
                </button>
              </div>
            ) : (
              <PermissionEditor granted={granted} onToggle={togglePermission} />
            )}
          </div>
        </section>

        <section className="flex items-center justify-between gap-2 pb-4">
          <p className="text-xs text-muted">
            {milestoneCount} milestone{milestoneCount === 1 ? "" : "s"} · {granted.length} permission
            {granted.length === 1 ? "" : "s"}
          </p>
          <div className="flex gap-2">
            <Link
              to="/app/goals/$goalId"
              params={{ goalId: parent.id }}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-muted transition-colors hover:bg-wash hover:text-ink"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving || permissionsStatus === "loading"}
              aria-busy={isSaving}
              className="rounded-xl bg-blue px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Creating…" : "Create branch"}
            </button>
          </div>
        </section>
      </section>
    </section>
  );
}
