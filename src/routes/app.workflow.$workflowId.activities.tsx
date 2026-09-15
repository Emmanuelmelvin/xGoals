import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useDashboard } from "../components/dashboard-layout";
import { StatusPill } from "../components/dashboard/goal-card";
import { loadWorkflow, loadWorkflowRuns } from "../components/dashboard/goal-persistence";
import { addDraftComment, editDraftContent, loadDraftComments, loadDrafts, reviewDraft, type DraftReviewAction } from "../components/dashboard/draft-persistence";
import { ArrowLeftIcon, CheckIcon, ChevronDownIcon, ChevronRightIcon, CloseIcon, MessageIcon, PencilIcon } from "../components/dashboard/icons";
import { useDropdown } from "../components/dropdown";
import { Tooltip } from "../components/tooltip";
import { useToast } from "../components/toast";
import type { Deployment, DraftItem, DraftStatus, RunStatus, WorkflowRun } from "../components/dashboard/types";

export const Route = createFileRoute("/app/workflow/$workflowId/activities")({
  head: () => ({
    meta: [{ title: "xGoal — Workflow activity" }],
  }),
  component: WorkflowActivitiesPage,
});

type Filter = "all" | "review" | "drafts" | "runs";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "review", label: "Needs review" },
  { value: "drafts", label: "Drafts" },
  { value: "runs", label: "Runs" },
];

type TimeFilter = "all" | "today" | "week" | "month";

const TIME_FILTERS: { value: TimeFilter; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "week", label: "Past week" },
  { value: "month", label: "Past month" },
];

function matchesTimeFilter(at: string, timeFilter: TimeFilter): boolean {
  if (timeFilter === "all") return true;
  if (!at) return false;
  const time = new Date(at).getTime();
  if (Number.isNaN(time)) return false;
  const now = Date.now();
  if (timeFilter === "today") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return time >= start.getTime();
  }
  const days = timeFilter === "week" ? 7 : 30;
  return time >= now - days * 86_400_000;
}

const KIND_LABELS: Record<DraftItem["kind"], string> = {
  post: "Post",
  reply: "Reply",
  repost: "Repost",
  dm: "DM",
  article: "Article",
  block: "Block",
  mute: "Mute",
  follow: "Follow",
  like: "Like",
  bookmark: "Bookmark",
};

const DRAFT_STATUS_STYLES: Record<DraftStatus, string> = {
  draft: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-700",
  published: "bg-blue-100 text-blue-800",
  failed: "bg-red-100 text-red-700",
  archived: "bg-wash text-muted",
};

const RUN_DOT_STYLES: Record<RunStatus, string> = {
  queued: "bg-line",
  running: "bg-blue",
  succeeded: "bg-emerald-500",
  failed: "bg-red-500",
  cancelled: "bg-line",
};

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function PopoverShell({ label, onOpen, trigger, panel }: { label: string; onOpen?: () => void; trigger: (api: { open: boolean; toggle: () => void; close: () => void }) => React.ReactNode; panel: (api: { close: () => void }) => React.ReactNode }) {
  const { open, closeMenu, toggleMenu, containerRef } = useDropdown();
  return (
    <div ref={containerRef} className="relative">
      {trigger({
        open,
        toggle: () => {
          if (!open) onOpen?.();
          toggleMenu();
        },
        close: closeMenu,
      })}
      {open ? (
        <div
          role="dialog"
          aria-label={label}
          className="absolute bottom-full left-0 z-30 mb-2 w-72 max-w-[calc(100vw-3rem)] rounded-2xl border border-line bg-white p-4 shadow-xl"
        >
          {panel({ close: closeMenu })}
        </div>
      ) : null}
    </div>
  );
}

function CommentThread({ comments, isLoading, value, onChange, onSend, isSending }: { comments: { id: string; body: string; createdAt: string }[]; isLoading: boolean; value: string; onChange: (next: string) => void; onSend: () => void; isSending: boolean }) {
  return (
    <div>
      {isLoading ? (
        <p className="text-xs text-muted">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="text-xs leading-5 text-muted">No comments yet — leave the first note for yourself or the record.</p>
      ) : (
        <ul className="max-h-56 space-y-2.5 overflow-y-auto">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-xl bg-wash px-3 py-2.5">
              <p className="text-xs leading-5">{comment.body}</p>
              <p className="mt-1 text-[0.65rem] tabular-nums text-muted">{formatDateTime(comment.createdAt)}</p>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex gap-2">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSend();
            }
          }}
          maxLength={2000}
          placeholder="Add a comment…"
          aria-label="Add a comment"
          className="min-w-0 flex-1 rounded-xl border border-line bg-white px-3 py-2 text-xs outline-none transition focus:border-blue focus:ring-2 focus:ring-blue/10"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={isSending || !value.trim()}
          className="shrink-0 rounded-xl bg-ink px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-ink-soft disabled:opacity-40"
        >
          Post
        </button>
      </div>
    </div>
  );
}

function IconAction({ label, onClick, hoverClass, alwaysVisible, bare, children }: { label: string; onClick: () => void; hoverClass: string; alwaysVisible?: boolean; bare?: boolean; children: React.ReactNode }) {
  return (
    <Tooltip label={label} placement="top">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={
          bare
            ? `grid size-8 place-items-center rounded-lg text-muted transition-colors motion-reduce:transition-none ${hoverClass}`
            : `grid size-9 place-items-center rounded-xl border border-line bg-white text-muted transition-all motion-reduce:transition-none ${alwaysVisible ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"} ${hoverClass}`
        }
      >
        {children}
      </button>
    </Tooltip>
  );
}

function WorkflowActivitiesPage() {
  const { workflowId } = Route.useParams();
  const { user } = useDashboard();
  const { toast } = useToast();
  const [workflow, setWorkflow] = useState<Deployment | null>(null);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [actingId, setActingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const [threadComments, setThreadComments] = useState<{ id: string; body: string; createdAt: string }[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [commentValue, setCommentValue] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);

  async function refresh() {
    const [workflowResult, runsResult, draftsResult] = await Promise.all([
      loadWorkflow({ ownerId: user.id, workflowId }),
      loadWorkflowRuns({ ownerId: user.id, workflowId }),
      loadDrafts({ ownerId: user.id, workflowId }),
    ]);
    setWorkflow(workflowResult.workflow);
    if (!runsResult.error) setRuns(runsResult.runs);
    if (draftsResult.error) {
      toast.error("Drafts couldn't be loaded.", { description: draftsResult.error });
    } else {
      setDrafts(draftsResult.drafts);
    }
  }

  useEffect(() => {
    setIsLoading(true);
    void refresh().finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, workflowId]);

  const needsReviewCount = drafts.filter((draft) => draft.status === "draft").length;

  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  type ActivityGroup = { key: string; at: string; run: WorkflowRun | null; drafts: DraftItem[] };

  const groups = useMemo(() => {
    const byRun = new Map<string, DraftItem[]>();
    const orphans: DraftItem[] = [];
    for (const draft of drafts) {
      if (draft.runId && runs.some((run) => run.id === draft.runId)) {
        const list = byRun.get(draft.runId) ?? [];
        list.push(draft);
        byRun.set(draft.runId, list);
      } else {
        orphans.push(draft);
      }
    }
    const result: ActivityGroup[] = [];
    const groupAt = (run: WorkflowRun | null, groupDrafts: DraftItem[]) =>
      [run?.startedAt ?? "", ...groupDrafts.map((draft) => draft.createdAt)]
        .map((value) => +new Date(value || 0))
        .reduce((max, time) => Math.max(max, Number.isNaN(time) ? 0 : time), 0);

    if (filter !== "drafts") {
      for (const run of runs) {
        const groupDrafts = (byRun.get(run.id) ?? []).filter(
          (draft) => (filter !== "review" || draft.status === "draft") && matchesTimeFilter(draft.createdAt, timeFilter),
        );
        if (filter === "review" && groupDrafts.length === 0) continue;
        const at = new Date(groupAt(run, groupDrafts)).toISOString();
        if (!matchesTimeFilter(run.startedAt ?? "", timeFilter) && groupDrafts.length === 0) continue;
        if (filter === "runs" || groupDrafts.length > 0 || matchesTimeFilter(run.startedAt ?? "", timeFilter)) {
          result.push({ key: `run-${run.id}`, at, run, drafts: filter === "runs" ? [] : groupDrafts });
        }
      }
    }
    if (filter !== "runs") {
      for (const draft of orphans) {
        if (filter === "review" && draft.status !== "draft") continue;
        if (!matchesTimeFilter(draft.createdAt, timeFilter)) continue;
        result.push({ key: `draft-${draft.id}`, at: draft.createdAt, run: null, drafts: [draft] });
      }
    }
    return result.sort((a, b) => +new Date(b.at || 0) - +new Date(a.at || 0));
  }, [runs, drafts, filter, timeFilter]);

  async function handleReview(draft: DraftItem, action: DraftReviewAction) {
    if (actingId) return;
    setActingId(draft.id);
    try {
      const { error } = await reviewDraft({ ownerId: user.id, draft, action });
      if (error) {
        toast.error("Draft couldn't be updated.", { description: error });
        return;
      }
      toast.success(action === "approve" ? "Draft approved" : action === "reject" ? "Draft rejected" : "Draft updated");
      await refresh();
    } finally {
      setActingId(null);
    }
  }

  async function handleSaveEdit(draft: DraftItem): Promise<boolean> {
    if (actingId) return false;
    setActingId(draft.id);
    try {
      const { error } = await editDraftContent({ ownerId: user.id, draftId: draft.id, content: editValue });
      if (error) {
        toast.error("Draft couldn't be saved.", { description: error });
        return false;
      }
      toast.success("Draft updated");
      await refresh();
      return true;
    } finally {
      setActingId(null);
    }
  }

  async function handleLoadThread(draft: DraftItem) {
    setOpenThreadId(draft.id);
    setCommentValue("");
    setThreadLoading(true);
    try {
      const { comments, error } = await loadDraftComments({ ownerId: user.id, draftId: draft.id });
      if (error) {
        toast.error("Comments couldn't be loaded.", { description: error });
        setThreadComments([]);
        return;
      }
      setThreadComments(comments);
    } finally {
      setThreadLoading(false);
    }
  }

  async function handleSendComment(draft: DraftItem) {
    if (isCommenting || !commentValue.trim()) return;
    setIsCommenting(true);
    try {
      const { error } = await addDraftComment({ ownerId: user.id, draftId: draft.id, body: commentValue });
      if (error) {
        toast.error("Comment couldn't be posted.", { description: error });
        return;
      }
      setCommentValue("");
      const { comments } = await loadDraftComments({ ownerId: user.id, draftId: draft.id });
      setThreadComments(comments);
    } finally {
      setIsCommenting(false);
    }
  }

  return (
    <section className="min-h-screen bg-paper">
      <header className="sticky top-0 z-10 flex min-h-20 items-center gap-4 border-b border-line bg-paper px-5 sm:px-8">
        <Link to="/app/workflows" className="text-sm font-semibold text-muted transition-colors hover:text-ink">
          Workflows
        </Link>
        <span className="text-muted">/</span>
        {workflow ? (
          <Link
            to="/app/workflow/$workflowId"
            params={{ workflowId: workflow.id }}
            className="truncate text-sm font-semibold text-muted transition-colors hover:text-ink"
          >
            {workflow.name}
          </Link>
        ) : (
          <p className="truncate text-sm font-semibold text-muted">{workflowId}</p>
        )}
        <span className="text-muted">/</span>
        <p className="truncate text-sm font-semibold">Activities</p>
      </header>

      <section className="mx-auto max-w-3xl space-y-6 p-5 sm:p-8">
        <header>
          <p className="text-sm font-medium text-blue">Review inbox</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.07em]">Activity.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Every run and every draft from{workflow ? <> <span className="font-semibold text-ink">{workflow.name}</span></> : " this workflow"}, newest first.
            {needsReviewCount > 0 ? (
              <> <span className="font-semibold text-ink">{needsReviewCount} waiting</span> for your review.</>
            ) : (
              " Nothing waiting on you."
            )}
          </p>
          <Link
            to="/app/workflow/$workflowId"
            params={{ workflowId }}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-ink"
          >
            <ArrowLeftIcon /> Back to workflow
          </Link>
        </header>

        <div className="flex flex-wrap gap-2">
          <div className="inline-flex rounded-full border border-line bg-white p-1" role="group" aria-label="Filter activity">
            {FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                aria-pressed={filter === option.value}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${filter === option.value ? "bg-ink text-white" : "text-muted hover:text-ink"}`}
              >
                {option.label}
                {option.value === "review" && needsReviewCount > 0 ? (
                  <span className="ml-1.5 rounded-full bg-blue px-1.5 py-0.5 text-[0.65rem] font-bold tabular-nums text-white">
                    {needsReviewCount}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          <div className="inline-flex rounded-full border border-line bg-white p-1" role="group" aria-label="Filter by time">
            {TIME_FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTimeFilter(option.value)}
                aria-pressed={timeFilter === option.value}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${timeFilter === option.value ? "bg-blue text-white" : "text-muted hover:text-ink"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted">Loading activity…</p>
        ) : groups.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-line bg-white px-6 py-16 text-center">
            <h2 className="text-xl font-semibold tracking-[-0.04em]">
              {filter === "review" ? "Inbox zero" : "Nothing here yet"}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
              {filter === "review"
                ? "No drafts are waiting. New proposals from the agent will land here."
                : "Runs and drafts from this workflow will appear here with room to review each one."}
            </p>
          </section>
        ) : (
          <ol className="relative space-y-4 pl-8">
            <span aria-hidden="true" className="absolute bottom-4 left-[11px] top-4 w-px bg-line" />
            {groups.map((group) => {
              const openDraft = group.drafts.find((draft) => draft.status === "draft") ?? null;
              const firstDraft = group.drafts[0] ?? null;
              const expanded = expandedId === group.key;
              const dotClass = openDraft
                ? "bg-blue"
                : group.run
                  ? RUN_DOT_STYLES[group.run.status]
                  : firstDraft
                    ? firstDraft.status === "approved" || firstDraft.status === "published"
                      ? "bg-emerald-500"
                      : firstDraft.status === "failed"
                        ? "bg-red-500"
                        : "bg-line"
                    : "bg-line";
              return (
                <li key={group.key} className="group relative">
                  <span aria-hidden="true" className={`absolute -left-8 top-5 size-3 rounded-full ring-4 ring-paper ${dotClass}`} />
                  <article className={`relative rounded-3xl border bg-white p-5 transition-colors hover:border-ink/30 sm:px-6 sm:py-5 ${openDraft ? "border-blue/30" : "border-line"}`}>
                    <div className="flex flex-wrap items-center gap-2 pr-10">
                      {group.run ? <RunStatusDot status={group.run.status} /> : null}
                      {firstDraft ? (
                        <>
                          <span className="rounded-full bg-wash px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-muted">
                            {KIND_LABELS[firstDraft.kind]}
                          </span>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${DRAFT_STATUS_STYLES[firstDraft.status]}`}>
                            {firstDraft.status}
                          </span>
                          {group.drafts.length > 1 ? (
                            <span className="text-xs tabular-nums text-muted">+{group.drafts.length - 1} more</span>
                          ) : null}
                        </>
                      ) : null}
                      <span className="ml-auto text-xs tabular-nums text-muted">{formatDateTime(group.at)}</span>
                    </div>

                    {!expanded && firstDraft ? (
                      <p className="mt-3 truncate text-sm leading-6">
                        {firstDraft.content || <span className="text-muted">No text — expand for details.</span>}
                      </p>
                    ) : null}

                    {expanded ? (
                      <div className="mt-4 space-y-5">
                        {group.run?.resultSummary ? (
                          <p className="text-sm leading-6">{group.run.resultSummary}</p>
                        ) : null}
                        {group.run?.errorMessage ? (
                          <p className="text-xs leading-5 text-red-700">{group.run.errorMessage}</p>
                        ) : null}
                        {group.drafts.map((draft) => (
                          <section key={draft.id} aria-label={`${KIND_LABELS[draft.kind]} draft`} className={group.drafts.length > 1 ? "rounded-2xl bg-wash p-4" : undefined}>
                            {group.drafts.length > 1 ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-white px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-muted">
                                  {KIND_LABELS[draft.kind]}
                                </span>
                                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${DRAFT_STATUS_STYLES[draft.status]}`}>
                                  {draft.status}
                                </span>
                              </div>
                            ) : null}
                            <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
                              {draft.content || <span className="text-muted">No text — see action details.</span>}
                            </p>
                            {draft.reasoning ? (
                              <p className="mt-3 border-l-2 border-blue-soft pl-3 text-xs leading-5 text-muted">{draft.reasoning}</p>
                            ) : null}
                            {draft.errorMessage ? (
                              <p className="mt-2 text-xs leading-5 text-red-700">{draft.errorMessage}</p>
                            ) : null}
                            <div className="mt-3 flex items-center gap-1.5" aria-label="Draft actions">
                              {draft.status === "draft" ? (
                                <>
                                  <IconAction alwaysVisible label="Approve draft" onClick={() => void handleReview(draft, "approve")} hoverClass="hover:border-emerald-500 hover:text-emerald-600">
                                    <CheckIcon />
                                  </IconAction>
                                  <PopoverShell
                                    label="Edit draft"
                                    onOpen={() => setEditValue(draft.content)}
                                    trigger={(api) => (
                                      <IconAction alwaysVisible label="Edit draft" onClick={api.toggle} hoverClass="hover:border-blue hover:text-blue">
                                        <PencilIcon />
                                      </IconAction>
                                    )}
                                    panel={(api) => (
                                      <div>
                                        <label className="block">
                                          <span className="text-xs font-semibold">Edit draft</span>
                                          <textarea
                                            value={editValue}
                                            onChange={(event) => setEditValue(event.target.value)}
                                            rows={4}
                                            maxLength={10000}
                                            autoFocus
                                            className="mt-1.5 w-full resize-y rounded-xl border border-line bg-wash px-3 py-2.5 text-xs leading-5 outline-none transition focus:border-blue focus:ring-2 focus:ring-blue/10"
                                          />
                                        </label>
                                        <div className="mt-3 flex gap-2">
                                          <span className="min-w-0 flex-1" aria-hidden="true" />
                                          <button
                                            type="button"
                                            onClick={api.close}
                                            className="rounded-xl px-3 py-2 text-xs font-semibold text-muted transition-colors hover:bg-wash hover:text-ink"
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              void (async () => {
                                                const ok = await handleSaveEdit(draft);
                                                if (ok) api.close();
                                              })();
                                            }}
                                            disabled={actingId === draft.id}
                                            className="shrink-0 rounded-xl bg-ink px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-ink-soft disabled:opacity-40"
                                          >
                                            Save
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  />
                                  <PopoverShell
                                    label="Comments"
                                    onOpen={() => void handleLoadThread(draft)}
                                    trigger={(api) => (
                                      <IconAction alwaysVisible label="Comment" onClick={api.toggle} hoverClass="hover:border-blue hover:text-blue">
                                        <MessageIcon />
                                      </IconAction>
                                    )}
                                    panel={() => (
                                      <CommentThread
                                        comments={openThreadId === draft.id ? threadComments : []}
                                        isLoading={openThreadId === draft.id && threadLoading}
                                        value={openThreadId === draft.id ? commentValue : ""}
                                        onChange={setCommentValue}
                                        onSend={() => void handleSendComment(draft)}
                                        isSending={isCommenting}
                                      />
                                    )}
                                  />
                                  <IconAction alwaysVisible label="Reject draft" onClick={() => void handleReview(draft, "reject")} hoverClass="hover:border-red-500 hover:text-red-600">
                                    <CloseIcon />
                                  </IconAction>
                                </>
                              ) : (
                                <>
                                  <PopoverShell
                                    label="Comments"
                                    onOpen={() => void handleLoadThread(draft)}
                                    trigger={(api) => (
                                      <IconAction alwaysVisible label="Comment" onClick={api.toggle} hoverClass="hover:border-blue hover:text-blue">
                                        <MessageIcon />
                                      </IconAction>
                                    )}
                                    panel={() => (
                                      <CommentThread
                                        comments={openThreadId === draft.id ? threadComments : []}
                                        isLoading={openThreadId === draft.id && threadLoading}
                                        value={openThreadId === draft.id ? commentValue : ""}
                                        onChange={setCommentValue}
                                        onSend={() => void handleSendComment(draft)}
                                        isSending={isCommenting}
                                      />
                                    )}
                                  />
                                  {draft.status === "rejected" || draft.status === "archived" ? (
                                    <IconAction alwaysVisible label="Reopen draft" onClick={() => void handleReview(draft, "reopen")} hoverClass="hover:border-blue hover:text-blue">
                                      <ChevronRightIcon />
                                    </IconAction>
                                  ) : null}
                                </>
                              )}
                            </div>
                          </section>
                        ))}
                      </div>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : group.key)}
                      aria-expanded={expanded}
                      aria-label={expanded ? "Show less" : "Show more"}
                      className="absolute right-4 top-4 grid size-8 place-items-center rounded-xl text-muted transition-colors hover:bg-wash hover:text-ink"
                    >
                      <ChevronDownIcon />
                    </button>
                  </article>
                </li>
              );
            })}
          </ol>
        )}

        <p className="pb-4 text-center">
          <Link
            to="/app/workflow/$workflowId"
            params={{ workflowId }}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-ink"
          >
            <ArrowLeftIcon /> Back to workflow
          </Link>
        </p>
      </section>
    </section>
  );
}

function RunStatusDot({ status }: { status: RunStatus }) {
  const styles =
    status === "running"
      ? "bg-blue-soft text-blue-dark"
      : status === "succeeded"
        ? "bg-emerald-100 text-emerald-800"
        : status === "failed"
          ? "bg-red-100 text-red-700"
          : status === "cancelled"
            ? "bg-wash text-muted"
            : "bg-wash text-muted";
  const label =
    status === "running" ? "Running" : status === "succeeded" ? "Succeeded" : status === "failed" ? "Failed" : status === "cancelled" ? "Cancelled" : "Queued";
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-bold ${styles}`}>
      {label}
    </span>
  );
}
