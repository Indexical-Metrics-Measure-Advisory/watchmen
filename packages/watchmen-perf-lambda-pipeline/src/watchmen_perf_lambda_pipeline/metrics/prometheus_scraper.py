"""Resource-layer: scrape Prometheus /metrics from the doll and LocalStack.

The doll exposes starlette-prometheus metrics at /metrics when PROMETHEUS=true
(see packages/watchmen-rest/src/watchmen_rest/prometheus.py:6 and
packages/watchmen-rest/src/watchmen_rest/settings.py:29).

LocalStack exposes its own metrics at /_prometheus/metrics.
"""
from __future__ import annotations

import os
import re
import urllib.request
import urllib.error
from dataclasses import dataclass, field
from typing import Any


@dataclass
class PrometheusSnapshot:
	# starlette_prometheus histograms for the doll HTTP layer
	http_requests_total: float = 0.0
	http_request_duration_p95_ms: float = 0.0
	# LocalStack-side counters (best-effort)
	localstack_lambda_invocations: float = 0.0
	localstack_lambda_errors: float = 0.0
	raw: str = ''

	def to_dict(self) -> dict[str, Any]:
		return {
			'httpRequestsTotal': self.http_requests_total,
			'httpRequestDurationP95Ms': self.http_request_duration_p95_ms,
			'localstackLambdaInvocations': self.localstack_lambda_invocations,
			'localstackLambdaErrors': self.localstack_lambda_errors,
		}


def _fetch_text(url: str, timeout: int = 15) -> str:
	req = urllib.request.Request(url, headers={'Accept': 'text/plain'})
	try:
		with urllib.request.urlopen(req, timeout=timeout) as resp:
			return resp.read().decode()
	except urllib.error.HTTPError as e:
		return f'# fetch error {e.code} {url}\n'
	except Exception as e:  # noqa: BLE001
		return f'# fetch error {url} {e}\n'


def _parse_histogram_quantile(text: str, metric_name: str, quantile: float) -> float:
	# starlette_prometheus emits lines like:
	#   http_request_duration_seconds_bucket{le="0.95"} 0.0
	# We approximate p95 by reading the bucket labelled le="0.95" of the sum.
	pattern = re.compile(
		rf'{re.escape(metric_name)}_bucket\{{[^}}]*le="{quantile}"[^}}]*\}}\s+([0-9.eE+-]+)'
	)
	match = pattern.search(text)
	return float(match.group(1)) if match else 0.0


def _parse_counter(text: str, metric_name: str) -> float:
	# Sum all matching lines (counter may have labels).
	pattern = re.compile(rf'^{re.escape(metric_name)}(?:\{{[^}}]*\}})?\s+([0-9.eE+-]+)', re.MULTILINE)
	total = 0.0
	for match in pattern.finditer(text):
		total += float(match.group(1))
	return total


def collect_prometheus_snapshot(
	doll_base_url: str | None = None,
	localstack_base_url: str | None = None,
) -> PrometheusSnapshot:
	doll_base_url = (doll_base_url or os.environ.get('DOLL_BASE_URL', 'http://watchmen_doll:8000')).rstrip('/')
	localstack_base_url = (localstack_base_url or os.environ.get('AWS_ENDPOINT_URL', 'http://localstack:4566')).rstrip('/')

	doll_metrics = _fetch_text(f'{doll_base_url}/metrics')
	ls_metrics = _fetch_text(f'{localstack_base_url}/_prometheus/metrics')

	snap = PrometheusSnapshot(raw=f'{doll_metrics}\n{ls_metrics}')
	# starlette_prometheus uses http_requests_total and http_request_duration_seconds
	snap.http_requests_total = _parse_counter(doll_metrics, 'http_requests_total')
	snap.http_request_duration_p95_ms = _parse_histogram_quantile(
		doll_metrics, 'http_request_duration_seconds', 0.95
	) * 1000
	# LocalStack publishes aws_lambda_invocations / aws_lambda_errors (best-effort)
	snap.localstack_lambda_invocations = _parse_counter(ls_metrics, 'aws_lambda_invocations_total')
	snap.localstack_lambda_errors = _parse_counter(ls_metrics, 'aws_lambda_errors_total')
	return snap
