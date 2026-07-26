from __future__ import annotations

from typing import Any, Dict, List, Optional

from operation_cli.http_client import RestClient

# Pipeline monitor log status values (see watchmen_model.pipeline_kernel.MonitorLogStatus).
PIPELINE_STATUS_ERROR = 'ERROR'
PIPELINE_STATUS_DONE = 'DONE'
PIPELINE_STATUS_IGNORED = 'IGNORED'

# Ingest trigger event status values (see watchmen_collector_kernel.model.status.Status).
# INITIAL=0, EXECUTING=1, SUCCESS=2, FAIL=3, WAITING=4.
INGEST_STATUS_FAIL = 3


class OperationService:
	def __init__(self, client: RestClient, tenant_id: Optional[str] = None) -> None:
		self.client = client
		self.tenant_id = tenant_id

	# ------------------------------------------------------------------
	# Pipeline monitor errors
	# ------------------------------------------------------------------

	def pipeline_errors(
		self,
		page_number: int = 1,
		page_size: int = 50,
		topic_id: Optional[str] = None,
		pipeline_id: Optional[str] = None,
		start_date: Optional[str] = None,
		end_date: Optional[str] = None,
		trace_id: Optional[str] = None,
	) -> Dict[str, Any]:
		"""Fetch the latest pipeline runtime error logs (POST /pipeline/log, status=ERROR)."""
		payload: Dict[str, Any] = {
			'status': PIPELINE_STATUS_ERROR,
			'pageNumber': page_number,
			'pageSize': page_size,
		}
		if self.tenant_id:
			payload['tenantId'] = self.tenant_id
		if topic_id:
			payload['topicId'] = topic_id
		if pipeline_id:
			payload['pipelineId'] = pipeline_id
		if start_date:
			payload['startDate'] = start_date
		if end_date:
			payload['endDate'] = end_date
		if trace_id:
			payload['traceId'] = trace_id
		return self.client.post_json('/pipeline/log', payload=payload)

	def pipeline_stats(
		self,
		topic_id: Optional[str] = None,
		pipeline_id: Optional[str] = None,
		start_date: Optional[str] = None,
		end_date: Optional[str] = None,
		sample_size: Optional[int] = None,
	) -> Dict[str, Any]:
		"""Fetch pipeline monitor log statistics (POST /pipeline/log/stats)."""
		payload: Dict[str, Any] = {}
		if self.tenant_id:
			payload['tenantId'] = self.tenant_id
		if topic_id:
			payload['topicId'] = topic_id
		if pipeline_id:
			payload['pipelineId'] = pipeline_id
		if start_date:
			payload['startDate'] = start_date
		if end_date:
			payload['endDate'] = end_date
		if sample_size is not None:
			payload['sampleSize'] = sample_size
		return self.client.post_json('/pipeline/log/stats', payload=payload)

	# ------------------------------------------------------------------
	# Ingest / collector errors
	# ------------------------------------------------------------------

	def ingest_events(
		self,
		page_number: int = 1,
		page_size: int = 50,
	) -> Dict[str, Any]:
		"""Fetch the latest trigger events for the tenant (POST /ingest/monitor/event)."""
		payload = {'pageNumber': page_number, 'pageSize': page_size}
		return self.client.post_json('/ingest/monitor/event', payload=payload)

	def ingest_failed_events(
		self,
		page_number: int = 1,
		page_size: int = 50,
	) -> Dict[str, Any]:
		"""Fetch trigger events and keep only failed ones (status == FAIL=3).

		/ingest/monitor/event does not accept a server-side status filter, so we
		filter client-side.
		"""
		page = self.ingest_events(page_number=page_number, page_size=page_size)
		data = page.get('data') if isinstance(page, dict) else None
		if isinstance(data, list):
			page = dict(page)
			page['data'] = [event for event in data if event.get('status') == INGEST_STATUS_FAIL]
			page['itemCount'] = len(page['data'])
			page['pageCount'] = 1 if page['data'] else 0
		return page

	def ingest_event_detail(self, trigger_event_id: int) -> Any:
		"""Fetch per-table detail (including errors count) for one trigger event."""
		return self.client.get_json(
			'/ingest/monitor/event/detail',
			params={'trigger_event_id': trigger_event_id},
		)

	def ingest_event_stats(self, sample_size: Optional[int] = None) -> Dict[str, Any]:
		"""Fetch trigger event statistics (POST /ingest/monitor/event/stats)."""
		payload: Dict[str, Any] = {}
		if sample_size is not None:
			payload['sampleSize'] = sample_size
		return self.client.post_json('/ingest/monitor/event/stats', payload=payload)

	def ingest_trigger_online(self) -> List[Any]:
		"""Fetch the latest 10 online triggers (POST /ingest/monitor/trigger-online)."""
		return self.client.get_json('/ingest/monitor/trigger-online')
