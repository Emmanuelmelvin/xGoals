import asyncio
import logging
import os
import sys
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI
from pydantic import BaseModel

from agent.providers import provider_status


logging.basicConfig(
    level=os.getenv("AI_LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    stream=sys.stdout,
    force=True,
)
logger = logging.getLogger("xgoal.agent")


# Canonical permission catalog: the draftable X API OAuth 2.0 scopes, per
# https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code
# (`offline.access` is intentionally excluded: it governs the X connection
# itself, not an individual goal.) The web app mirrors this list when users
# grant permissions during goal creation (see PERMISSION_GROUPS in
# src/components/dashboard/goal-persistence.ts).
ALLOWED_PERMISSIONS = {
    "users.read",
    "users.email",
    "follows.read",
    "mute.read",
    "block.read",
    "tweet.read",
    "like.read",
    "bookmark.read",
    "list.read",
    "space.read",
    "broadcast.read",
    "dm.read",
    "tweet.write",
    "tweet.moderate.write",
    "like.write",
    "follows.write",
    "dm.write",
    "list.write",
    "media.write",
    "broadcast.write",
    "block.write",
    "mute.write",
    "bookmark.write",
}


app = FastAPI(title="xGoal Agent", version="0.1.0")


async def _poll_loop() -> None:
    # Regular heartbeat: claim one due run per tick so feedback and scheduled
    # work get picked up without manual POSTs. Empty ticks cost nothing
    # (no claim = no spend). Manual POST /invocations still works — the
    # atomic claim means a poll tick and a manual call can never double-run.
    interval = float(os.getenv("AGENT_POLL_INTERVAL_SEC", "60"))
    while True:
        try:
            from agent.dispatcher import claim_next
            from agent.runner import execute_run

            job, _envelope = await asyncio.to_thread(claim_next, None)
            if job is not None:
                result = await asyncio.to_thread(execute_run, job)
                logger.info("poll_run finished status=%s run=%s", result.get("status"), job.run_id)
        except Exception:
            logger.exception("poll_tick_failed")
        await asyncio.sleep(max(interval, 5))


@asynccontextmanager
async def _lifespan(_app: FastAPI):
    task: asyncio.Task | None = None
    if os.getenv("AGENT_POLL_ENABLED", "true").strip().lower() not in ("0", "false", "no", "off"):
        task = asyncio.create_task(_poll_loop())
        logger.info("poll_loop started interval=%ss", os.getenv("AGENT_POLL_INTERVAL_SEC", "60"))
    yield
    if task is not None:
        task.cancel()


app.router.lifespan_context = _lifespan


@app.middleware("http")
async def request_logging_middleware(request, call_next):
    started_at = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        logger.exception("request_failed method=%s path=%s", request.method, request.url.path)
        raise
    elapsed_ms = (time.perf_counter() - started_at) * 1000
    logger.info(
        "request method=%s path=%s status=%s duration_ms=%.1f",
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
    )
    return response


@app.get("/health")
def health() -> dict[str, str]:
    status = {"status": "ok", **provider_status()}
    logger.info("health provider=%s model=%s", status["provider"], status["model"])
    return status


@app.get("/ping")
def ping() -> dict[str, str]:
    # AgentCore Runtime HTTP contract. Keep /health for humans, /ping for the platform.
    return {"status": "Healthy"}


class InvocationRequest(BaseModel):
    workflow_id: str | None = None


@app.post("/invocations")
def invoke(request: InvocationRequest) -> dict:
    # v1: claim one due run, execute the deterministic placeholder flow.
    # The real brain (Strands agent over the 6 tools) slots in here next.
    from agent.dispatcher import claim_next
    from agent.runner import execute_run

    job, _envelope = claim_next(request.workflow_id)
    if job is None:
        return {"status": "empty", "detail": "No due workflows."}
    return execute_run(job)
