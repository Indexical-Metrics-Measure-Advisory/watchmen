import logging
from typing import Callable, List, Optional

from watchmen_model.pipeline_kernel import PipelineMonitorLog
from watchmen_pipeline_kernel.common import PipelineKernelException, ask_pipeline_recursion_limit
from watchmen_pipeline_kernel.pipeline_schema import RuntimePipelineContext
from watchmen_pipeline_kernel.topic import RuntimeTopicStorages


logger = logging.getLogger(__name__)


class PipelinesDispatcher:
	def __init__(self, contexts: List[RuntimePipelineContext], storages: RuntimeTopicStorages):
		self.contexts = contexts
		self.storages = storages
		self.pipelineRecursionLimit = ask_pipeline_recursion_limit()

	def start(self, handle_monitor_log: Callable[[PipelineMonitorLog, bool], None], limit: int = None) -> None:
		context = self.next_context()
		if context is None:
			# no context needs to be invoked
			return None
		created_contexts = context.start(self.storages, handle_monitor_log)
		if len(created_contexts) != 0:
			# noinspection PyTypeChecker
			self.contexts.extend(created_contexts)
		# invoke next
		try:
			if limit is None:
				self.start(handle_monitor_log, self.pipelineRecursionLimit)
			elif limit == 0:
				raise RecursionError("maximum recursion depth exceeded in comparison")
			else:
				self.start(handle_monitor_log, limit-1)
		except RecursionError as e:
			logger.error(e, exc_info=True, stack_info=True)
			raise e

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
