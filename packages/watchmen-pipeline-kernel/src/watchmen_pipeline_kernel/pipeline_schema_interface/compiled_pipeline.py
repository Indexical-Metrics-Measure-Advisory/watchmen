from abc import abstractmethod
from typing import Any, Callable, Dict, List, Optional

from watchmen_auth import PrincipalService
from watchmen_model.admin import Pipeline
from watchmen_model.pipeline_kernel import PipelineMonitorLog, PipelineTriggerTraceId
from .pipeline_context import PipelineContext
from .topic_storages import TopicStorages


# noinspection PyClassHasNoInit
class CompiledPipeline:
	@abstractmethod
	def get_pipeline(self) -> Pipeline:
		pass

	@abstractmethod
	def run(
			self,
			previous_data: Optional[Dict[str, Any]], current_data: Optional[Dict[str, Any]],
			principal_service: PrincipalService, trace_id: PipelineTriggerTraceId, data_id: int,
			storages: TopicStorages,
			handle_monitor_log: Callable[[PipelineMonitorLog, bool], None]
	) -> List[PipelineContext]:
		pass
