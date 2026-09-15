"""Dispatcher: claim ONE due run at a time via the atomic RPC.

Nothing here is visible to the model. The claim function (SECURITY DEFINER)
reads goals/permissions the agent role cannot see and returns a trusted job
envelope; this module turns it into a JobContext for the tools.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path

from dotenv import load_dotenv

from agent.tools import JobContext


PROJECT_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(PROJECT_ROOT / ".env.local", override=True)


logger = logging.getLogger(__name__)


def _db_url() -> str:
    url = os.getenv("AGENT_DATABASE_URL", "").strip()
    if not url:
        raise RuntimeError("AGENT_DATABASE_URL is required (agent_writer connection string from Secrets Manager).")
    return url


def _connect():
    import psycopg
    from psycopg.rows import dict_row

    return psycopg.connect(_db_url(), row_factory=dict_row)


def reap_stale(timeout: str = "10 minutes") -> int:
    """Best-effort reap of stuck runs. Returns count reaped. Never raises."""
    try:
        with _connect() as conn, conn.cursor() as cur:
            cur.execute("select public.reap_stale_runs(%s::interval) as n", (timeout,))
            row = cur.fetchone() or {}
            conn.commit()
            n = int(row.get("n") or 0)
            if n:
                logger.info("reaped_stale_runs count=%s timeout=%s", n, timeout)
            return n
    except Exception:
        logger.exception("reap_stale_failed")
        return 0


def claim_next(workflow_id: str | None = None):
    """Claim the oldest due run (or one specific workflow). Returns (job, envelope) or (None, None)."""
    with _connect() as conn, conn.cursor() as cur:
        cur.execute("select public.claim_next_run(%s) as job", (workflow_id,))
        row = cur.fetchone()
        conn.commit()

    envelope = (row or {}).get("job")
    if not envelope:
        return None, None

    skills = envelope.get("skills") or []
    job = JobContext(
        owner_id=envelope["owner_id"],
        goal_id=envelope["goal_id"],
        workflow_id=envelope["workflow_id"],
        run_id=envelope["run_id"],
        goal_title=envelope.get("goal_title") or "",
        goal_prompt=envelope.get("goal_prompt") or "",
        skills=tuple(s for s in skills if isinstance(s, dict)),
        permissions=tuple(envelope.get("permissions") or []),
    )
    logger.info("claimed run=%s workflow=%s", job.run_id, job.workflow_id)
    return job, envelope
