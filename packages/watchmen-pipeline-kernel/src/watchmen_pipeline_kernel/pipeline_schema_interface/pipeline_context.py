from __future__ import annotations

from abc import abstractmethod
from typing import Callable, List

from watchmen_model.pipeline_kernel import PipelineMonitorLog
from .topic_storages import TopicStorages


# noinspection PyClassHasNoInit
class PipelineContext:
	@abstractmethod
	def start(
			self, storages: TopicStorages,
			handle_monitor_log: Callable[[PipelineMonitorLog, bool], None]
	) -> List[PipelineContext]:
		pass
