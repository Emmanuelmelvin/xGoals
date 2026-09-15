"""The 6 narrow tools: the ONLY way the model touches Supabase or spends.

Every tool runs as the `agent_writer` database role (least privilege, exactly
5 tables — see supabase/migrations/20260915000010_agent_writer_role.sql) over
a direct-Postgres connection. The model never sees credentials, connection
strings, or SQL.

Trust boundary: owner/goal/workflow/run IDs come from the JobContext built by
the dispatcher out of the trusted job payload — never from model arguments.
Every tool validates its inputs and raises ValueError with a retryable message
on bad input; Strands surfaces that back to the model.
"""

from __future__ import annotations

import logging
import os
import re
import uuid
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv
from strands import tool


PROJECT_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(PROJECT_ROOT / ".env.local", override=True)


logger = logging.getLogger(__name__)


# Adaptive draft kinds — mirrors the drafts table check constraint. New action
# kind = add the word here AND to the migration, nothing else changes.
DRAFT_KINDS = frozenset({"post", "reply", "repost", "dm", "article", "block", "mute", "follow", "like", "bookmark"})

# Kinds whose human words live in `content` (required, non-empty).
TEXT_KINDS = frozenset({"post", "reply", "dm", "article"})

NOTIFICATION_KINDS = frozenset({"draft_ready", "run_succeeded", "run_failed", "milestone", "credits_low", "workflow_completed", "info"})

RUN_RESULT_STATUSES = frozenset({"succeeded", "failed"})

_HANDLE_RE = re.compile(r"^[A-Za-z0-9_]{1,15}$")

MAX_CONTENT_CHARS = 10_000
MAX_REASONING_CHARS = 4_000
MAX_TITLE_CHARS = 160
MAX_BODY_CHARS = 2_000
MAX_LINK_CHARS = 500
MAX_NOTE_CHARS = 280
MAX_FEEDBACK_ITEMS = 20


def _db_url() -> str:
    url = os.getenv("AGENT_DATABASE_URL", "").strip()
    if not url:
        raise RuntimeError("AGENT_DATABASE_URL is required (agent_writer connection string from Secrets Manager).")
    return url


def _connect():
    import psycopg
    from psycopg.rows import dict_row

    return psycopg.connect(_db_url(), row_factory=dict_row)


def _as_uuid(value: str, name: str) -> str:
    try:
        return str(uuid.UUID(str(value)))
    except (ValueError, AttributeError, TypeError):
        raise ValueError(f"{name} must be a valid UUID.") from None


@dataclass(frozen=True)
class JobContext:
    """Trusted job envelope. Built by the dispatcher, never by the model."""

    owner_id: str
    goal_id: str
    workflow_id: str
    run_id: str
    goal_title: str = ""
    goal_prompt: str = ""
    skills: tuple = ()
    permissions: tuple = ()

    def __post_init__(self) -> None:
        object.__setattr__(self, "owner_id", _as_uuid(self.owner_id, "owner_id"))
        object.__setattr__(self, "goal_id", _as_uuid(self.goal_id, "goal_id"))
        object.__setattr__(self, "workflow_id", _as_uuid(self.workflow_id, "workflow_id"))
        object.__setattr__(self, "run_id", _as_uuid(self.run_id, "run_id"))


def _clean_handle(raw: str) -> str:
    handle = (raw or "").strip().lstrip("@")
    if not _HANDLE_RE.match(handle):
        raise ValueError("target_handle must be a valid X handle (letters, numbers, underscore, max 15 chars, no @).")
    return handle


def build_tools(job: JobContext) -> list:
    """Create the 6 tools bound to one trusted job. The model gets these and nothing else."""

    @tool
    def load_job_context() -> dict:
        """Read your current job: goal, milestones with completion state, skills, granted permissions, credit balance, workflow status. Call first, and re-call if you need fresh progress."""
        with _connect() as conn, conn.cursor() as cur:
            cur.execute(
                "select status, definition from public.workflows where id = %s",
                (job.workflow_id,),
            )
            workflow = cur.fetchone()
            if workflow is None:
                raise ValueError("Workflow not found. Stop this run and report it.")
            cur.execute(
                "select coalesce(sum(amount), 0) as balance from public.credit_ledger where owner_id = %s",
                (job.owner_id,),
            )
            balance = (cur.fetchone() or {}).get("balance", 0) or 0

        definition = workflow.get("definition") or {}
        if not isinstance(definition, dict):
            definition = {}
        raw_milestones = definition.get("milestones") or []
        milestones = [
            {"title": str(m.get("title", "")), "completed": bool(m.get("completed", False))}
            for m in raw_milestones
            if isinstance(m, dict) and str(m.get("title", "")).strip()
        ]
        return {
            "goal_title": job.goal_title,
            "goal_prompt": job.goal_prompt,
            "skills": [dict(s) for s in job.skills if isinstance(s, dict)],
            "granted_permissions": list(job.permissions),
            "milestones": milestones,
            "workflow_status": workflow.get("status"),
            "credit_balance": int(balance),
        }

    @tool
    def save_draft(kind: str, content: str = "", target_handle: str = "", target_post_id: str = "", article_title: str = "", reasoning: str = "") -> dict:
        """Save one draft for HUMAN REVIEW. You cannot publish — approval happens outside this run. Text kinds (post, reply, dm, article) need content; action kinds (block, mute, follow) need target_handle; reply/repost/like/bookmark need target_post_id."""
        kind = (kind or "").strip().lower()
        if kind not in DRAFT_KINDS:
            raise ValueError(f"kind must be one of: {', '.join(sorted(DRAFT_KINDS))}.")
        content = (content or "").strip()
        if kind in TEXT_KINDS and not content:
            raise ValueError(f"A {kind} draft needs content (the human words).")
        if len(content) > MAX_CONTENT_CHARS:
            raise ValueError(f"content is too long ({len(content)} chars, max {MAX_CONTENT_CHARS}). Shorten it.")
        if len(reasoning or "") > MAX_REASONING_CHARS:
            raise ValueError(f"reasoning is too long (max {MAX_REASONING_CHARS} chars). Shorten it.")

        payload: dict = {}
        if kind in ("block", "mute", "follow", "dm"):
            payload["target_handle"] = _clean_handle(target_handle)
        if kind in ("reply", "repost", "like", "bookmark"):
            post_id = (target_post_id or "").strip()
            if not post_id:
                raise ValueError(f"A {kind} draft needs target_post_id (the post it acts on).")
            payload["target_post_id"] = post_id[:128]
        if kind == "article":
            title = (article_title or "").strip()
            if not title:
                raise ValueError("An article draft needs article_title.")
            payload["article_title"] = title[:160]

        import json

        with _connect() as conn, conn.cursor() as cur:
            cur.execute(
                """
                insert into public.drafts
                  (owner_id, goal_id, workflow_id, run_id, kind, status, content, payload, agent_reasoning)
                values (%s, %s, %s, %s, %s, 'draft', %s, %s::jsonb, %s)
                returning id
                """,
                (job.owner_id, job.goal_id, job.workflow_id, job.run_id, kind, content, json.dumps(payload), (reasoning or "").strip()),
            )
            row = cur.fetchone()
            conn.commit()
        logger.info("draft_saved kind=%s workflow=%s", kind, job.workflow_id)
        return {"id": str(row["id"]), "kind": kind, "status": "draft"}

    @tool
    def complete_milestone(index: int, completed: bool = True) -> dict:
        """Check off one workflow milestone by its 0-based index from load_job_context. The goal's own list is untouched — progress lives on the run."""
        with _connect() as conn, conn.cursor() as cur:
            cur.execute(
                "select definition from public.workflows where id = %s",
                (job.workflow_id,),
            )
            row = cur.fetchone()
            if row is None:
                raise ValueError("Workflow not found. Stop this run and report it.")
            definition = row.get("definition") or {}
            if not isinstance(definition, dict):
                definition = {}
            milestones = [m for m in (definition.get("milestones") or []) if isinstance(m, dict)]
            if not isinstance(index, int) or isinstance(index, bool) or index < 0 or index >= len(milestones):
                raise ValueError(f"index must be 0–{len(milestones) - 1} for this run's {len(milestones)} milestones.")
            milestones[index] = {**milestones[index], "completed": bool(completed)}
            definition = {**definition, "milestones": milestones}

            import json

            cur.execute(
                "update public.workflows set definition = %s::jsonb where id = %s",
                (json.dumps(definition), job.workflow_id),
            )
            conn.commit()

        done = sum(1 for m in milestones if m.get("completed"))
        logger.info("milestone_updated index=%s completed=%s workflow=%s", index, completed, job.workflow_id)
        return {"done": done, "total": len(milestones)}

    @tool
    def record_run_result(status: str, summary: str) -> dict:
        """Close this run: status 'succeeded' or 'failed', plus a short human-readable summary of what you tried and made (max 4000 chars). Call once, at the end."""
        status = (status or "").strip().lower()
        if status not in RUN_RESULT_STATUSES:
            raise ValueError("status must be 'succeeded' or 'failed'.")
        summary = (summary or "").strip()
        if not summary:
            raise ValueError("summary is required — the user sees why, not just what.")
        if len(summary) > MAX_REASONING_CHARS:
            raise ValueError(f"summary is too long (max {MAX_REASONING_CHARS} chars). Shorten it.")

        with _connect() as conn, conn.cursor() as cur:
            cur.execute(
                """
                update public.workflow_runs
                set status = %s, finished_at = timezone('utc', now()),
                    result_summary = %s, error_message = case when %s = 'failed' then %s else error_message end
                where id = %s
                """,
                (status, summary, status, summary, job.run_id),
            )
            if cur.rowcount == 0:
                raise ValueError("Run row not found. Stop and report it.")
            conn.commit()
        logger.info("run_closed status=%s run=%s", status, job.run_id)
        return {"status": status}

    @tool
    def send_notification(kind: str, title: str, body: str = "", link: str = "") -> dict:
        """Tell the user something happened (draft ready, run finished, milestone hit, credits low). Purely informational — it triggers nothing. Link must be an in-app path starting with / or empty."""
        kind = (kind or "").strip().lower()
        if kind not in NOTIFICATION_KINDS:
            raise ValueError(f"kind must be one of: {', '.join(sorted(NOTIFICATION_KINDS))}.")
        title = (title or "").strip()
        if not title or len(title) > MAX_TITLE_CHARS:
            raise ValueError(f"title is required (1–{MAX_TITLE_CHARS} chars).")
        body = (body or "").strip()
        if len(body) > MAX_BODY_CHARS:
            raise ValueError(f"body is too long (max {MAX_BODY_CHARS} chars). Shorten it.")
        link = (link or "").strip() or None
        if link is not None and (len(link) > MAX_LINK_CHARS or not link.startswith("/")):
            raise ValueError("link must be an in-app path starting with / (max 500 chars), or empty.")

        with _connect() as conn, conn.cursor() as cur:
            cur.execute(
                "insert into public.notifications (owner_id, kind, title, body, link) values (%s, %s, %s, %s, %s) returning id",
                (job.owner_id, kind, title, body, link),
            )
            row = cur.fetchone()
            conn.commit()
        return {"id": str(row["id"]), "kind": kind}

    @tool
    def log_credit_spend(amount: int, note: str = "") -> dict:
        """Log the cost of this run against the owner's balance (default 1 credit per run). Fails when the balance is too low — treat that as 'stop and notify credits_low'."""
        if isinstance(amount, bool) or not isinstance(amount, int) or amount <= 0:
            raise ValueError("amount must be a positive whole number of credits.")
        note = (note or "").strip()[:MAX_NOTE_CHARS]

        with _connect() as conn, conn.cursor() as cur:
            cur.execute(
                "select coalesce(sum(amount), 0) as balance from public.credit_ledger where owner_id = %s",
                (job.owner_id,),
            )
            balance = int((cur.fetchone() or {}).get("balance", 0) or 0)
            if balance < amount:
                raise ValueError(f"Insufficient credits (balance {balance}, need {amount}). Stop and send a credits_low notification.")
            event_id = f"spend_{uuid.uuid4().hex}"
            cur.execute(
                "insert into public.credit_ledger (owner_id, amount, kind, event_id, note) values (%s, %s, 'spend', %s, %s)",
                (job.owner_id, -amount, event_id, note or None),
            )
            conn.commit()
        logger.info("credit_spent amount=%s owner=%s", amount, job.owner_id)
        return {"spent": amount, "balance": balance - amount}

    @tool
    def read_feedback(limit: int = 10) -> dict:
        """Read the owner's recent comments across this workflow's drafts — steering input for THIS run ('too formal', 'more like #3'). Feedback overrides house style; quote which note you honored in your run summary."""
        if isinstance(limit, bool) or not isinstance(limit, int) or limit < 1 or limit > MAX_FEEDBACK_ITEMS:
            raise ValueError(f"limit must be 1–{MAX_FEEDBACK_ITEMS}.")

        with _connect() as conn, conn.cursor() as cur:
            cur.execute(
                """
                select c.body as body, c.created_at as created_at, d.kind as kind
                from public.draft_comments as c
                join public.drafts as d on d.id = c.draft_id
                where d.workflow_id = %s and d.owner_id = %s
                order by c.created_at desc
                limit %s
                """,
                (job.workflow_id, job.owner_id, limit),
            )
            rows = cur.fetchmany(limit) if hasattr(cur, "fetchmany") else (cur.fetchall() or [])[:limit]
            notes = [
                {
                    "body": str(row.get("body", ""))[:MAX_BODY_CHARS],
                    "on": row.get("kind"),
                    "at": row.get("created_at"),
                }
                for row in (rows or [])
            ]
        logger.info("feedback_read count=%s workflow=%s", len(notes), job.workflow_id)
        return {"notes": notes}

    return [load_job_context, save_draft, complete_milestone, record_run_result, send_notification, log_credit_spend, read_feedback]


TOOL_NAMES = ("load_job_context", "save_draft", "complete_milestone", "record_run_result", "send_notification", "log_credit_spend", "read_feedback")
