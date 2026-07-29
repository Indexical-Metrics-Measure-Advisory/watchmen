from __future__ import annotations

from typing import Any, Dict, List, Optional

from agent_runtime_cli.http_client import RestClient


class RuntimeService:
    def __init__(self, client: RestClient):
        self.client = client

    def health(self) -> Dict[str, Any]:
        return self.client.get_json("/metricflow/health")

    def current_date(self) -> Any:
        return self.client.get_json("/metricflow/current_date")

    def list_metrics(self) -> Dict[str, Any]:
        return self.client.get_json("/metricflow/list_metrics")

    def dimensions_by_metric(self, metric_name: str) -> Dict[str, Any]:
        return self.client.get_json("/metricflow/dimensions_by_metric", params={"metric_name": metric_name})

    def find_dimensions(self, metrics: List[str]) -> Dict[str, Any]:
        return self.client.post_json("/metricflow/find_dimensions", payload=metrics)

    def get_metric_value(
        self,
        metric: str,
        group_by: Optional[List[str]] = None,
        where: Optional[str] = None,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        order: Optional[List[str]] = None,
        limit: Optional[int] = None,
        time_granularity: Optional[str] = None,
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "metric": metric,
            "group_by": group_by,
            "where": where,
            "start_time": start_time,
            "end_time": end_time,
            "order": order,
            "limit": limit,
            "time_granularity": time_granularity,
        }
        filtered_payload = {k: v for k, v in payload.items() if v is not None}
        return self.client.post_json("/metricflow/get_metric_value", payload=filtered_payload)

    def query_metrics(self, requests_payload: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        return self.client.post_json("/metricflow/query_metrics", payload=requests_payload)

    def list_ontologies(
        self,
        query: Optional[str] = None,
        page_number: Optional[int] = None,
        page_size: Optional[int] = None,
    ) -> Dict[str, Any]:
        params: Dict[str, Any] = {}
        if query:
            params["query"] = query
        if page_number is not None:
            params["pageNumber"] = page_number
        if page_size is not None:
            params["pageSize"] = page_size
        return self.client.get_json("/ontology/list", params=params or None)

    def get_ontology(self, ontology_id: str) -> Dict[str, Any]:
        return self.client.get_json("/ontology/get", params={"ontologyId": ontology_id})

    def list_ontologies_agent_view(self) -> str:
        return self.client.get_text("/ontology/all/yaml/agent-view")

    def get_ontology_agent_view(self, name: str) -> str:
        return self.client.get_text("/ontology/name/yaml/agent-view", params={"name": name})

    def query_ontology(self, ontology_id: str, request: Dict[str, Any]) -> Dict[str, Any]:
        return self.client.post_json(f"/ontology/{ontology_id}/query", payload=request)

    def compile_ontology_query(self, ontology_id: str, request: Dict[str, Any]) -> Dict[str, Any]:
        return self.client.post_json(f"/ontology/{ontology_id}/query/compile", payload=request)
