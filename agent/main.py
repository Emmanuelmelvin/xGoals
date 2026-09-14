import logging
import os
import sys
import time

from fastapi import FastAPI

from agent.providers import provider_status


logging.basicConfig(
    level=os.getenv("AI_LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    stream=sys.stdout,
    force=True,
)
logger = logging.getLogger("xgoal.agent")


# Canonical permission catalog. The web app mirrors this list when users
# grant permissions during goal creation (see PERMISSION_GROUPS in
# src/components/dashboard/goal-persistence.ts).
ALLOWED_PERMISSIONS = {
    "profile:read",
    "profile:update",
    "posts:read",
    "posts:draft:create",
    "posts:draft:update",
    "posts:draft:delete",
    "posts:create",
    "posts:delete",
    "mentions:read",
    "analytics:read",
    "search:read",
}


app = FastAPI(title="xGoal Agent", version="0.1.0")


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
