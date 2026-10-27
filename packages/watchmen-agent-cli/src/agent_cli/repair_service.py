from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

from agent_cli.collector_service import CollectorService
from agent_cli.exceptions import AgentCliException

PLAN_VERSION = "1.0"
SAFE_AUTO_CATEGORIES = {"TRANSIENT_INFRASTRUCTURE"}


class RepairService:
    def __init__(self, collector: CollectorService, host: str):
        self.collector = collector
        self.host = host.rstrip("/")

    def create_plan(self, diagnosis: Dict[str, Any]) -> Dict[str, Any]:
        event_id = diagnosis["eventTriggerId"]
        candidates = diagnosis.get("retryPipelineCandidates") or []
        categories = {issue["category"] for issue in diagnosis.get("issues") or []}
        actions = []
        if diagnosis.get("evidenceComplete") and len(candidates) == 1 and diagnosis.get("failedPipelineCount") == 1:
            actions.append({
                "type": "retry_pipeline",
                "autoApplyEligible": True,
                "safeAutoEligible": categories == {"TRANSIENT_INFRASTRUCTURE"},
                "risk": "MEDIUM",
                "evidence": candidates[0],
                "input": candidates[0],
            })
        else:
            actions.append({
                "type": "manual_review",
                "autoApplyEligible": False,
                "safeAutoEligible": False,
                "risk": "UNKNOWN",
                "reason": "A unique failed Pipeline with complete rerun evidence is required.",
            })
        return {
            "planVersion": PLAN_VERSION,
            "host": self.host,
            "eventTriggerId": event_id,
            "diagnosisHash": diagnosis["diagnosisHash"],
            "derivedStatus": diagnosis["derivedStatus"],
            "actions": actions,
            "manualActions": diagnosis.get("manualActions") or [],
        }

    def write_plan(self, plan: Dict[str, Any], output: str) -> None:
        path = Path(output)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(plan, ensure_ascii=False, indent=2), encoding="utf-8")

    def load_plan(self, file_path: str) -> Dict[str, Any]:
        path = Path(file_path)
        if not path.exists():
            raise AgentCliException(f"Fix plan not found: {file_path}")
        plan = json.loads(path.read_text(encoding="utf-8"))
        if plan.get("planVersion") != PLAN_VERSION:
            raise AgentCliException("Unsupported fix plan version.")
        return plan

    def apply_plan(
        self,
        plan: Dict[str, Any],
        current_diagnosis: Dict[str, Any],
        confirmed: bool,
        automatic: bool = False,
        timeout_seconds: int = 300,
        poll_interval: float = 2.0,
    ) -> Dict[str, Any]:
        if not automatic and not confirmed:
            raise AgentCliException("Applying a fix plan requires --yes.")
        if plan.get("host") != self.host:
            raise AgentCliException("Fix plan host does not match the current vault host.")
        if plan.get("eventTriggerId") != current_diagnosis.get("eventTriggerId"):
            raise AgentCliException("Fix plan event does not match the current diagnosis.")
        if plan.get("diagnosisHash") != current_diagnosis.get("diagnosisHash"):
            raise AgentCliException("Fix plan is stale because the execution diagnosis has changed.")
        if not plan.get("actions") or len(plan["actions"]) != 1:
            raise AgentCliException("Fix plan must contain exactly one action.")
        action = plan["actions"][0]
        eligible_key = "safeAutoEligible" if automatic else "autoApplyEligible"
        if action.get("type") != "retry_pipeline" or not action.get(eligible_key):
            raise AgentCliException("Fix plan action is not eligible for this execution mode.")
        result = self.collector.rerun_pipeline(action["input"])
        trace_id = result.get("traceId")
        if not trace_id:
            raise AgentCliException("Pipeline rerun returned no traceId.")
        log_page = self.collector.wait_for_pipeline(
            trace_id, action["input"].get("tenantId"), timeout_seconds, poll_interval
        )
        logs = log_page.get("data") or []
        failed = any(log.get("status") == "ERROR" for log in logs)
        return {
            "status": "FAILED" if failed else "RECOVERED",
            "eventTriggerId": plan["eventTriggerId"],
            "action": action["type"],
            "traceIds": [trace_id],
            "pipelineLogs": logs,
        }
