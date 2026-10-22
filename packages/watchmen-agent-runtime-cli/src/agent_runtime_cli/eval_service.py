from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

from agent_runtime_cli.exceptions import AgentRuntimeCliException
from agent_runtime_cli.query_log import append_query_log, now_iso, summarize_result
from agent_runtime_cli.runtime_service import RuntimeService

DEFAULT_TOLERANCE = 1e-6
METRIC_REQUEST_KEYS = {"metric", "group_by", "where", "start_time", "end_time", "order", "limit", "time_granularity"}
REPORT_ROWS_PREVIEW = 20

ServiceFactory = Callable[[Optional[str]], RuntimeService]


def extract_rows(result: Any) -> List[Dict[str, Any]]:
    if isinstance(result, list):
        return [row for row in result if isinstance(row, dict)]
    if isinstance(result, dict):
        for key in ("rows", "data", "results", "result", "values"):
            value = result.get(key)
            if isinstance(value, list):
                return [row for row in value if isinstance(row, dict)]
        return [result]
    return []


def values_match(expected: Any, actual: Any, tolerance: float) -> bool:
    if isinstance(expected, bool) or isinstance(actual, bool):
        return expected == actual
    if isinstance(expected, (int, float)) and isinstance(actual, (int, float)):
        return abs(float(expected) - float(actual)) <= tolerance
    return expected == actual or str(expected) == str(actual)


def row_matches(expected_row: Dict[str, Any], actual_row: Dict[str, Any], tolerance: float) -> bool:
    for key, expected_value in expected_row.items():
        if key not in actual_row:
            return False
        if not values_match(expected_value, actual_row[key], tolerance):
            return False
    return True


def compare_expectation(result: Any, expect: Dict[str, Any]) -> Dict[str, Any]:
    tolerance = expect.get("tolerance", DEFAULT_TOLERANCE)
    rows = extract_rows(result)
    mismatches: List[str] = []
    expected_row_count = expect.get("row_count")
    if expected_row_count is not None and len(rows) != expected_row_count:
        mismatches.append(f"row_count: expected {expected_row_count}, got {len(rows)}")
    remaining = list(rows)
    for expected_row in expect.get("rows") or []:
        match_index = next((i for i, actual in enumerate(remaining) if row_matches(expected_row, actual, tolerance)), None)
        if match_index is None:
            mismatches.append(f"row not found: {json.dumps(expected_row, ensure_ascii=False)}")
        else:
            remaining.pop(match_index)
    return {"passed": not mismatches, "mismatches": mismatches, "actualRowCount": len(rows)}


def execute_eval_query(
    service_factory: ServiceFactory,
    vault_path: Path,
    correlation_id: str,
    question_id: str,
    query: Dict[str, Any],
) -> Dict[str, Any]:
    query_type = query.get("type", "metric")
    request = query.get("request") or {}
    if not isinstance(request, dict):
        raise AgentRuntimeCliException(f"Eval query of question [{question_id}] must carry a JSON object request.")
    ontology_id = query.get("ontology_id")
    entry: Dict[str, Any] = {
        "ts": now_iso(),
        "command": f"eval {query_type}",
        "correlationId": correlation_id,
        "questionId": question_id,
        "params": {"type": query_type, "ontology_id": ontology_id, "request": request},
    }
    started = time.perf_counter()
    try:
        svc = service_factory(correlation_id)
        if query_type == "metric":
            filtered = {k: v for k, v in request.items() if k in METRIC_REQUEST_KEYS}
            result = svc.get_metric_value(**filtered)
        elif query_type == "ontology":
            target_id = ontology_id or request.get("ontologyId")
            if not target_id:
                raise AgentRuntimeCliException(f"Ontology eval query of question [{question_id}] requires ontology_id.")
            result = svc.query_ontology(target_id, request)
        else:
            raise AgentRuntimeCliException(f"Unsupported eval query type: {query_type}")
        duration_ms = round((time.perf_counter() - started) * 1000)
        entry.update({"status": "ok", "durationMs": duration_ms, "resultSummary": summarize_result(result)})
        outcome: Dict[str, Any] = {"type": query_type, "status": "ok", "durationMs": duration_ms, "result": result}
        expect = query.get("expect")
        if expect:
            outcome["expect"] = compare_expectation(result, expect)
        return outcome
    except Exception as e:
        duration_ms = round((time.perf_counter() - started) * 1000)
        entry.update({"status": "error", "durationMs": duration_ms, "error": str(e)})
        return {"type": query_type, "status": "error", "durationMs": duration_ms, "error": str(e)}
    finally:
        append_query_log(vault_path, entry)


def summarize_outcome(outcome: Dict[str, Any]) -> Dict[str, Any]:
    summary = {k: v for k, v in outcome.items() if k != "result"}
    if outcome.get("result") is not None:
        summary["resultSummary"] = summarize_result(outcome["result"])
    return summary


def outcome_passed(outcome: Dict[str, Any]) -> bool:
    if outcome["status"] != "ok":
        return False
    expect = outcome.get("expect")
    return expect["passed"] if expect else True


def run_question_set(
    service_factory: ServiceFactory,
    vault_path: Path,
    question_set: List[Dict[str, Any]],
) -> Tuple[Dict[str, Any], bool]:
    run_id = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    questions_out: List[Dict[str, Any]] = []
    detailed: List[Dict[str, Any]] = []
    for index, question in enumerate(question_set):
        if not isinstance(question, dict):
            raise AgentRuntimeCliException(f"Eval question #{index + 1} must be a JSON object.")
        question_id = question.get("id") or f"q{index + 1}"
        correlation_id = f"eval-{run_id}-{question_id}"
        outcomes = [
            execute_eval_query(service_factory, vault_path, correlation_id, question_id, query)
            for query in question.get("queries") or []
        ]
        passed = all(outcome_passed(outcome) for outcome in outcomes)
        questions_out.append({
            "id": question_id,
            "question": question.get("question"),
            "correlationId": correlation_id,
            "passed": passed,
            "queries": [summarize_outcome(outcome) for outcome in outcomes],
        })
        detailed.append({
            "id": question_id,
            "question": question.get("question"),
            "correlationId": correlation_id,
            "passed": passed,
            "queries": outcomes,
        })
    total = len(questions_out)
    passed_count = sum(1 for q in questions_out if q["passed"])
    summary: Dict[str, Any] = {
        "runId": run_id,
        "totalQuestions": total,
        "passed": passed_count,
        "failed": total - passed_count,
        "passRate": round(passed_count / total, 4) if total else None,
    }
    report_file = write_markdown_report(vault_path, run_id, summary, detailed)
    summary["reportFile"] = str(report_file)
    return {"summary": summary, "questions": questions_out}, passed_count == total


def write_markdown_report(
    vault_path: Path,
    run_id: str,
    summary: Dict[str, Any],
    questions: List[Dict[str, Any]],
) -> Path:
    report_dir = vault_path / "eval-reports"
    report_dir.mkdir(parents=True, exist_ok=True)
    report_file = report_dir / f"report-{run_id}.md"
    lines = [
        f"# Eval Report {run_id}",
        "",
        f"- Generated: {now_iso()}",
        f"- Questions: {summary['totalQuestions']} (passed {summary['passed']}, failed {summary['failed']})",
        f"- Pass rate: {summary['passRate'] if summary['passRate'] is not None else 'n/a'}",
        "",
    ]
    for question in questions:
        status = "PASS" if question["passed"] else "FAIL"
        title = question.get("question") or ""
        lines.append(f"## {question['id']} — {title} — {status}")
        lines.append("")
        lines.append(f"correlationId: `{question['correlationId']}`")
        lines.append("")
        for q_index, outcome in enumerate(question["queries"]):
            query_status = outcome["status"]
            lines.append(f"### query {q_index + 1} ({outcome['type']}) — {query_status}, {outcome.get('durationMs')}ms")
            expect = outcome.get("expect")
            if expect:
                verdict = "passed" if expect["passed"] else "mismatch"
                lines.append(f"- expectation: {verdict} (actual rows: {expect['actualRowCount']})")
                for mismatch in expect["mismatches"]:
                    lines.append(f"- {mismatch}")
            if outcome.get("error"):
                lines.append(f"- error: {outcome['error']}")
            failed = outcome["status"] != "ok" or (expect and not expect["passed"])
            if failed and outcome.get("result") is not None:
                rows = extract_rows(outcome["result"])[:REPORT_ROWS_PREVIEW]
                lines.append("- actual rows (first 20):")
                lines.append("```json")
                lines.append(json.dumps(rows, ensure_ascii=False, indent=2, default=str))
                lines.append("```")
            lines.append("")
    report_file.write_text("\n".join(lines), encoding="utf-8")
    return report_file
