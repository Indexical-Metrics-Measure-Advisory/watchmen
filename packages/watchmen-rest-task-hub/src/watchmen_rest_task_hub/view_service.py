from collections import defaultdict
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

from watchmen_model.common import Pageable
from watchmen_task_hub.meta.common import value_of
from watchmen_task_hub.model import RefRole, TaskRunStatus

from .adapter_registry import task_adapter_registry
from .dependencies import TaskHubServices
from .serializers import alert_to_dict
from .settings import taskhub_settings


class TaskHubViewService:
	def __init__(self, services: TaskHubServices):
		self.services = services

	def build_map(self) -> Dict[str, Any]:
		tenant_id = self.services.principal.get_tenant_id()
		tasks = self.services.tasks.find_all(tenant_id)
		assets: Dict[str, Dict[str, Any]] = {}
		for task in tasks:
			refs = self.services.refs.find_by_task_id(task.taskId, tenant_id)
			for ref in refs:
				if ref.unresolved:
					continue
				asset_id = f'{value_of(ref.refType)}:{ref.targetId}'
				asset = assets.setdefault(asset_id, {
					'id': asset_id, 'name': ref.targetName or ref.targetId, 'type': value_of(ref.refType),
					'description': ref.targetName or ref.targetId, 'readiness': 'UNKNOWN',
					'builderTaskIds': [], 'upstreamAssetIds': [], 'downstreamAssetIds': [], 'owner': task.ownerId
				})
				if value_of(ref.role) == RefRole.TARGET.value and task.taskId not in asset['builderTaskIds']:
					asset['builderTaskIds'].append(task.taskId)
			targets = [ref for ref in refs if value_of(ref.role) == RefRole.TARGET.value and not ref.unresolved]
			sources = [ref for ref in refs if value_of(ref.role) == RefRole.SOURCE.value and not ref.unresolved]
			for source in sources:
				source_id = f'{value_of(source.refType)}:{source.targetId}'
				for target in targets:
					target_id = f'{value_of(target.refType)}:{target.targetId}'
					if target_id not in assets[source_id]['downstreamAssetIds']:
						assets[source_id]['downstreamAssetIds'].append(target_id)
					if source_id not in assets[target_id]['upstreamAssetIds']:
						assets[target_id]['upstreamAssetIds'].append(source_id)
		rows = list(assets.values())[:taskhub_settings.TASKHUB_MAP_MAX_NODES]
		for asset in rows:
			builder_runs = []
			for task_id in asset['builderTaskIds']:
				builder_runs.extend(self.services.runs.find_by_process_date(task_id, date.today(), tenant_id))
			if builder_runs:
				latest = max(builder_runs, key=lambda run: (run.createdAt or datetime.min, run.runId or ''))
				status = value_of(latest.status)
				asset['readiness'] = 'FRESH' if status == TaskRunStatus.SUCCESS.value else \
					'FAILED' if status in (TaskRunStatus.FAILED.value, TaskRunStatus.CANCELLED.value) else 'UNKNOWN'
				asset['lastBuiltAt'] = latest.finishedAt
				asset['rowCount'] = latest.rowCount
		return {'assets': rows, 'tasks': [task.to_dict() for task in tasks]}

	def timeline(self, process_date: Optional[date]) -> List[Dict[str, Any]]:
		tenant_id = self.services.principal.get_tenant_id()
		page = self.services.runs.find_page(
			None, None, None, process_date, None, tenant_id, Pageable(pageNumber=1, pageSize=200))
		rows = []
		for run in page.data or []:
			task = self.services.tasks.find_by_task_id(run.taskId, tenant_id)
			if task is None or run.startedAt is None:
				continue
			duration = (run.durationMs or 0) / 3600000
			rows.append({
				'taskId': run.taskId, 'start': run.startedAt.hour + run.startedAt.minute / 60,
				'duration': duration, 'actualStart': run.startedAt.hour + run.startedAt.minute / 60,
				'actualDuration': duration, 'status': value_of(run.status),
				'label': run.instanceKey, 'risk': value_of(run.status) == TaskRunStatus.WAITING.value
			})
		return rows

	def overview(self) -> Dict[str, Any]:
		tenant_id = self.services.principal.get_tenant_id()
		page = self.services.runs.find_page(
			None, None, None, None, None, tenant_id, Pageable(pageNumber=1, pageSize=200))
		today = date.today()
		trend = []
		for offset in range(6, -1, -1):
			day = today - timedelta(days=offset)
			runs = [run for run in page.data or [] if run.finishedAt is not None and run.finishedAt.date() == day]
			succeeded = [run for run in runs if value_of(run.status) == TaskRunStatus.SUCCESS.value]
			trend.append({
				'day': day.strftime('%m/%d'), 'rate': round(len(succeeded) / len(runs) * 100, 1) if runs else 0,
				'runs': len(runs)
			})
		return {
			'successTrend': trend,
			'cluster': {
				'nodes': [], 'sharedStoreStatus': 'CONNECTED', 'activeLocks': 0,
				'rejectedDuplicateDispatches': 0, 'failovers24h': 0
			}
		}

	def adapters(self) -> List[Dict[str, Any]]:
		tenant_id = self.services.principal.get_tenant_id()
		tasks = self.services.tasks.find_all(tenant_id)
		result = []
		for adapter in task_adapter_registry.list():
			state = self.services.sync_states.find_by_adapter(adapter.name, tenant_id)
			result.append({
				'id': adapter.name, 'name': adapter.name, 'engine': adapter.task_type.value,
				'state': value_of(state.status) if state is not None else 'UNSYNCED',
				'lagSeconds': 0, 'lastSyncAt': state.lastSyncAt if state is not None else None,
				'taskCount': len([task for task in tasks if value_of(task.taskType) == adapter.task_type.value])
			})
		return result

	def recent_alerts(self, page: int, page_size: int):
		return self.services.alert_events.find_recent(
			self.services.principal.get_tenant_id(), Pageable(pageNumber=page, pageSize=page_size))
