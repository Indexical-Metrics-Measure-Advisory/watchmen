"""Aggregate driver + business + resource metrics into a Markdown report.

Usage:
    python -m watchmen_perf_lambda_pipeline.report.generator --scenario A \\
        --locust-stats reports/locust_a_stats.json --out reports/scenario-a.md

If --locust-stats is omitted, only business + resource metrics are collected
(useful for a post-run snapshot when Locust CSV/JSON is unavailable).
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import typer
from jinja2 import Template

from ..metrics.collector import DollClient, collect_business_metrics
from ..metrics.lambda_insights import collect_lambda_insights
from ..metrics.prometheus_scraper import collect_prometheus_snapshot
from ..metrics.sqs_depth import collect_sqs_depth_as_dict

TEMPLATE_PATH = Path(__file__).resolve().parent / 'templates' / 'report.md.j2'

SCENARIO_NAMES = {
	'A': 'A. HTTP direct (Function URL /pipeline/data)',
	'B': 'B. Collector async (Function URL /collector/trigger/event* + EventBridge)',
	'C': 'C. Collector online (Function URL /collector/trigger/online)',
	'D': 'D. EventBridge scheduled (event {listener, tenant_id})',
}

app = typer.Typer(add_completion=False, help='Generate a perf report from collected metrics.')


def _load_locust_stats(path: str | None) -> dict[str, Any]:
	if not path:
		return {}
	p = Path(path)
	if not p.exists():
		return {'error': f'locust stats file not found: {path}'}
	try:
		return json.loads(p.read_text())
	except Exception as e:  # noqa: BLE001
		return {'error': f'failed to parse locust stats: {e}'}


def _collect_all(scenario: str, locust_stats_path: str | None,
                  window_minutes: int) -> dict[str, Any]:
	tenant_id = os.environ.get('PERF_TENANT_ID', '')
	pipeline_id = os.environ.get('PERF_PIPELINE_ID', '') or None

	business = collect_business_metrics(
		doll=DollClient(), tenant_id=tenant_id, pipeline_id=pipeline_id,
	)
	resource_prom = collect_prometheus_snapshot().to_dict()
	resource_sqs = collect_sqs_depth_as_dict()
	resource_lambda = collect_lambda_insights(window_minutes=window_minutes).to_dict()
	locust_stats = _load_locust_stats(locust_stats_path)

	return {
		'meta': {
			'scenario': scenario,
			'scenarioName': SCENARIO_NAMES.get(scenario, scenario),
			'generatedAt': datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC'),
			'tenantId': tenant_id,
			'pipelineId': pipeline_id or '',
			'topicCode': os.environ.get('PERF_TOPIC_CODE', ''),
			'dollBaseUrl': os.environ.get('DOLL_BASE_URL', ''),
			'lambdaFunctionUrl': os.environ.get('LAMBDA_FUNCTION_URL', ''),
		},
		'locust': locust_stats,
		'business': business,
		'resource': {
			'prometheus': resource_prom,
			'sqs': resource_sqs,
			'lambda': resource_lambda,
		},
	}


def render_report(data: dict[str, Any]) -> str:
	template = Template(TEMPLATE_PATH.read_text(), keep_trailing_newline=True)
	return template.render(**data)


@app.command()
def main(
	scenario: str = typer.Option(..., '--scenario', help='A / B / C / D'),
	out: str = typer.Option(..., '--out', help='output markdown path'),
	locust_stats: str | None = typer.Option(
		None, '--locust-stats', help='path to locust stats JSON (optional)'
	),
	window_minutes: int = typer.Option(15, '--window-minutes', help='CloudWatch lookback window'),
) -> None:
	data = _collect_all(scenario, locust_stats, window_minutes)
	out_path = Path(out)
	out_path.parent.mkdir(parents=True, exist_ok=True)
	out_path.write_text(render_report(data))
	# Also dump the raw data alongside for tooling
	(out_path.with_suffix('.json')).write_text(json.dumps(data, indent=2, default=str))
	print(f'[report] wrote {out_path} (+ {out_path.with_suffix(".json")})')


if __name__ == '__main__':
	app()
