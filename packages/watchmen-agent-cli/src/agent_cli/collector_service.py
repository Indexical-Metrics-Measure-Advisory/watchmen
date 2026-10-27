from __future__ import annotations

import time
from pathlib import Path
from typing import Any, Dict, List, Optional

from agent_cli.exceptions import AgentCliException
from agent_cli.http_client import RestClient


class CollectorService:
    def __init__(self, client: RestClient):
        self.client = client

    def trigger(
        self,
        model_name: Optional[str] = None,
        table_name: Optional[str] = None,
        records: Optional[List[Dict[str, Any]]] = None,
        pipeline_id: Optional[str] = None,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
    ) -> Dict[str, Any]:
        if records is not None:
            if not table_name or not records:
                raise AgentCliException("Record trigger requires table name and at least one record.")
            return self.client.post_json("/collector/trigger/event/record", {
                "tableName": table_name,
                "records": records,
            })
        if model_name:
            model = self.find_model(model_name)
            if not start_time or not end_time:
                raise AgentCliException("Model trigger requires start time and end time.")
            return self.client.post_json("/collector/trigger/event/model", {
                "modelId": model["modelId"],
                "startTime": start_time,
                "endTime": end_time,
            })
        if not table_name or not start_time or not end_time:
            raise AgentCliException("Table trigger requires table name, start time and end time.")
        payload = {
            "tableName": table_name,
            "startTime": start_time,
            "endTime": end_time,
        }
        if pipeline_id:
            payload["pipelineId"] = pipeline_id
            return self.client.post_json("/collector/trigger/event/pipeline", payload)
        return self.client.post_json("/collector/trigger/event/table", payload)

    def find_model(self, model_name: str) -> Dict[str, Any]:
        models = self.client.get_json("/ingest/config/model/all")
        matched = [model for model in models if model.get("modelName") == model_name]
        if len(matched) != 1:
            raise AgentCliException(f"Expected one collector model named {model_name}, found {len(matched)}.")
        if not matched[0].get("modelId"):
            raise AgentCliException(f"Collector model {model_name} has no modelId.")
        return matched[0]

    def find_pipeline_id(self, pipeline_name: str) -> str:
        pipelines = self.client.get_json("/pipeline/all")
        matched = [pipeline for pipeline in pipelines if pipeline.get("name") == pipeline_name]
        if len(matched) != 1:
            raise AgentCliException(f"Expected one pipeline named {pipeline_name}, found {len(matched)}.")
        pipeline_id = matched[0].get("pipelineId")
        if not pipeline_id:
            raise AgentCliException(f"Pipeline {pipeline_name} has no pipelineId.")
        return str(pipeline_id)

    def get_event(self, event_trigger_id: int) -> Dict[str, Any]:
        event = self.client.get_json("/ingest/query/event", params={"event_trigger_id": event_trigger_id})
        if not event:
            raise AgentCliException(f"Collector event not found: {event_trigger_id}")
        return event

    def get_execution_detail(self, event_trigger_id: int) -> Dict[str, Any]:
        return self.client.get_json(
            "/ingest/monitor/event/execution-detail",
            params={"trigger_event_id": event_trigger_id},
        )

    def wait_for_event(self, event_trigger_id: int, timeout_seconds: int, poll_interval: float) -> Dict[str, Any]:
        deadline = time.monotonic() + timeout_seconds
        while True:
            event = self.get_event(event_trigger_id)
            if event.get("isFinished"):
                return event
            if time.monotonic() >= deadline:
                raise AgentCliException(
                    f"Timed out waiting for collector event {event_trigger_id}; it may still be running."
                )
            time.sleep(poll_interval)

    def get_pipeline_logs(self, trace_id: str, tenant_id: Optional[str] = None) -> Dict[str, Any]:
        page_number = 1
        pages = []
        logs = []
        while True:
            payload = {"traceId": trace_id, "pageNumber": page_number, "pageSize": 100}
            if tenant_id:
                payload["tenantId"] = tenant_id
            page = self.client.post_json("/pipeline/log", payload)
            if not pages:
                pages.append(page)
            data = page.get("data") or []
            logs.extend(data)
            total = page.get("itemCount")
            if not data or (total is not None and len(logs) >= total) or (total is None and len(data) < 100):
                break
            page_number += 1
        result = dict(pages[0])
        result.update({"data": logs, "itemCount": len(logs), "pageNumber": 1, "pageCount": 1})
        return result

    def get_pipeline_logs_for_detail(self, detail: Dict[str, Any]) -> List[Dict[str, Any]]:
        event = detail.get("event") or {}
        trace_ids = sorted({
            str(link["traceId"])
            for link in detail.get("traceLinks") or []
            if isinstance(link, dict) and link.get("traceId")
        })
        return [self.get_pipeline_logs(trace_id, event.get("tenantId")) for trace_id in trace_ids]

    def rerun_pipeline(self, candidate: Dict[str, Any]) -> Dict[str, Any]:
        params = {
            "topic_id": candidate["topicId"],
            "data_id": candidate["dataId"],
            "pipeline_id": candidate["pipelineId"],
        }
        if candidate.get("tenantId"):
            params["tenant_id"] = candidate["tenantId"]
        return self.client.get_json("/topic/data/rerun", params=params)

    def wait_for_pipeline(self, trace_id: str, tenant_id: Optional[str], timeout_seconds: int, poll_interval: float) -> Dict[str, Any]:
        deadline = time.monotonic() + timeout_seconds
        while True:
            page = self.get_pipeline_logs(trace_id, tenant_id)
            logs = page.get("data") or []
            if logs and all(log.get("status") in ("DONE", "ERROR", "IGNORED") for log in logs):
                return page
            if time.monotonic() >= deadline:
                raise AgentCliException(f"Timed out waiting for pipeline trace {trace_id}; it may still be running.")
            time.sleep(poll_interval)

    def retry_event(self, event_trigger_id: int) -> Dict[str, Any]:
        event = self.get_event(event_trigger_id)
        event_type = event.get("type")
        routes = {
            1: "/collector/trigger/event",
            2: "/collector/trigger/event/table",
            3: "/collector/trigger/event/record",
            4: "/collector/trigger/event/pipeline",
            5: "/collector/trigger/event/schedule",
        }
        if event_type not in routes:
            raise AgentCliException(f"Collector event type {event_type} cannot be retried.")
        payload = {
            key: value for key, value in event.items()
            if key in ("startTime", "endTime", "tableName", "records", "pipelineId", "params")
        }
        new_event = self.client.post_json(routes[event_type], payload)
        return {
            "sourceEventTriggerId": event_trigger_id,
            "newEventTriggerId": new_event.get("eventTriggerId"),
            "event": new_event,
        }


def load_records(file_path: str) -> List[Dict[str, Any]]:
    path = Path(file_path)
    if not path.exists():
        raise AgentCliException(f"Records file not found: {file_path}")
    import json
    payload = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(payload, dict):
        payload = [payload]
    if not isinstance(payload, list) or not payload or not all(isinstance(item, dict) for item in payload):
        raise AgentCliException("Records file must contain a JSON object or a non-empty array of objects.")
    return payload
