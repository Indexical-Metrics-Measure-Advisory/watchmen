from __future__ import annotations

from abc import abstractmethod
from typing import Any, Dict, List, Optional

from watchmen_auth import PrincipalService
from watchmen_model.admin import Pipeline
from watchmen_model.reactor import PipelineTriggerTraceId
from watchmen_reactor.topic_schema import TopicSchema
from watchmen_storage import TopicDataStorageSPI


class TopicStorages:
	@abstractmethod
	def ask_topic_storage(self, schema: TopicSchema) -> TopicDataStorageSPI:
		pass


class PipelineContext:
	@abstractmethod
	def start(self, storages: TopicStorages) -> List[PipelineContext]:
		pass


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
