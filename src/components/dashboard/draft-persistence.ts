import { createClient } from "../../lib/supabase/client";
import type { DraftComment, DraftItem, DraftKind, DraftStatus } from "./types";

function isDraftKind(value: unknown): value is DraftKind {
  return (
    value === "post" ||
    value === "reply" ||
    value === "repost" ||
    value === "dm" ||
    value === "article" ||
    value === "block" ||
    value === "mute" ||
    value === "follow" ||
    value === "like" ||
    value === "bookmark"
  );
}

function isDraftStatus(value: unknown): value is DraftStatus {
  return (
    value === "draft" ||
    value === "approved" ||
    value === "rejected" ||
    value === "published" ||
    value === "failed" ||
    value === "archived"
  );
}

function toDraft(row: {
  id: string;
  goal_id: string;
  workflow_id: string;
  run_id: unknown;
  kind: unknown;
  status: unknown;
  content: unknown;
  payload: unknown;
  agent_reasoning: unknown;
  error_message: unknown;
  created_at: unknown;
}): DraftItem {
  return {
    id: row.id,
    goalId: row.goal_id,
    workflowId: row.workflow_id,
    runId: typeof row.run_id === "string" ? row.run_id : null,
    kind: isDraftKind(row.kind) ? row.kind : "post",
    status: isDraftStatus(row.status) ? row.status : "draft",
    content: typeof row.content === "string" ? row.content : "",
    payload: typeof row.payload === "object" && row.payload !== null ? (row.payload as Record<string, unknown>) : {},
    reasoning: typeof row.agent_reasoning === "string" ? row.agent_reasoning : "",
    errorMessage: typeof row.error_message === "string" && row.error_message ? row.error_message : null,
    createdAt: typeof row.created_at === "string" ? row.created_at : "",
  };
}

export async function loadDrafts({ ownerId, workflowId }: { ownerId: string; workflowId: string }) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("drafts")
    .select("id,goal_id,workflow_id,run_id,kind,status,content,payload,agent_reasoning,error_message,created_at")
    .eq("owner_id", ownerId)
    .eq("workflow_id", workflowId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return { drafts: [] as DraftItem[], error: error.message };
  return { drafts: (data ?? []).map((row) => toDraft(row as Parameters<typeof toDraft>[0])), error: null as string | null };
}

export type DraftReviewAction = "approve" | "reject" | "archive" | "reopen";

const REVIEW_TRANSITIONS: Record<DraftReviewAction, { from: DraftStatus[]; to: DraftStatus }> = {
  approve: { from: ["draft"], to: "approved" },
  reject: { from: ["draft"], to: "rejected" },
  archive: { from: ["draft", "approved", "rejected", "published", "failed"], to: "archived" },
  reopen: { from: ["rejected", "archived"], to: "draft" },
};

/** Approve / reject / archive / reopen. Only approved rows may ever publish. */
export async function reviewDraft({ ownerId, draft, action }: { ownerId: string; draft: DraftItem; action: DraftReviewAction }) {
  const transition = REVIEW_TRANSITIONS[action];
  if (!transition.from.includes(draft.status)) {
    return { error: `A ${draft.status} draft can't be ${action}d.` };
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("drafts")
    .update({ status: transition.to })
    .eq("id", draft.id)
    .eq("owner_id", ownerId);

  if (error) return { error: error.message };
  return { error: null as string | null };
}

/** Edit the words. Stays a draft — editing never approves. */
export async function editDraftContent({ ownerId, draftId, content }: { ownerId: string; draftId: string; content: string }) {
  const clean = content.trim();
  if (!clean) return { error: "Draft text can't be empty." };
  if (clean.length > 10000) return { error: "Draft text is too long." };
  const supabase = createClient();
  const { error } = await supabase
    .from("drafts")
    .update({ content: clean })
    .eq("id", draftId)
    .eq("owner_id", ownerId);

  if (error) return { error: error.message };
  return { error: null as string | null };
}

export async function loadDraftComments({ ownerId, draftId }: { ownerId: string; draftId: string }) {
  const supabase = createClient();
  const { data: draft, error: draftError } = await supabase
    .from("drafts")
    .select("id")
    .eq("id", draftId)
    .eq("owner_id", ownerId)
    .single();
  if (draftError || !draft) return { comments: [] as DraftComment[], error: "Draft not found." };

  const { data, error } = await supabase
    .from("draft_comments")
    .select("id,draft_id,body,created_at")
    .eq("draft_id", draftId)
    .order("created_at", { ascending: true });

  if (error) return { comments: [] as DraftComment[], error: error.message };
  return {
    comments: (data ?? []).map((row) => ({
      id: row.id as string,
      draftId: row.draft_id as string,
      body: typeof row.body === "string" ? row.body : "",
      createdAt: typeof row.created_at === "string" ? row.created_at : "",
    })),
    error: null as string | null,
  };
}

export async function addDraftComment({ ownerId, draftId, body }: { ownerId: string; draftId: string; body: string }) {
  const clean = body.trim();
  if (!clean) return { error: "Write something first." };
  if (clean.length > 2000) return { error: "Keep comments under 2,000 characters." };
  const supabase = createClient();
  const { data: draft, error: draftError } = await supabase
    .from("drafts")
    .select("id")
    .eq("id", draftId)
    .eq("owner_id", ownerId)
    .single();
  if (draftError || !draft) return { error: "Draft not found." };

  const { error } = await supabase.from("draft_comments").insert({ draft_id: draftId, owner_id: ownerId, body: clean });
  if (error) return { error: error.message };
  return { error: null as string | null };
}
