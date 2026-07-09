"""REST API + WebSocket router for Ontology Control Plane.

Blueprint layer: Control Plane Core (FastAPI) + UI Presentation (WebSocket).
Exposes:
  - REST endpoints for ontology, tasks, proposals, audit, logs
  - WebSocket /logs/stream for real-time terminal-style log streaming
    (consumed by the React + Xterm.js dashboard)
"""

import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from watchmen_ai.auto.orchestrator import Orchestrator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ontology-control-plane", tags=["ontology-control-plane"])

# Global orchestrator instance (use DI in production)
_orchestrator: Optional[Orchestrator] = None


def get_orchestrator() -> Orchestrator:
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = Orchestrator()
    return _orchestrator


# ============================================================================
# Request / Response Models
# ============================================================================


class RunWorkerRequest(BaseModel):
    worker_type: str
    auto_approve: bool = False


class ApproveProposalRequest(BaseModel):
    approved: bool
    reason: str = ""


# ============================================================================
# Ontology endpoints
# ============================================================================


@router.get("/ontology")
def get_ontology() -> Dict[str, Any]:
    """Get the current business ontology (Active Metastore snapshot)."""
    return get_orchestrator().get_ontology().model_dump(mode="json")


# ============================================================================
# Worker / cycle execution endpoints
# ============================================================================


@router.post("/run-cycle")
def run_full_cycle(auto_approve: bool = Query(False)) -> Dict[str, Any]:
    """Run the full evolution cycle: Architect -> Materialization -> Health -> Insight."""
    results = get_orchestrator().run_full_cycle(auto_approve=auto_approve)
    return {"status": "completed", "results": results}


@router.post("/run-worker")
def run_worker(request: RunWorkerRequest) -> Dict[str, Any]:
    """Run a specific worker (enqueues a task on the coordinator)."""
    try:
        return {"status": "completed", **get_orchestrator().run_worker(
            request.worker_type, auto_approve=request.auto_approve)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Task / log / proposal endpoints
# ============================================================================


@router.get("/tasks")
def list_tasks(worker_type: Optional[str] = Query(None)) -> Dict[str, Any]:
    """List tasks from the coordinator (optionally filtered by worker)."""
    return {"tasks": get_orchestrator().get_tasks(worker_type)}


@router.get("/logs")
def list_logs(task_id: Optional[str] = Query(None)) -> Dict[str, Any]:
    """List historical log lines (preload for the Xterm.js viewer)."""
    return {"logs": get_orchestrator().get_logs(task_id)}


@router.websocket("/logs/stream")
async def stream_logs(websocket: WebSocket, task_id: Optional[str] = None) -> None:
    """WebSocket endpoint streaming live log lines to the dashboard.

    Blueprint: multiplexed WebSocket streaming logs consumed by Xterm.js.
    """
    await websocket.accept()
    orch = get_orchestrator()

    # Replay history first so the terminal shows prior context
    for line in orch.log_bus.history(task_id):
        await websocket.send_json({
            "task_id": line.task_id,
            "worker_type": line.worker_type,
            "level": line.level,
            "message": line.message,
            "timestamp": line.timestamp.isoformat(),
        })

    # Subscribe to future lines
    async def forward(line):
        if task_id is None or line.task_id == task_id:
            await websocket.send_json({
                "task_id": line.task_id,
                "worker_type": line.worker_type,
                "level": line.level,
                "message": line.message,
                "timestamp": line.timestamp.isoformat(),
            })

    sub_id = orch.log_bus.subscribe(forward, task_id=task_id)
    try:
        # Keep the connection open; client may send pings
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    finally:
        orch.log_bus.unsubscribe(sub_id)


@router.get("/pending-proposals")
def get_pending_proposals() -> Dict[str, Any]:
    """Get proposals awaiting human approval (human-in-the-loop gate)."""
    pending = get_orchestrator().get_pending_proposals()
    return {"count": len(pending), "proposals": pending}


@router.post("/proposals/{proposal_id}/approve")
def approve_proposal(proposal_id: str, request: ApproveProposalRequest) -> Dict[str, Any]:
    """Manually approve or reject a proposal."""
    success = get_orchestrator().approve_proposal(
        proposal_id=proposal_id, approved=request.approved, reason=request.reason)
    if not success:
        raise HTTPException(status_code=404,
                            detail=f"Proposal {proposal_id} not found or not pending")
    return {"status": "updated", "proposal_id": proposal_id, "approved": request.approved}


@router.get("/audit-log")
def get_audit_log() -> Dict[str, Any]:
    """Get the complete audit trail (Decision / Audit Store)."""
    audit = get_orchestrator().get_audit_log()
    return {"count": len(audit), "events": audit}


@router.get("/workers")
def list_workers() -> Dict[str, Any]:
    """List all registered workers (blueprint: 4 worker containers)."""
    return {"workers": get_orchestrator().list_workers()}


@router.post("/refresh-context")
def refresh_context() -> Dict[str, Any]:
    """Manually refresh Watchmen Data Bridge context and return summary."""
    return get_orchestrator().refresh_context()
