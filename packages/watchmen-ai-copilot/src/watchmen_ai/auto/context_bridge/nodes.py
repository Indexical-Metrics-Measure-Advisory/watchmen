"""LangGraph node implementations for context refresh and load operations."""

import logging
from datetime import datetime
from typing import Optional

from watchmen_ai.auto.context_bridge.bridge import WatchmenDataBridge
from watchmen_ai.auto.context_bridge.cache import ContextCache, InMemoryContextCache
from watchmen_ai.auto.context_bridge.formatter import ContextFormatter
from watchmen_ai.auto.context_bridge.models import WatchmenContextBundle
from watchmen_ai.auto.context_bridge.state import OCPAgentState

logger = logging.getLogger(__name__)


def _get_cache(state: OCPAgentState) -> ContextCache:
    """Retrieve or instantiate a cache instance from state metadata."""
    # In production this could be pulled from a dependency-injection container
    return InMemoryContextCache()


def _cache_key(tenant_id: str, scope: str) -> str:
    return f"{tenant_id}:context:{scope}"


async def context_refresh_node(
    state: OCPAgentState,
    bridge: Optional[WatchmenDataBridge] = None,
) -> OCPAgentState:
    """Fetch full context from Watchmen APIs, format it, and update state.

    This node is intended to be wired into a LangGraph workflow as a
    conditional predecessor to worker nodes. It populates
    ``state["watchmen_context"]`` with fresh Markdown text.
    """
    if bridge is None:
        raise RuntimeError(
            "WatchmenDataBridge must be provided to context_refresh_node. "
            "Use functools.partial to inject it at graph build time."
        )

    logger.info("[context_refresh] fetching full context from Watchmen APIs")

    # 1. Fetch
    bundle = await bridge.fetch_full_context_async()

    # 2. Format
    formatter = ContextFormatter()
    full_text = formatter.format_full(bundle)

    # 3. Cache
    cache = _get_cache(state)
    tenant_id = "default"  # TODO: extract from auth principal in state
    cache_key = _cache_key(tenant_id, "full")
    cache.set(cache_key, full_text)

    # 4. Update state
    watchmen_context = {
        "ontology_text": formatter.format_ontology(bundle.ontology) if bundle.ontology else "",
        "ontology_yaml": bundle.ontology_yaml or "",
        "topics_text": formatter.format_topics(bundle.topics) if bundle.topics else "",
        "pipelines_text": formatter.format_pipelines(bundle.pipelines) if bundle.pipelines else "",
        "dqc_text": formatter.format_dqc_rules(bundle.dqc_rules) if bundle.dqc_rules else "",
        "last_refreshed_at": datetime.utcnow().isoformat(),
        "cache_hit": False,
    }

    logger.info(
        "[context_refresh] complete — topics=%d pipelines=%d dqc_rules=%d",
        len(bundle.topics),
        len(bundle.pipelines),
        len(bundle.dqc_rules),
    )

    return {
        **state,
        "watchmen_context": watchmen_context,
    }


async def context_load_node(
    state: OCPAgentState,
    scope: str,
    bridge: Optional[WatchmenDataBridge] = None,
) -> OCPAgentState:
    """Load a single context domain (e.g. ``"topics"``) into state.

    Used by the Supervisor when only a subset of context is required.
    """
    if bridge is None:
        raise RuntimeError("WatchmenDataBridge must be provided to context_load_node")

    logger.info("[context_load] loading scope=%s", scope)

    if scope == "topics":
        topics = await bridge.fetch_topics_async()
        text = ContextFormatter.format_topics(topics)
        state["watchmen_context"]["topics_text"] = text
    elif scope == "pipelines":
        pipelines = await bridge.fetch_pipelines_async()
        text = ContextFormatter.format_pipelines(pipelines)
        state["watchmen_context"]["pipelines_text"] = text
    elif scope == "dqc":
        rules = await bridge.fetch_dqc_rules_async()
        text = ContextFormatter.format_dqc_rules(rules)
        state["watchmen_context"]["dqc_text"] = text
    elif scope == "ontology":
        ontology = await bridge.fetch_ontology_async()
        text = ContextFormatter.format_ontology(ontology)
        state["watchmen_context"]["ontology_text"] = text
    else:
        logger.warning("[context_load] unknown scope=%s", scope)

    return state
