"""Watchmen Data Bridge — fetch, format, and cache Watchmen system context for LLM consumption.

This module provides:
  - WatchmenDataBridge: unified client for Watchmen REST APIs
  - ContextFormatter: converts model objects into LLM-readable Markdown text
  - InMemoryContextCache: TTL-based cache for context fragments
  - OCPAgentState: LangGraph TypedDict state extension
  - context_refresh_node / context_load_node: LangGraph node implementations
  - route_by_context_freshness: Supervisor conditional routing
"""

from watchmen_ai.auto.context_bridge.bridge import WatchmenDataBridge
from watchmen_ai.auto.context_bridge.cache import ContextCache, InMemoryContextCache
from watchmen_ai.auto.context_bridge.formatter import ContextFormatter
from watchmen_ai.auto.context_bridge.models import (
    DqcRuleContext,
    FactorContext,
    PipelineContext,
    TopicContext,
    WatchmenContextBundle,
)
from watchmen_ai.auto.context_bridge.nodes import context_refresh_node, context_load_node
from watchmen_ai.auto.context_bridge.state import OCPAgentState, WatchmenContextState
from watchmen_ai.auto.context_bridge.supervisor import route_by_context_freshness

__all__ = [
    "WatchmenDataBridge",
    "ContextCache",
    "InMemoryContextCache",
    "ContextFormatter",
    "DqcRuleContext",
    "FactorContext",
    "PipelineContext",
    "TopicContext",
    "WatchmenContextBundle",
    "context_refresh_node",
    "context_load_node",
    "OCPAgentState",
    "WatchmenContextState",
    "route_by_context_freshness",
]
