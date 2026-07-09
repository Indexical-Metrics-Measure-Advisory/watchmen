"""Watchmen Data Bridge — REST API clients and unified context builder."""

import asyncio
import logging
from abc import ABC
from typing import Any, Dict, List, Optional

import requests

from watchmen_ai.auto.context_bridge.cache import ContextCache, InMemoryContextCache
from watchmen_ai.auto.context_bridge.models import (
    DqcRuleContext,
    FactorContext,
    PipelineContext,
    TopicContext,
    WatchmenContextBundle,
)

logger = logging.getLogger(__name__)


class WatchmenApiClient(ABC):
    """Base HTTP client for Watchmen internal REST APIs."""

    def __init__(
        self,
        base_url: str,
        auth_token: Optional[str] = None,
        timeout: int = 30,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.auth_token = auth_token
        self.timeout = timeout

    def _headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json", "Accept": "application/json"}
        if self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"
        return headers

    def _request(
        self,
        method: str,
        path: str,
        params: Optional[Dict[str, Any]] = None,
        json_data: Optional[Dict[str, Any]] = None,
    ) -> Any:
        url = f"{self.base_url}/{path.lstrip('/')}"
        try:
            response = requests.request(
                method=method,
                url=url,
                headers=self._headers(),
                params=params,
                json=json_data,
                timeout=self.timeout,
            )
            if response.status_code == 404:
                logger.warning("[api] 404 on %s — returning empty list", url)
                return []
            response.raise_for_status()
            if response.status_code == 204:
                return None
            content_type = response.headers.get("Content-Type", "")
            if "application/json" in content_type:
                return response.json()
            return response.text
        except requests.RequestException as e:
            logger.error("[api] request failed: %s %s — %s", method, url, e)
            return []


class TopicClient(WatchmenApiClient):
    """Client for watchmen-rest-doll Topic endpoints."""

    def fetch_all_topics(self) -> List[TopicContext]:
        """Fetch all topics. Falls back from YAML agent-view to standard JSON."""
        data = self._request("GET", "/topic/all/yaml/agent-view")
        if isinstance(data, str):
            # YAML response — for now return empty; YAML parsing can be added later
            logger.debug("[topic] received YAML response, length=%d", len(data))
            return []
        if isinstance(data, list):
            return [_topic_to_context(t) for t in data]
        return []

    def fetch_topic_by_name(self, name: str) -> Optional[TopicContext]:
        data = self._request("GET", "/topic/name/yaml/agent-view", params={"name": name})
        if isinstance(data, dict):
            return _topic_to_context(data)
        return None


class PipelineClient(WatchmenApiClient):
    """Client for watchmen-rest-doll Pipeline endpoints."""

    def fetch_all_pipelines(self) -> List[PipelineContext]:
        data = self._request("GET", "/pipeline/all/yaml/agent-view")
        if isinstance(data, str):
            logger.debug("[pipeline] received YAML response, length=%d", len(data))
            return []
        if isinstance(data, list):
            return [_pipeline_to_context(p) for p in data]
        return []

    def fetch_pipeline_by_name(self, name: str) -> Optional[PipelineContext]:
        data = self._request("GET", "/pipeline/name/yaml/agent-view", params={"name": name})
        if isinstance(data, dict):
            return _pipeline_to_context(data)
        return None


class DqcClient(WatchmenApiClient):
    """Client for watchmen-rest-dqc endpoints."""

    def fetch_monitor_rules(
        self,
        grade: Optional[str] = None,
        topic_id: Optional[str] = None,
    ) -> List[DqcRuleContext]:
        params: Dict[str, Any] = {}
        if grade:
            params["grade"] = grade
        if topic_id:
            params["topicId"] = topic_id
        data = self._request("GET", "/dqc/monitor/rules", params=params)
        if isinstance(data, list):
            return [_dqc_rule_to_context(r) for r in data]
        return []

    def fetch_catalogs(self) -> List[Dict[str, Any]]:
        data = self._request("GET", "/dqc/catalog")
        if isinstance(data, list):
            return data
        return []


class OntologyClient(WatchmenApiClient):
    """Client for watchmen-metricflow Ontology endpoints."""

    def fetch_all_ontologies(self) -> List[Dict[str, Any]]:
        data = self._request("GET", "/ontology/list")
        if isinstance(data, list):
            return data
        return []

    def fetch_ontology(self, ontology_id: str) -> Optional[Dict[str, Any]]:
        data = self._request("GET", "/ontology/get", params={"ontologyId": ontology_id})
        if isinstance(data, dict):
            return data
        return None

    def fetch_ontology_yaml(self, name: str) -> Optional[str]:
        data = self._request("GET", "/ontology/name/yaml/agent-view", params={"name": name})
        if isinstance(data, str):
            return data
        return None


class WatchmenDataBridge:
    """Unified facade that fetches and aggregates context from all Watchmen services.

    Provides both synchronous and asynchronous APIs so it can be used from:
      - SyncTaskQueue / BaseWorker (sync)
      - LangGraph async nodes (async)
    """

    def __init__(
        self,
        doll_url: str,
        metricflow_url: str,
        dqc_url: str,
        auth_token: Optional[str] = None,
        cache: Optional[ContextCache] = None,
        cache_ttl: int = 300,
    ) -> None:
        self.topic_client = TopicClient(doll_url, auth_token)
        self.pipeline_client = PipelineClient(doll_url, auth_token)
        self.dqc_client = DqcClient(dqc_url, auth_token)
        self.ontology_client = OntologyClient(metricflow_url, auth_token)
        self.cache = cache or InMemoryContextCache()
        self.cache_ttl = cache_ttl

    # ------------------------------------------------------------------
    # Synchronous API
    # ------------------------------------------------------------------

    def fetch_topics(self) -> List[TopicContext]:
        return self.topic_client.fetch_all_topics()

    def fetch_pipelines(self) -> List[PipelineContext]:
        return self.pipeline_client.fetch_all_pipelines()

    def fetch_dqc_rules(
        self,
        grade: Optional[str] = None,
        topic_id: Optional[str] = None,
    ) -> List[DqcRuleContext]:
        return self.dqc_client.fetch_monitor_rules(grade=grade, topic_id=topic_id)

    def fetch_ontology(self, ontology_id: str) -> Optional[Dict[str, Any]]:
        return self.ontology_client.fetch_ontology(ontology_id)

    def fetch_all_ontologies(self) -> List[Dict[str, Any]]:
        return self.ontology_client.fetch_all_ontologies()

    def fetch_ontology_yaml(self, name: str) -> Optional[str]:
        return self.ontology_client.fetch_ontology_yaml(name)

    def fetch_full_context(
        self,
        ontology_id: Optional[str] = None,
        include_topics: bool = True,
        include_pipelines: bool = True,
        include_dqc: bool = True,
        include_ontology: bool = True,
    ) -> WatchmenContextBundle:
        """Build a complete context bundle (synchronous)."""
        bundle = WatchmenContextBundle()

        if include_topics:
            bundle.topics = self.fetch_topics()
        if include_pipelines:
            bundle.pipelines = self.fetch_pipelines()
        if include_dqc:
            bundle.dqc_rules = self.fetch_dqc_rules()
        if include_ontology:
            if ontology_id:
                bundle.ontology = self.fetch_ontology(ontology_id)
                ontology_name = bundle.ontology.get("name") if bundle.ontology else None
                if ontology_name:
                    bundle.ontology_yaml = self.fetch_ontology_yaml(ontology_name)
            else:
                ontologies = self.fetch_all_ontologies()
                if ontologies:
                    bundle.ontology = ontologies[0]
                    ontology_name = bundle.ontology.get("name")
                    if ontology_name:
                        bundle.ontology_yaml = self.fetch_ontology_yaml(ontology_name)

        return bundle

    def refresh_context(
        self,
        context_keys: Optional[List[str]] = None,
    ) -> WatchmenContextBundle:
        """Invalidate cache and rebuild context."""
        if context_keys is None:
            self.cache.invalidate_all()
        else:
            for key in context_keys:
                self.cache.invalidate(key)
        return self.fetch_full_context()

    # ------------------------------------------------------------------
    # Asynchronous API (wraps sync calls in threads)
    # ------------------------------------------------------------------

    async def fetch_topics_async(self) -> List[TopicContext]:
        return await asyncio.to_thread(self.fetch_topics)

    async def fetch_pipelines_async(self) -> List[PipelineContext]:
        return await asyncio.to_thread(self.fetch_pipelines)

    async def fetch_dqc_rules_async(
        self,
        grade: Optional[str] = None,
        topic_id: Optional[str] = None,
    ) -> List[DqcRuleContext]:
        return await asyncio.to_thread(self.fetch_dqc_rules, grade, topic_id)

    async def fetch_ontology_async(self, ontology_id: str) -> Optional[Dict[str, Any]]:
        return await asyncio.to_thread(self.fetch_ontology, ontology_id)

    async def fetch_full_context_async(
        self,
        ontology_id: Optional[str] = None,
        include_topics: bool = True,
        include_pipelines: bool = True,
        include_dqc: bool = True,
        include_ontology: bool = True,
    ) -> WatchmenContextBundle:
        """Build a complete context bundle (asynchronous)."""
        return await asyncio.to_thread(
            self.fetch_full_context,
            ontology_id,
            include_topics,
            include_pipelines,
            include_dqc,
            include_ontology,
        )


# ------------------------------------------------------------------
# Internal mapping helpers
# ------------------------------------------------------------------

def _topic_to_context(data: Dict[str, Any]) -> TopicContext:
    factors = []
    for f in data.get("factors", []):
        factors.append(
            FactorContext(
                factor_id=f.get("factorId"),
                name=f.get("name"),
                type=f.get("type"),
                label=f.get("label"),
                description=f.get("description"),
            )
        )
    return TopicContext(
        topic_id=data.get("topicId"),
        name=data.get("name"),
        type=data.get("type"),
        kind=data.get("kind"),
        factors=factors,
        description=data.get("description"),
    )


def _pipeline_to_context(data: Dict[str, Any]) -> PipelineContext:
    stages = []
    for s in data.get("stages", []):
        stage_name = s.get("name", "unnamed")
        unit_count = len(s.get("units", []))
        stages.append(f"{stage_name} ({unit_count} unit(s))")
    return PipelineContext(
        pipeline_id=data.get("pipelineId"),
        name=data.get("name"),
        topic_id=data.get("topicId"),
        trigger_type=data.get("type"),
        stages=stages,
        enabled=data.get("enabled"),
    )


def _dqc_rule_to_context(data: Dict[str, Any]) -> DqcRuleContext:
    params = data.get("params", {})
    if hasattr(params, "dict"):
        params = params.dict()
    elif not isinstance(params, dict):
        params = {}
    return DqcRuleContext(
        rule_id=data.get("ruleId"),
        code=data.get("code"),
        grade=data.get("grade"),
        severity=data.get("severity"),
        topic_id=data.get("topicId"),
        factor_id=data.get("factorId"),
        params=params,
        enabled=data.get("enabled", False),
    )
