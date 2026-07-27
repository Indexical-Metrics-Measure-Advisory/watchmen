"""Business-layer metrics: query doll's existing /pipeline/log/stats endpoint.

This endpoint (see
packages/watchmen-pipeline-surface/src/watchmen_pipeline_surface/data/monitor_log_router.py:92)
returns avgDurationMs / p95DurationMs / byStatus / insert/update/delete counts,
which gives us a zero-instrumentation view of pipeline-level performance.

Also exposes a helper to pull a sample of full PipelineMonitorLog entries for
stage/unit/action-level breakdowns (model: watchmen_model.pipeline_kernel.
pipeline_monitor_log.PipelineMonitorLog).
"""
from __future__ import annotations

import json
import os
import urllib.request
import urllib.error
from dataclasses import dataclass, field
from typing import Any


@dataclass
class PipelineLogStats:
	total: int = 0
	done: int = 0
	error: int = 0
	ignored: int = 0
	avg_duration_ms: int = 0
	p95_duration_ms: int = 0
	insert_count: int = 0
	update_count: int = 0
	delete_count: int = 0
	sample_size: int = 0

	@classmethod
	def from_dict(cls, d: dict[str, Any]) -> 'PipelineLogStats':
		by_status = d.get('byStatus') or {}
		return cls(
			total=d.get('total', 0),
			done=by_status.get('DONE', 0),
			error=by_status.get('ERROR', 0),
			ignored=by_status.get('IGNORED', 0),
			avg_duration_ms=d.get('avgDurationMs', 0),
			p95_duration_ms=d.get('p95DurationMs', 0),
			insert_count=d.get('insertCount', 0),
			update_count=d.get('updateCount', 0),
			delete_count=d.get('deleteCount', 0),
			sample_size=d.get('sampleSize', 0),
		)

	def to_dict(self) -> dict[str, Any]:
		return {
			'total': self.total,
			'byStatus': {'DONE': self.done, 'ERROR': self.error, 'IGNORED': self.ignored},
			'avgDurationMs': self.avg_duration_ms,
			'p95DurationMs': self.p95_duration_ms,
			'insertCount': self.insert_count,
			'updateCount': self.update_count,
			'deleteCount': self.delete_count,
			'sampleSize': self.sample_size,
		}


@dataclass
class CollectorCompletionStats:
	unfinished: int = 0
	finished: int = 0

	@property
	def completion_rate(self) -> float:
		total = self.finished + self.unfinished
		return (self.finished / total) if total > 0 else 0.0


class DollClient:
	"""Thin HTTP client for the doll business-metric endpoints."""

	def __init__(self, base_url: str | None = None, pat: str | None = None) -> None:
		self.base_url = (base_url or os.environ.get('DOLL_BASE_URL', 'http://watchmen_doll:8000')).rstrip('/')
		self.pat = pat or os.environ.get('PERF_PAT', '')

	def _post(self, path: str, body: dict) -> dict:
		req = urllib.request.Request(
			f'{self.base_url}{path}',
			data=json.dumps(body).encode(),
			headers={
				'Authorization': f'Bearer {self.pat}',
				'Content-Type': 'application/json',
				'Accept': 'application/json',
			},
			method='POST',
		)
		try:
			with urllib.request.urlopen(req, timeout=30) as resp:
				return json.loads(resp.read().decode() or '{}')
		except urllib.error.HTTPError as e:
			return {'error': e.code, 'detail': e.read().decode()[:200]}

	def _get(self, path: str) -> dict:
		req = urllib.request.Request(
			f'{self.base_url}{path}',
			headers={'Authorization': f'Bearer {self.pat}', 'Accept': 'application/json'},
		)
		try:
			with urllib.request.urlopen(req, timeout=30) as resp:
				return json.loads(resp.read().decode() or '{}')
		except urllib.error.HTTPError as e:
			return {'error': e.code, 'detail': e.read().decode()[:200]}

	def pipeline_log_stats(
		self,
		tenant_id: str | None = None,
		pipeline_id: str | None = None,
		sample_size: int = 500,
	) -> PipelineLogStats:
		body: dict[str, Any] = {'sampleSize': sample_size}
		if tenant_id:
			body['tenantId'] = tenant_id
		if pipeline_id:
			body['pipelineId'] = pipeline_id
		resp = self._post('/pipeline/log/stats', body)
		if 'error' in resp:
			return PipelineLogStats()
		return PipelineLogStats.from_dict(resp)

	def collector_completion(self) -> CollectorCompletionStats:
		# Both endpoints paginate; we only need counts here.
		finished = self._get('/collector/trigger/events/finished?page_number=1&page_size=1')
		unfinished = self._get('/collector/trigger/events/unfinished?page_number=1&page_size=1')
		return CollectorCompletionStats(
			finished=int((finished.get('itemCount') or finished.get('total') or 0)),
			unfinished=int((unfinished.get('itemCount') or unfinished.get('total') or 0)),
		)

	def sample_monitor_logs(self, sample_size: int = 50) -> list[dict]:
		resp = self._post('/pipeline/log', {
			'pageNumber': 1,
			'pageSize': sample_size,
		})
		return resp.get('data') or resp.get('items') or []


def collect_business_metrics(
	doll: DollClient | None = None,
	tenant_id: str | None = None,
	pipeline_id: str | None = None,
) -> dict[str, Any]:
	"""Pull a snapshot of business-layer metrics for the report generator."""
	doll = doll or DollClient()
	tenant_id = tenant_id or os.environ.get('PERF_TENANT_ID', '')
	stats = doll.pipeline_log_stats(tenant_id=tenant_id, pipeline_id=pipeline_id)
	completion = doll.collector_completion()
	sample = doll.sample_monitor_logs(sample_size=20)
	return {
		'pipelineLogStats': stats.to_dict(),
		'collectorCompletion': {
			'finished': completion.finished,
			'unfinished': completion.unfinished,
			'completionRate': round(completion.completion_rate, 4),
		},
		'sampleMonitorLogs': [
			{
				'spentInMills': log.get('spentInMills'),
				'status': log.get('status'),
				'pipelineId': log.get('pipelineId'),
				'traceId': log.get('traceId'),
			}
			for log in sample
		],
	}
