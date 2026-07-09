"""Supervisor conditional routing for context freshness checks."""

import logging
from datetime import datetime, timedelta
from typing import Literal

from watchmen_ai.auto.context_bridge.state import OCPAgentState

logger = logging.getLogger(__name__)

DEFAULT_CONTEXT_TTL_SECONDS = 300


def route_by_context_freshness(state: OCPAgentState) -> Literal["refresh", "skip"]:
    """Determine whether context needs refreshing before invoking a worker.

    Returns ``"refresh"`` if the cached context is missing or older than the TTL.
    Returns ``"skip"`` if the context is still fresh.
    """
    ctx = state.get("watchmen_context", {})
    if not ctx:
        logger.debug("[context_supervisor] no context in state → refresh")
        return "refresh"

    last_refreshed = ctx.get("last_refreshed_at")
    if not last_refreshed:
        logger.debug("[context_supervisor] no last_refreshed_at → refresh")
        return "refresh"

    try:
        refreshed_dt = datetime.fromisoformat(last_refreshed)
    except ValueError:
        logger.warning("[context_supervisor] invalid last_refreshed_at format → refresh")
        return "refresh"

    if datetime.utcnow() - refreshed_dt > timedelta(seconds=DEFAULT_CONTEXT_TTL_SECONDS):
        logger.debug("[context_supervisor] context expired → refresh")
        return "refresh"

    logger.debug("[context_supervisor] context fresh → skip")
    return "skip"
