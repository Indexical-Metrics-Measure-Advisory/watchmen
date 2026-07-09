"""Formatters: convert Watchmen model objects into LLM-readable Markdown text."""

import logging
from typing import List, Optional

from watchmen_ai.auto.context_bridge.models import (
    DqcRuleContext,
    PipelineContext,
    TopicContext,
    WatchmenContextBundle,
)

logger = logging.getLogger(__name__)


class ContextFormatter:
    """Converts structured context models into Markdown text for LLM prompts."""

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    @classmethod
    def format_full(cls, bundle: WatchmenContextBundle, max_items: int = 50) -> str:
        """Format a complete context bundle into a single Markdown document."""
        parts: List[str] = []

        if bundle.ontology:
            parts.append(cls.format_ontology(bundle.ontology))

        if bundle.topics:
            parts.append(cls.format_topics(bundle.topics, max_items=max_items))

        if bundle.pipelines:
            parts.append(cls.format_pipelines(bundle.pipelines, max_items=max_items))

        if bundle.dqc_rules:
            parts.append(cls.format_dqc_rules(bundle.dqc_rules, max_items=max_items))

        parts.append(
            f"\n_Context fetched at {bundle.fetched_at.isoformat()}Z_"
        )
        return "\n\n".join(parts)

    @classmethod
    def format_ontology(cls, ontology: dict) -> str:
        """Format a serialized VirtualOntology dict as Markdown."""
        lines: List[str] = []
        lines.append(f"# Business Ontology: {ontology.get('name', 'Unnamed')}")
        if ontology.get('description'):
            lines.append(f"\n{ontology['description']}")
        lines.append(f"\n- Owner: {ontology.get('owner', 'N/A')}")
        lines.append(f"- Technical Owner: {ontology.get('technicalOwner', 'N/A')}")
        lines.append(f"- Sensitivity: {ontology.get('sensitivity', 'N/A')}")
        lines.append(f"- Tags: {', '.join(ontology.get('tags', []))}")

        virtual_objects = ontology.get('virtualObjects', [])
        if virtual_objects:
            lines.append(f"\n## Virtual Objects ({len(virtual_objects)})")
            for obj in virtual_objects:
                lines.append(f"\n### {obj.get('name', 'Unnamed')}")
                if obj.get('description'):
                    lines.append(f"{obj['description']}")
                for pt in obj.get('physicalTables', []):
                    lines.append(
                        f"- Table: {pt.get('topicName', 'N/A')} "
                        f"(alias={pt.get('alias', 'N/A')}, kind={pt.get('kind', 'N/A')})"
                    )
                    fields = pt.get('fields', [])
                    if fields:
                        lines.append(f"  - Fields: {', '.join(str(f) for f in fields)}")
                    filters = pt.get('filters', [])
                    if filters:
                        lines.append(f"  - Filters: {len(filters)} condition(s)")

        virtual_links = ontology.get('virtualLinks', [])
        if virtual_links:
            lines.append(f"\n## Virtual Links ({len(virtual_links)})")
            for link in virtual_links:
                lines.append(
                    f"- {link.get('name', 'Unnamed')}: "
                    f"{link.get('sourceObjectId', '?')} -> {link.get('targetObjectId', '?')} "
                    f"({link.get('joinType', 'inner')})"
                )

        return "\n".join(lines)

    @classmethod
    def format_topics(cls, topics: List[TopicContext], max_items: int = 50) -> str:
        """Format Topic / Factor definitions as Markdown."""
        lines: List[str] = [f"# Data Model (Topics & Factors) — {len(topics)} total"]
        display_topics = topics[:max_items]
        remainder = len(topics) - len(display_topics)

        for topic in display_topics:
            lines.append(f"\n## Topic: {topic.name or 'Unnamed'} (type={topic.type or 'N/A'}, kind={topic.kind or 'N/A'})")
            if topic.description:
                lines.append(f"Description: {topic.description}")
            if topic.factors:
                lines.append("Factors:")
                for factor in topic.factors:
                    factor_line = f"  - {factor.name or 'Unnamed'}: {factor.type or 'N/A'}"
                    if factor.label:
                        factor_line += f" (label={factor.label})"
                    if factor.description:
                        factor_line += f" — {factor.description}"
                    lines.append(factor_line)
            else:
                lines.append("  (no factors)")

        if remainder > 0:
            lines.append(f"\n... and {remainder} more topic(s)")

        return "\n".join(lines)

    @classmethod
    def format_pipelines(cls, pipelines: List[PipelineContext], max_items: int = 50) -> str:
        """Format Pipeline definitions as Markdown."""
        lines: List[str] = [f"# Data Pipelines — {len(pipelines)} total"]
        display_pipelines = pipelines[:max_items]
        remainder = len(pipelines) - len(display_pipelines)

        for pipeline in display_pipelines:
            lines.append(
                f"\n## Pipeline: {pipeline.name or 'Unnamed'} "
                f"(trigger={pipeline.trigger_type or 'N/A'}, enabled={pipeline.enabled})"
            )
            if pipeline.stages:
                lines.append("Stages:")
                for stage in pipeline.stages:
                    lines.append(f"  - {stage}")
            else:
                lines.append("  (no stages)")

        if remainder > 0:
            lines.append(f"\n... and {remainder} more pipeline(s)")

        return "\n".join(lines)

    @classmethod
    def format_dqc_rules(cls, rules: List[DqcRuleContext], max_items: int = 50) -> str:
        """Format DQC MonitorRules as Markdown."""
        lines: List[str] = [f"# Data Quality Rules — {len(rules)} total"]
        display_rules = rules[:max_items]
        remainder = len(rules) - len(display_rules)

        for rule in display_rules:
            target = f"{rule.topic_id or 'global'}.{rule.factor_id or '*'}" if rule.grade != 'global' else 'global'
            lines.append(
                f"\n- **{rule.code or 'Unnamed'}** on `{target}`"
            )
            lines.append(f"  - Grade: {rule.grade}, Severity: {rule.severity}, Enabled: {rule.enabled}")
            if rule.params:
                lines.append(f"  - Params: {rule.params}")

        if remainder > 0:
            lines.append(f"\n... and {remainder} more rule(s)")

        return "\n".join(lines)

    @classmethod
    def format_agent_state(
        cls,
        ontology_summary: dict,
        pending_proposals: List[dict],
        audit_events: List[dict],
        audit_limit: int = 10,
    ) -> str:
        """Format current agent runtime state as Markdown."""
        lines: List[str] = ["# Current Agent State"]
        node_count = ontology_summary.get('node_count', 0)
        relation_count = ontology_summary.get('relation_count', 0)
        lines.append(f"Business Ontology has {node_count} node(s) and {relation_count} relation(s).")

        pending = [p for p in pending_proposals if p.get('status') == 'PENDING']
        lines.append(f"\nPending Proposals: {len(pending)}")
        for p in pending[:10]:
            lines.append(
                f"  - [{p.get('agent_type', '?')}] {p.get('action', '?')} on {p.get('target_node_id', '?')}: "
                f"{p.get('rationale', 'N/A')}"
            )

        lines.append(f"\nRecent Audit Events (last {audit_limit}):")
        for event in audit_events[:audit_limit]:
            lines.append(
                f"  - {event.get('timestamp', '?')}: {event.get('action', '?')} by "
                f"{event.get('agent_type') or event.get('user_id', 'unknown')}"
            )

        return "\n".join(lines)
