import { useEffect, useState, type FormEvent } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useDashboard } from "../components/dashboard-layout";
import { GoalReviewEditor } from "../components/dashboard/goal-review-editor";
import { normalizeGoalAnalysis } from "../components/dashboard/goal-plan";
import {
  createGoalDraft,
  loadGoalDraft,
  saveGoalReview,
  type GoalCreationMode,
} from "../components/dashboard/goal-persistence";
import { analyzeGoal, type GoalAnalysis } from "../lib/ai/agent-server-fns";
import { useToast } from "../components/toast";
import { Tooltip } from "../components/tooltip";

export const Route = createFileRoute("/app/review")({
  validateSearch: (search: Record<string, unknown>): { drawer?: "open" | "closed"; goalId?: string } => ({
    drawer: search.drawer === "closed" || search.drawer === "open" ? search.drawer : undefined,
    goalId: typeof search.goalId === "string" && search.goalId.length > 0 ? search.goalId : undefined,
  }),
  head: () => ({
    meta: [{ title: "xGoal — Review goal" }],
  }),
  component: ReviewPage,
});

function ReviewPage() {
  const { goalId } = Route.useSearch();
  if (!goalId) return <NewGoalPage />;
  return <GoalReviewPage key={goalId} goalId={goalId} />;
}

function NewGoalPage() {
  const { user } = useDashboard();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedPrompt = prompt.trim();
    if (!trimmedTitle || !trimmedPrompt || isAnalyzing) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const raw = await analyzeGoal({ data: { title: trimmedTitle, prompt: trimmedPrompt } });
      const analysis = normalizeGoalAnalysis(raw);
      const draft = await createGoalDraft({ ownerId: user.id, title: trimmedTitle, prompt: trimmedPrompt, analysis });
      if (!draft.id) {
        setError(draft.error ?? "The goal draft could not be created.");
        return;
      }
      void navigate({ to: "/app/review", search: { goalId: draft.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "The goal analysis failed.");
      toast.error("The goal analysis failed.", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsAnalyzing(false);
    }
  }

  const canSubmit = title.trim().length > 0 && prompt.trim().length > 0 && !isAnalyzing;

  return (
    <section className="min-h-screen bg-paper">
      <header className="flex min-h-16 items-center justify-between gap-4 border-b border-line px-5 py-3 sm:px-8">
        <Link to="/app/goals" className="text-sm font-semibold text-muted transition-colors hover:text-ink">
          ← Goals
        </Link>
        <span className="inline-flex rounded-full bg-wash px-2.5 py-1 text-xs font-bold text-muted">New draft</span>
      </header>

      <section className="mx-auto w-full max-w-2xl p-5 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue">New foundation</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.07em] sm:text-5xl">What are you working toward?</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
          Start with the outcome you want. xGoal builds a detailed plan for you to review on the next step.
        </p>

        <form onSubmit={handleAnalyze} className="mt-8 space-y-5">
          <label className="block">
            <span className="text-sm font-semibold">Goal title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              autoFocus
              maxLength={160}
              placeholder="e.g. Build a thoughtful presence"
              className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-blue focus:ring-2 focus:ring-blue/10"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">What do you want to achieve?</span>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={5}
              maxLength={8000}
              placeholder="Describe the outcome, the audience, and what xGoal should help you do."
              className="mt-2 w-full resize-y rounded-xl border border-line bg-white p-4 text-sm leading-6 outline-none transition focus:border-blue focus:ring-2 focus:ring-blue/10"
            />
          </label>

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          <section className="flex items-center justify-end gap-2 border-t border-line pt-4">
            <Link
              to="/app/goals"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-muted transition-colors hover:bg-wash hover:text-ink"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!canSubmit}
              aria-busy={isAnalyzing}
              className="inline-flex items-center gap-2 rounded-xl bg-blue px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isAnalyzing ? "Analyzing…" : "Analyze goal"}
              <span aria-hidden="true">↗</span>
            </button>
          </section>
        </form>
      </section>
    </section>
  );
}

function GoalReviewPage({ goalId }: { goalId: string }) {
  const { user, refreshGoals } = useDashboard();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [analysis, setAnalysis] = useState<GoalAnalysis | null>(null);
  const [scheduledFor, setScheduledFor] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setLoadError(null);
    loadGoalDraft({ ownerId: user.id, goalId })
      .then(({ data, error }) => {
        if (!mounted) return;
        if (!data) {
          setLoadError(error ?? "That goal draft could not be found.");
          return;
        }
        setTitle(data.title);
        setPrompt(data.prompt);
        setAnalysis(normalizeGoalAnalysis(data.analysis));
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setLoadError(err instanceof Error ? err.message : "That goal draft could not be loaded.");
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [user.id, goalId]);

  async function handleSave(mode: GoalCreationMode) {
    if (!analysis || isSaving) return;
    if (!title.trim()) {
      setSaveError("Give the goal a title before saving.");
      return;
    }
    if (mode === "schedule" && !scheduledFor) {
      setSaveError("Choose a time for the first scheduled run.");
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    const result = await saveGoalReview({
      goalId,
      ownerId: user.id,
      title: title.trim(),
      prompt: prompt.trim(),
      analysis,
      mode,
      scheduledFor,
    });
    if (!result.data) {
      const message = result.error ?? "The goal could not be saved.";
      setSaveError(message);
      toast.error("The goal could not be saved.", { description: message });
      setIsSaving(false);
      return;
    }
    await refreshGoals();
    toast.success(
      mode === "deploy" ? "Goal created and workflow deployed" : mode === "schedule" ? "Goal created and workflow scheduled" : "Goal draft saved",
      {
        description: result.error
          ? `Saved, but ${result.error}`
          : mode === "goal"
            ? "Your plan is ready to shape."
            : "Your reviewed plan is ready for the next run.",
      },
    );
    void navigate({ to: "/app/goals" });
  }

  if (isLoading) {
    return (
      <section className="grid min-h-screen place-items-center bg-paper">
        <p className="text-sm text-muted">Loading your draft…</p>
      </section>
    );
  }

  if (loadError || !analysis) {
    return (
      <section className="min-h-screen bg-paper">
        <header className="flex min-h-16 items-center justify-between gap-4 border-b border-line px-5 py-3 sm:px-8">
          <Link to="/app/goals" className="text-sm font-semibold text-muted transition-colors hover:text-ink">
            ← Goals
          </Link>
        </header>
        <section className="mx-auto max-w-2xl p-5 sm:p-8">
          <h1 className="text-3xl font-semibold tracking-[-0.06em]">Draft not found</h1>
          <p className="mt-3 text-sm leading-6 text-muted" role="alert">
            {loadError ?? "That goal draft could not be loaded."}
          </p>
          <section className="mt-6 flex gap-2">
            <Link to="/app/review" className="rounded-xl bg-blue px-4 py-2 text-sm font-bold text-white">
              Start a new goal
            </Link>
            <Link to="/app/goals" className="rounded-xl px-4 py-2 text-sm font-semibold text-muted hover:bg-wash hover:text-ink">
              Back to goals
            </Link>
          </section>
        </section>
      </section>
    );
  }

  const canSchedule = title.trim().length > 0 && scheduledFor.length > 0 && analysis.workflow_suggestions.length > 0;
  const canDeploy = title.trim().length > 0 && analysis.workflow_suggestions.length > 0;

  return (
    <section className="min-h-screen bg-paper pb-24">
      <header className="flex min-h-16 items-center justify-between gap-4 border-b border-line px-5 py-3 sm:px-8">
        <section className="flex min-w-0 items-center gap-3">
          <Link to="/app/goals" className="shrink-0 text-sm font-semibold text-muted transition-colors hover:text-ink">
            ← Goals
          </Link>
          <span className="hidden h-4 w-px bg-line sm:block" aria-hidden="true" />
          <p className="hidden truncate text-sm text-muted sm:block">Reviewing draft</p>
        </section>
        <Tooltip label="Saved as a draft — nothing is live yet" placement="bottom">
          <span className="inline-flex shrink-0 rounded-full bg-blue-pale px-2.5 py-1 text-xs font-bold text-blue-dark">Draft</span>
        </Tooltip>
      </header>

      <section className="mx-auto w-full max-w-4xl p-5 sm:p-8">
        <GoalReviewEditor
          title={title}
          prompt={prompt}
          analysis={analysis}
          scheduledFor={scheduledFor}
          onTitleChange={setTitle}
          onPromptChange={setPrompt}
          onAnalysisChange={setAnalysis}
          onScheduledForChange={setScheduledFor}
        />

        {saveError ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700" role="alert">
            {saveError}
          </p>
        ) : null}
      </section>

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 backdrop-blur">
        <section className="mx-auto flex w-full max-w-4xl flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="hidden text-xs text-muted sm:block">Nothing publishes without your approval.</p>
          <section className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => void handleSave("goal")}
              disabled={isSaving || !title.trim()}
              className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-bold disabled:opacity-40"
            >
              {isSaving ? "Saving…" : "Save draft"}
            </button>
            <Tooltip label={scheduledFor ? "Schedule this workflow for the chosen time" : "Choose a first run time below"} placement="top">
              <button
                type="button"
                onClick={() => void handleSave("schedule")}
                disabled={isSaving || !canSchedule}
                className="rounded-xl border border-blue/30 bg-blue-pale px-4 py-2 text-sm font-bold text-blue-dark disabled:opacity-40"
              >
                Schedule
              </button>
            </Tooltip>
            <button
              type="button"
              onClick={() => void handleSave("deploy")}
              disabled={isSaving || !canDeploy}
              className="rounded-xl bg-blue px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
            >
              Create & deploy
            </button>
          </section>
        </section>
      </footer>
    </section>
  );
}
