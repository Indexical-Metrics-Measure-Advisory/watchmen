from __future__ import annotations

from abc import abstractmethod
from typing import Any, Dict, List, Optional

from watchmen_auth import PrincipalService
from watchmen_model.admin import Pipeline
from watchmen_model.reactor import PipelineTriggerTraceId
from watchmen_reactor.pipeline_schema_interface import PipelineContext, TopicStorages


class CompiledPipeline:
	@abstractmethod
	def get_pipeline(self) -> Pipeline:
		pass

	@abstractmethod
	def run(
			self,
			previous_data: Optional[Dict[str, Any]], current_data: Optional[Dict[str, Any]],
			principal_service: PrincipalService, trace_id: PipelineTriggerTraceId,
			storages: TopicStorages
	) -> List[PipelineContext]:
		pass
