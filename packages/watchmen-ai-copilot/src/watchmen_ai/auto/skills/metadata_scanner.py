"""Skill: Scan external metadata sources for ontology discovery."""

import logging
from typing import Any, Dict, List

logger = logging.getLogger(__name__)


class MetadataScanner:
    """Scans metadata sources (databases, topics, APIs) to discover potential
    new business objects for the ontology.

    Used by: OntologyArchitectAgent
    """

    def __init__(self, config: Dict[str, Any] | None = None):
        self.config = config or {}
        self._sources: List[Dict[str, Any]] = []
        self._demo_mode = config.get("demo_mode", True) if config else True

    def register_source(self, source_type: str, connection: Dict[str, Any]) -> None:
        """Register a metadata source to scan."""
        self._sources.append({"type": source_type, "connection": connection})

    def scan_tables(self) -> List[Dict[str, Any]]:
        """Scan registered sources for table definitions."""
        logger.info("Scanning tables from %d sources", len(self._sources))
        
        if self._demo_mode:
            # Return demo data for testing
            return self._get_demo_tables()
        
        # TODO: Implement actual scanning via watchmen-meta services
        tables = []
        for source in self._sources:
            if source["type"] == "database":
                # Scan database tables
                tables.extend(self._scan_database_tables(source["connection"]))
        return tables

    def scan_topics(self) -> List[Dict[str, Any]]:
        """Scan registered sources for topic definitions."""
        logger.info("Scanning topics from %d sources", len(self._sources))
        
        if self._demo_mode:
            # Return demo data for testing
            return self._get_demo_topics()
        
        # TODO: Implement actual scanning via watchmen-meta services
        topics = []
        for source in self._sources:
            if source["type"] == "kafka":
                # Scan Kafka topics
                topics.extend(self._scan_kafka_topics(source["connection"]))
        return topics

    def _get_demo_tables(self) -> List[Dict[str, Any]]:
        """Return demo table metadata for testing."""
        return [
            {
                "name": "customer_coupon",
                "schema": "public",
                "columns": [
                    {"name": "coupon_id", "type": "bigint"},
                    {"name": "customer_id", "type": "bigint"},
                    {"name": "coupon_code", "type": "varchar"},
                    {"name": "discount_amount", "type": "decimal"},
                    {"name": "created_at", "type": "timestamp"},
                ],
                "description": "Customer coupon usage records"
            },
            {
                "name": "coupon_campaign",
                "schema": "public",
                "columns": [
                    {"name": "campaign_id", "type": "bigint"},
                    {"name": "campaign_name", "type": "varchar"},
                    {"name": "start_date", "type": "date"},
                    {"name": "end_date", "type": "date"},
                    {"name": "budget", "type": "decimal"},
                ],
                "description": "Marketing coupon campaigns"
            },
            {
                "name": "coupon_redemption",
                "schema": "public",
                "columns": [
                    {"name": "redemption_id", "type": "bigint"},
                    {"name": "coupon_id", "type": "bigint"},
                    {"name": "order_id", "type": "bigint"},
                    {"name": "redeemed_at", "type": "timestamp"},
                ],
                "description": "Coupon redemption transactions"
            },
        ]

    def _get_demo_topics(self) -> List[Dict[str, Any]]:
        """Return demo topic metadata for testing."""
        return [
            {
                "name": "customer_events",
                "partitions": 3,
                "description": "Customer activity events stream"
            },
            {
                "name": "order_events",
                "partitions": 6,
                "description": "Order lifecycle events"
            },
        ]

    def _scan_database_tables(self, connection: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Scan database for table metadata."""
        # TODO: Implement actual database scanning
        return []

    def _scan_kafka_topics(self, connection: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Scan Kafka for topic metadata."""
        # TODO: Implement actual Kafka scanning
        return []
