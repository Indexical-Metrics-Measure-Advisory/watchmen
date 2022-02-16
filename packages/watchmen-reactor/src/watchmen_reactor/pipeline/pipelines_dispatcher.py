from typing import List

from watchmen_auth import PrincipalService
from watchmen_model.reactor import PipelineTriggerTraceId
from watchmen_reactor.pipeline_schema import QueuedPipeline, TopicStorages


class PipelinesDispatcher:
	def __init__(
			self,
			pipelines: List[QueuedPipeline], storages: TopicStorages,
			principal_service: PrincipalService, trace_id: PipelineTriggerTraceId
	):
		pass

	def start(self) -> None:
		pass
