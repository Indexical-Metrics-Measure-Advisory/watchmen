from __future__ import annotations

import hashlib
import json
import re
from typing import Any, Dict, Iterable, List, Optional

FAIL_STATUS = 3
SUCCESS_STATUS = 2

CATEGORY_RULES = [
    ("AUTHENTICATION", re.compile(r"unauthorized|authentication|invalid token|bad credentials", re.I)),
    ("PERMISSION", re.compile(r"permission|forbidden|access denied|not authorized", re.I)),
    ("TRANSIENT_INFRASTRUCTURE", re.compile(r"timeout|timed out|temporarily unavailable|connection reset|connection refused|too many requests|rate limit", re.I)),
    ("FACTOR_NOT_FOUND", re.compile(r"factor.*(?:not found|does not exist|doesn't exist)|(?:not found|does not exist|doesn't exist).*factor", re.I)),
    ("TABLE_OR_COLUMN_NOT_FOUND", re.compile(r"table.*(?:not found|does not exist|doesn't exist)|column.*(?:not found|does not exist|doesn't exist)|unknown column", re.I)),
    ("TOPIC_NOT_FOUND", re.compile(r"topic.*(?:not found|does not exist|doesn't exist)|(?:not found|does not exist|doesn't exist).*topic", re.I)),
    ("PIPELINE_NOT_FOUND", re.compile(r"pipeline.*(?:not found|does not exist|doesn't exist)|(?:not found|does not exist|doesn't exist).*pipeline", re.I)),
    ("TYPE_CONVERSION", re.compile(r"type conversion|cannot cast|invalid literal|data truncation|incorrect .* value", re.I)),
]


def error_text(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        for key in ("error", "message", "result", "traceback"):
            if value.get(key):
                return error_text(value[key])
        return json.dumps(value, ensure_ascii=False, default=str) if value else None
    return str(value)


def classify_error(message: str) -> str:
    for category, pattern in CATEGORY_RULES:
        if pattern.search(message):
            return category
    return "UNKNOWN"


def error_signature(category: str, message: str) -> str:
    normalized = re.sub(r"\b\d+\b", "<n>", message.lower())
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return hashlib.sha256(f"{category}:{normalized}".encode("utf-8")).hexdigest()


def flatten_pipeline_log(log: Dict[str, Any]) -> List[Dict[str, Any]]:
    issues = []

    def visit(node: Dict[str, Any], level: str, path: List[str]) -> None:
        message = error_text(node.get("error"))
        if message:
            issues.append({
                "level": level,
                "path": path,
                "message": message,
                "traceId": log.get("traceId"),
                "pipelineLogUid": log.get("uid"),
            })
        for child_key, child_level in (("stages", "stage"), ("units", "unit"), ("actions", "action")):
            for index, child in enumerate(node.get(child_key) or []):
                if isinstance(child, dict):
                    identity = str(child.get("uid") or child.get("type") or index)
                    visit(child, child_level, path + [f"{child_level}:{identity}"])

    visit(log, "pipeline", [])
    return issues


def pipeline_logs_by_trace(pipeline_logs: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    logs = []
    for item in pipeline_logs:
        if isinstance(item, dict) and isinstance(item.get("data"), list):
            logs.extend(log for log in item["data"] if isinstance(log, dict))
        elif isinstance(item, dict):
            logs.append(item)
    return logs


def build_diagnosis(
    event_trigger_id: int | str,
    detail: Dict[str, Any],
    pipeline_log_pages: Optional[Iterable[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    event_trigger_id = str(event_trigger_id)
    event = detail.get("event") or {}
    pipeline_logs = pipeline_logs_by_trace(pipeline_log_pages or [])
    issues = []
    for error in detail.get("errors") or []:
        message = error_text(error.get("result") or error.get("error"))
        if not message:
            continue
        category = classify_error(message)
        issues.append({
            "source": "collector",
            "category": category,
            "signature": error_signature(category, message),
            "message": message,
            "evidence": {
                key: error.get(key) for key in (
                    "source", "layer", "id", "taskId", "changeJsonId", "changeRecordId", "status"
                ) if error.get(key) is not None
            },
        })
    for log in pipeline_logs:
        for error in flatten_pipeline_log(log):
            message = error["message"]
            category = classify_error(message)
            issues.append({
                "source": "pipeline",
                "category": category,
                "signature": error_signature(category, message),
                "message": message,
                "evidence": error,
            })

    failed_logs = [log for log in pipeline_logs if str(log.get("status") or "").upper() == "ERROR"]
    successful_logs = [log for log in pipeline_logs if str(log.get("status") or "").upper() == "DONE"]
    event_finished = bool(event.get("isFinished"))
    if issues or failed_logs or event.get("status") == FAIL_STATUS:
        derived_status = "PARTIAL" if successful_logs else "FAILED"
    elif event_finished and event.get("status") == SUCCESS_STATUS:
        derived_status = "SUCCEEDED"
    elif event_finished:
        derived_status = "COMPLETED"
    else:
        derived_status = "RUNNING"

    retry_candidates = []
    for log in failed_logs:
        if log.get("topicId") and log.get("dataId") and log.get("pipelineId"):
            retry_candidates.append({
                "topicId": log["topicId"],
                "dataId": log["dataId"],
                "pipelineId": log["pipelineId"],
                "traceId": log.get("traceId"),
                "pipelineLogUid": log.get("uid"),
                "tenantId": event.get("tenantId"),
            })

    tasks = detail.get("tasks") or {}
    task_records = (tasks.get("active") or []) + (tasks.get("history") or [])
    has_untraceable_tasks = any(
        not isinstance(task, dict)
        or not isinstance(task.get("result"), dict)
        or not task["result"].get("traceLinks")
        for task in task_records
    )

    def contains_truncation(value: Any) -> bool:
        if isinstance(value, dict):
            return any(contains_truncation(item) for item in value.values())
        return value is True

    evidence_complete = not contains_truncation(detail.get("truncated") or {})
    diagnosis = {
        "eventTriggerId": event_trigger_id,
        "derivedStatus": derived_status,
        "eventStatus": event.get("status"),
        "evidenceComplete": evidence_complete,
        "issues": issues,
        "traceIds": sorted({str(log["traceId"]) for log in pipeline_logs if log.get("traceId")}),
        "pipelineLogCount": len(pipeline_logs),
        "failedPipelineCount": len(failed_logs),
        "successfulPipelineCount": len(successful_logs),
        "retryPipelineCandidates": retry_candidates,
        "eventRetryEligible": bool(
            event_finished and evidence_complete and not successful_logs and not has_untraceable_tasks
            and derived_status in ("FAILED", "PARTIAL")
        ),
        "manualActions": [],
    }
    if not evidence_complete:
        diagnosis["manualActions"].append("Execution evidence is truncated; automatic repair and event retry are blocked.")
    if not issues and derived_status in ("FAILED", "PARTIAL"):
        diagnosis["manualActions"].append("Failure details are unavailable; inspect Collector task history and server logs.")
    for issue in issues:
        if issue["category"] in ("AUTHENTICATION", "PERMISSION", "UNKNOWN", "FACTOR_NOT_FOUND", "TOPIC_NOT_FOUND", "PIPELINE_NOT_FOUND", "TABLE_OR_COLUMN_NOT_FOUND", "TYPE_CONVERSION"):
            diagnosis["manualActions"].append(f"Review {issue['category']} using evidence {issue['evidence']}.")
    diagnosis["manualActions"] = list(dict.fromkeys(diagnosis["manualActions"]))
    hash_payload = {
        "eventTriggerId": event_trigger_id,
        "derivedStatus": derived_status,
        "evidenceComplete": evidence_complete,
        "issues": [{"category": item["category"], "signature": item["signature"], "evidence": item["evidence"]} for item in issues],
        "retryPipelineCandidates": retry_candidates,
    }
    diagnosis["diagnosisHash"] = hashlib.sha256(
        json.dumps(hash_payload, ensure_ascii=False, sort_keys=True, default=str).encode("utf-8")
    ).hexdigest()
    return diagnosis
