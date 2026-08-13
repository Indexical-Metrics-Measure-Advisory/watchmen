from typing import List, Optional

from watchmen_auth import PrincipalService
from watchmen_model.common import TenantId, TopicId
from watchmen_model.pipeline_kernel import (
	MonitorLogStatus, PipelineMonitorLog, PipelineMonitorLogCriteria
)
from watchmen_pipeline_kernel.monitor_log import PipelineMonitorLogDataService


class PipelineAdapter:
	"""Read-only access to pipeline execution monitoring logs.

	Pipeline failure / performance sensing derives from these logs (section 16/17)
	instead of subscribing to the pipeline engine directly.
	"""

	def __init__(self, principal_service: PrincipalService):
		self.principalService = principal_service
		self.dataService = PipelineMonitorLogDataService(principal_service)

	def find_recent_logs(
			self, tenant_id: TenantId, topic_id: Optional[TopicId] = None,
			page_size: int = 50
	) -> List[PipelineMonitorLog]:
		# PipelineMonitorLogCriteria extends Pageable, so pageNumber/pageSize are
		# direct fields.
		criteria = PipelineMonitorLogCriteria(
			tenantId=tenant_id, topicId=topic_id, pageNumber=1, pageSize=page_size)
		try:
			page = self.dataService.page(criteria)
			return list(page.data or [])
		except Exception:
			# raw_pipeline_monitor_log topic may not be provisioned.
			return []

	def find_recent_failures(
			self, tenant_id: TenantId, page_size: int = 50
	) -> List[PipelineMonitorLog]:
		criteria = PipelineMonitorLogCriteria(
			tenantId=tenant_id, status=MonitorLogStatus.ERROR,
			pageNumber=1, pageSize=page_size)
		try:
			page = self.dataService.page(criteria)
			return list(page.data or [])
		except Exception:
			return []

	def find_last_log(
			self, data_id: int, topic_id: TopicId, tenant_id: TenantId
	) -> Optional[PipelineMonitorLog]:
		try:
			return self.dataService.find_last(data_id, topic_id, tenant_id)
		except Exception:
			return None

	@staticmethod
	def is_failure(log: PipelineMonitorLog) -> bool:
		status = getattr(log, 'status', None)
		if status is None:
			return False
		# MonitorLogStatus.ERROR marks a failed pipeline run.
		try:
			return status == MonitorLogStatus.ERROR
		except Exception:
			return str(status).lower() == 'error'
