from typing import Protocol

import requests

from ..meta.common import value_of
from ..model.run import TaskRun
from ..model.task import TaskDefinition


class TaskCallbackNotifier(Protocol):
	def notify(self, task: TaskDefinition, run: TaskRun) -> None: ...


class HttpTaskCallbackNotifier:
	def notify(self, task: TaskDefinition, run: TaskRun) -> None:
		config = task.callback
		if not config.enabled or not config.url or value_of(run.triggerType) != 'API' \
				or value_of(run.status) not in config.events:
			return
		payload = {
			'runId': run.runId,
			'taskId': task.taskId,
			'taskName': task.name,
			'tenantId': run.tenantId,
			'instanceKey': run.instanceKey,
			'attempt': run.attempt,
			'processDate': run.processDate.isoformat() if run.processDate is not None else None,
			'status': value_of(run.status),
			'triggerType': value_of(run.triggerType),
			'startedAt': run.startedAt.isoformat() if run.startedAt is not None else None,
			'finishedAt': run.finishedAt.isoformat() if run.finishedAt is not None else None,
			'durationMs': run.durationMs,
			'rowCount': run.rowCount,
			'errorMessage': run.errorMessage,
			'resultRefs': run.resultRefs or {}
		}
		response = requests.post(config.url, json=payload, headers={
			'X-TaskHub-Event': value_of(run.status), 'X-TaskHub-Run-Id': run.runId
		}, timeout=config.timeoutSeconds, allow_redirects=False)
		response.raise_for_status()
