"""LangGraph state definitions extended with Watchmen context fields."""

from typing import Annotated, List, Optional, TypedDict

from langgraph.graph.message import add_messages

from watchmen_ai.auto.core import AuditEvent, Proposal


class WatchmenContextState(TypedDict, total=False):
    """Sub-state that holds formatted text context from Watchmen Data Bridge."""

    ontology_text: str
    ontology_yaml: str
    topics_text: str
    pipelines_text: str
    dqc_text: str
    agent_state_text: str
    last_refreshed_at: Optional[str]
    cache_hit: bool


class OCPAgentState(TypedDict):
    """Full LangGraph state for Ontology Control Plane agents.

    Compatible with LangGraph's message-reduction pattern via ``add_messages``.
    """

    messages: Annotated[list, add_messages]
    watchmen_context: WatchmenContextState
    proposals: List[Proposal]
    pending_approval: bool
    audit_events: List[AuditEvent]
    last_worker: str
