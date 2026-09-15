"""Run handler, v1: deterministic placeholder flow, zero AI cost.

Calls the SAME tool functions the model will call later (imported from
agent.tools, not reimplemented), so the Supabase write-path is proven before
we spend a cent on tokens. The Strands agent + permission-scoped prompt lands
in the next step (the real brain) and reuses these tools unchanged.
"""

from __future__ import annotations

import logging

from agent.tools import JobContext, build_tools


logger = logging.getLogger(__name__)

PLACEHOLDER_REASONING = "Placeholder run — the real brain lands next. Approve nothing from this run."


def execute_run(job: JobContext) -> dict:
    """Run one claimed job end to end. Returns ids for the response."""
    tools = {fn.__name__: fn for fn in build_tools(job)}
    context = tools["load_job_context"]()
    result: dict = {"run_id": job.run_id, "workflow_id": job.workflow_id}

    try:
        feedback = tools["read_feedback"]()
        feedback_count = len((feedback or {}).get("notes") or [])
        balance = tools["log_credit_spend"](amount=1, note=f"run {job.run_id[:8]}")

        milestones = context.get("milestones") or []
        pending = next((m for m in milestones if not m.get("completed")), None)
        angle = (pending or {}).get("title") or (job.goal_title or "this goal")

        draft = tools["save_draft"](
            kind="post",
            content=f"[Placeholder] Draft angle for: {angle}",
            reasoning=PLACEHOLDER_REASONING,
        )
        tools["send_notification"](
            kind="draft_ready",
            title="A draft is ready for review",
            body=f"From run {job.run_id[:8]} — placeholder content, approve nothing yet.",
            link=f"/app/workflow/{job.workflow_id}",
        )
        tools["record_run_result"](
            status="succeeded",
            summary=f"Tried 1 angle, drafted 1 placeholder post. Read {feedback_count} feedback notes. {balance['balance']} credits left. {PLACEHOLDER_REASONING}",
        )
        result.update({"status": "succeeded", "draft_id": draft["id"], "balance": balance["balance"]})
        logger.info("run_ok run=%s draft=%s", job.run_id, draft["id"])
        return result
    except ValueError as exc:
        message = str(exc)
        logger.warning("run_stopped run=%s reason=%s", job.run_id, message)
        try:
            if "Insufficient credits" in message:
                tools["send_notification"](
                    kind="credits_low",
                    title="Out of credits",
                    body="This run stopped before spending. Top up to keep workflows moving.",
                    link="/app/credits",
                )
            else:
                tools["send_notification"](
                    kind="run_failed",
                    title="A run needs attention",
                    body=message[:500],
                    link=f"/app/workflow/{job.workflow_id}",
                )
            tools["record_run_result"](status="failed", summary=message[:4000])
        except ValueError as inner:
            logger.error("run_close_failed run=%s reason=%s", job.run_id, inner)
        result.update({"status": "failed", "error": message})
        return result
