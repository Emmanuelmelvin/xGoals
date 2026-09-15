"""Poll loop: the agent wakes itself, no manual POST needed.

Every AGENT_POLL_SECONDS the loop claims due runs (oldest first) and executes
them, up to MAX_CONCURRENT_RUNS at once. A comment left on any draft is picked
up by the next tick automatically — read_feedback() runs inside every
execution, so steering never needs a rerun.

Claims are quick and sequential; executions run concurrently (they hold the
LLM wait). Each tick drains up to `limit` runs, then sleeps.

Runs as a FastAPI lifespan task in main.py. EventBridge replaces this loop on
AgentCore; the claim RPC keeps both honest (SKIP LOCKED, one active run max).
"""

from __future__ import annotations

import asyncio
import logging
import os

from agent.dispatcher import claim_next
from agent.runner import execute_run


logger = logging.getLogger(__name__)


def _poll_seconds() -> int:
    try:
        return max(15, int(os.getenv("AGENT_POLL_SECONDS", "60")))
    except ValueError:
        return 60


def _max_concurrent() -> int:
    try:
        return max(1, min(10, int(os.getenv("MAX_CONCURRENT_RUNS", "3"))))
    except ValueError:
        return 3


async def _execute(job) -> None:
    try:
        result = await asyncio.to_thread(execute_run, job)
        logger.info("tick_run_done run=%s status=%s", job.run_id, result.get("status"))
    except Exception:
        logger.exception("run_crashed run=%s", job.run_id)


async def poll_forever(stop: asyncio.Event) -> None:
    interval = _poll_seconds()
    limit = _max_concurrent()
    logger.info("scheduler_start every=%ss max_concurrent=%s", interval, limit)

    while not stop.is_set():
        batch: set[asyncio.Task] = set()
        try:
            while len(batch) < limit and not stop.is_set():
                try:
                    job, _envelope = await asyncio.to_thread(claim_next, None)
                except Exception:
                    logger.exception("claim_failed")
                    break
                if job is None:
                    break
                batch.add(asyncio.create_task(_execute(job)))
            if batch:
                await asyncio.wait(batch)
        except Exception:
            logger.exception("tick_failed")
        try:
            await asyncio.wait_for(stop.wait(), timeout=interval)
        except asyncio.TimeoutError:
            continue
