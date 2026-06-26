"""CLI interface for Ontology Control Plane (new layered architecture).

Commands map to the blueprint layers:
  run-cycle / run-worker  -> Task Coordinator (queue)
  status / pending        -> Active Metastore (store)
  logs / tasks            -> Log Bus / Task Coordinator
  approve                 -> Human-in-the-loop gate
  audit                   -> Decision / Audit Store
"""

import argparse
import json
import sys
from typing import Any, Dict

from watchmen_ai.auto import Orchestrator


def _get_orchestrator() -> Orchestrator:
    return Orchestrator()


def cmd_run_cycle(args: argparse.Namespace) -> None:
    orch = _get_orchestrator()
    print("Running full cycle (Architect -> Materialization -> Health -> Insight)...")
    results = orch.run_full_cycle(auto_approve=args.auto_approve)

    print("\nCycle complete. Results:")
    for worker_type, result in results.items():
        if isinstance(result, dict) and "error" in result:
            print(f"\n{worker_type.upper()} WORKER: error - {result['error']}")
        else:
            print(f"\n{worker_type.upper()} WORKER:")
            print(f"  Discovered: {result.get('discovered', 0)}")
            print(f"  Materialized: {result.get('materialized', 0)}")


def cmd_run_worker(args: argparse.Namespace) -> None:
    orch = _get_orchestrator()
    print(f"Running {args.worker} worker...")
    try:
        result = orch.run_worker(args.worker, auto_approve=args.auto_approve)
        print(f"\nWorker complete.")
        print(f"  Discovered: {result.get('discovered', 0)}")
        print(f"  Materialized: {result.get('materialized', 0)}")
    except (ValueError, RuntimeError) as e:
        print(f"Error: {e}")
        sys.exit(1)


def cmd_status(args: argparse.Namespace) -> None:
    orch = _get_orchestrator()
    ontology = orch.get_ontology()

    print("ONTOLOGY STATUS")
    print("=" * 60)
    print(f"ID: {ontology.ontology_id}")
    print(f"Name: {ontology.name}")
    print(f"Version: {ontology.version}")
    print(f"\nNodes: {len(ontology.nodes)}")
    for node in ontology.nodes.values():
        health = node.health
        health_str = f"Health: {health.overall_score:.1f}" if health else "Health: N/A"
        print(f"  [{node.node_id}] {node.name}")
        print(f"    Type: {node.node_type}")
        print(f"    {health_str}")
        print(f"    Data Sources: {len(node.data_sources)}")

    print(f"\nRelations: {len(ontology.relations)}")
    for rel in ontology.relations.values():
        print(f"  [{rel.relation_id}] {rel.source_node_id} --{rel.relation_type}--> {rel.target_node_id}")


def cmd_pending(args: argparse.Namespace) -> None:
    orch = _get_orchestrator()
    pending = orch.get_pending_proposals()

    print(f"PENDING PROPOSALS: {len(pending)}")
    print("=" * 60)
    for p in pending:
        print(f"  [{p['proposal_id']}] {p['action']}")
        print(f"    Worker: {p['agent_type']}")
        print(f"    Rationale: {p['rationale']}")
        print(f"    Confidence: {p['confidence']:.2f}")


def cmd_approve(args: argparse.Namespace) -> None:
    orch = _get_orchestrator()
    success = orch.approve_proposal(
        proposal_id=args.proposal_id,
        approved=not args.reject,
        reason=args.reason,
    )
    if success:
        action = "rejected" if args.reject else "approved"
        print(f"Proposal {args.proposal_id} {action}")
    else:
        print(f"Proposal {args.proposal_id} not found or not pending")
        sys.exit(1)


def cmd_audit(args: argparse.Namespace) -> None:
    orch = _get_orchestrator()
    audit = orch.get_audit_log()

    limit = args.limit if args.limit else len(audit)
    print(f"AUDIT LOG (showing {min(limit, len(audit))} of {len(audit)} events)")
    print("=" * 60)
    for event in audit[:limit]:
        print(f"  [{event['timestamp']}] {event['action']}")
        print(f"    Worker: {event.get('agent_type', 'N/A')}")
        if event.get("details"):
            print(f"    Details: {json.dumps(event['details'], ensure_ascii=False)}")


def cmd_tasks(args: argparse.Namespace) -> None:
    orch = _get_orchestrator()
    tasks = orch.get_tasks(args.worker)
    print(f"TASKS ({len(tasks)} total)")
    print("=" * 60)
    for t in tasks:
        print(f"  [{t['task_id']}] {t['worker_type']} [{t['status']}]")
        if t.get("error"):
            print(f"    Error: {t['error']}")


def cmd_logs(args: argparse.Namespace) -> None:
    orch = _get_orchestrator()
    logs = orch.get_logs(args.task_id)
    print(f"LOGS ({len(logs)} lines)")
    print("=" * 60)
    for line in logs:
        prefix = f"[{line['worker_type']}]"
        print(f"  {prefix:<22} {line['message']}")


def cmd_export(args: argparse.Namespace) -> None:
    orch = _get_orchestrator()
    ontology = orch.get_ontology()
    output = ontology.model_dump(mode="json")
    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
        print(f"Exported to {args.output}")
    else:
        print(json.dumps(output, ensure_ascii=False, indent=2))


def cmd_import(args: argparse.Namespace) -> None:
    from watchmen_ai.auto.core import BusinessOntology
    from watchmen_ai.auto.storage import InMemoryOntologyStore

    with open(args.file, "r", encoding="utf-8") as f:
        data = json.load(f)
    ontology = BusinessOntology(**data)
    # Import creates a fresh orchestrator backed by the imported ontology
    store = InMemoryOntologyStore(ontology)
    Orchestrator(store=store)
    print(f"Imported ontology: {ontology.name}")
    print(f"  Nodes: {len(ontology.nodes)}")
    print(f"  Relations: {len(ontology.relations)}")


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="ontology-control-plane",
        description="Ontology Control Plane CLI (layered architecture)",
    )
    subparsers = parser.add_subparsers(dest="command", help="Commands")

    subparsers.add_parser("run-cycle", help="Run full cycle of all workers").add_argument(
        "--auto-approve", action="store_true", help="Auto-approve proposals"
    )

    worker_parser = subparsers.add_parser("run-worker", help="Run a specific worker")
    worker_parser.add_argument(
        "worker", choices=["architect", "materialization", "health", "insight"]
    )
    worker_parser.add_argument("--auto-approve", action="store_true")

    subparsers.add_parser("status", help="Show ontology status")
    subparsers.add_parser("pending", help="Show pending proposals")

    approve_parser = subparsers.add_parser("approve", help="Approve/reject a proposal")
    approve_parser.add_argument("proposal_id")
    approve_parser.add_argument("--reject", action="store_true")
    approve_parser.add_argument("--reason", default="")

    audit_parser = subparsers.add_parser("audit", help="Show audit log")
    audit_parser.add_argument("--limit", type=int)

    tasks_parser = subparsers.add_parser("tasks", help="List tasks")
    tasks_parser.add_argument("--worker", choices=["architect", "materialization", "health", "insight"])

    logs_parser = subparsers.add_parser("logs", help="Show logs")
    logs_parser.add_argument("--task-id")

    export_parser = subparsers.add_parser("export", help="Export ontology to JSON")
    export_parser.add_argument("--output", "-o")

    import_parser = subparsers.add_parser("import", help="Import ontology from JSON")
    import_parser.add_argument("file")

    args = parser.parse_args()
    if args.command is None:
        parser.print_help()
        sys.exit(1)

    commands: Dict[str, Any] = {
        "run-cycle": cmd_run_cycle,
        "run-worker": cmd_run_worker,
        "status": cmd_status,
        "pending": cmd_pending,
        "approve": cmd_approve,
        "audit": cmd_audit,
        "tasks": cmd_tasks,
        "logs": cmd_logs,
        "export": cmd_export,
        "import": cmd_import,
    }
    commands[args.command](args)


if __name__ == "__main__":
    main()
