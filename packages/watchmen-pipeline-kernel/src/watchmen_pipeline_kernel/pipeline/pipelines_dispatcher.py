from typing import Callable, List, Optional

from watchmen_model.pipeline_kernel import PipelineMonitorLog
from watchmen_pipeline_kernel.common import PipelineKernelException
from watchmen_pipeline_kernel.pipeline_schema import RuntimePipelineContext
from watchmen_pipeline_kernel.topic import RuntimeTopicStorages


class PipelinesDispatcher:
	def __init__(self, contexts: List[RuntimePipelineContext], storages: RuntimeTopicStorages):
		self.contexts = contexts
		self.storages = storages

	def start(self, handle_monitor_log: Callable[[PipelineMonitorLog, bool], None]) -> None:
		context = self.next_context()
		if context is None:
			# no context needs to be invoked
			return None
		created_contexts = context.start(self.storages, handle_monitor_log)
		if len(created_contexts) != 0:
			# noinspection PyTypeChecker
			self.contexts.extend(created_contexts)
		# invoke next
		self.start(handle_monitor_log)

	def next_context(self) -> Optional[RuntimePipelineContext]:
		if len(self.contexts) == 0:
			return None
		# get next context
		context = self.contexts[0]
		if context is None:
			raise PipelineKernelException(f'Pipeline context is none, cannot be invoked.')
		# next context is ready, pop it
		self.contexts = self.contexts[1:]
		return context
