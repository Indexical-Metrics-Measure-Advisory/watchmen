from logging import getLogger
from traceback import format_exc
from typing import List, Tuple

from watchmen_auth import PrincipalService
from watchmen_data_kernel.storage_bridge import now, parse_prerequisite_defined_as, parse_prerequisite_in_memory, \
	PipelineVariables, spent_ms
from watchmen_model.admin import Pipeline, PipelineStage, PipelineUnit, is_aggregation_topic
from watchmen_model.pipeline_kernel import MonitorLogStage, MonitorLogStatus, MonitorLogUnit
from watchmen_pipeline_kernel.common.exception import PipelineKernelException
from watchmen_pipeline_kernel.pipeline_schema.compiled_action import compile_actions, CompiledAction, \
	CompiledStorageAction
from watchmen_pipeline_kernel.pipeline_schema_interface import CreateQueuePipeline, TopicStorages
from watchmen_utilities import ArrayHelper, is_not_blank

logger = getLogger(__name__)


class CompiledSingleUnit:
	"""
	unit with no loop. looped unit will be executed on several single unit
	"""

	def __init__(
			self, pipeline: Pipeline, stage: PipelineStage, unit: PipelineUnit,
			principal_service: PrincipalService):
		self.pipeline = pipeline
		self.stage = stage
		self.unit = unit
		self.prerequisiteDefinedAs = parse_prerequisite_defined_as(unit, principal_service)
		self.prerequisiteTest = parse_prerequisite_in_memory(unit, principal_service)
		self.loopVariableName = unit.loopVariableName
		self.hasLoop = is_not_blank(self.loopVariableName)
		self.actions = compile_actions(pipeline, stage, unit, principal_service)
		# Cached at compile time, reused by _get_managed_storage at run time to avoid
		# re-scanning self.actions on every single unit execution.
		self.managed_storage_action = None
		self.transaction_strategy = self._determine_transaction_strategy()

	def _determine_transaction_strategy(self) -> str:
		"""
		Determine the transaction strategy at compile time.
		- 'none': no storage actions, no transaction needed
		- 'action_level': aggregation topic or multiple data sources, degrade to per-action
		- 'unit_level': single data source, all non-aggregation, use unit-level transaction
		"""
		storage_actions = ArrayHelper(self.actions) \
			.filter(lambda x: isinstance(x, CompiledStorageAction)) \
			.to_list()

		# No storage actions (Alarm, CopyToMemory, WriteToExternal only)
		if len(storage_actions) == 0:
			return 'none'

		# Collect topics and data source IDs from storage actions
		data_source_ids = set()
		for action in storage_actions:
			topic = action.get_topic()
			if topic is not None:
				# Check for aggregation topic
				if is_aggregation_topic(topic):
					return 'action_level'
				if topic.dataSourceId is not None:
					data_source_ids.add(topic.dataSourceId)
			# Cache the first storage action carrying a schema; in unit_level mode all
			# storage actions share the same data source, so the first one is representative.
			if self.managed_storage_action is None and action.schema is not None:
				self.managed_storage_action = action

		# Check for multiple data sources
		if len(data_source_ids) > 1:
			return 'action_level'

		# No valid data source id found (e.g., all topics have None dataSourceId)
		# Degrade to action_level to avoid invalid managed transaction
		if len(data_source_ids) == 0:
			return 'action_level'

		# Single data source, all non-aggregation
		return 'unit_level'

	def run(
			self, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, stage_monitor_log: MonitorLogStage,
			storages: TopicStorages, principal_service: PrincipalService) -> bool:
		return self.do_run(
			variables, new_pipeline, stage_monitor_log, storages, principal_service)

	def do_run(
			self, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, stage_monitor_log: MonitorLogStage,
			storages: TopicStorages, principal_service: PrincipalService) -> bool:
		loop_variable_name = self.loopVariableName
		if self.hasLoop:
			loop_variable_value = variables.find(loop_variable_name)
		else:
			loop_variable_value = None
		unit_monitor_log = MonitorLogUnit(
			unitId=self.unit.unitId, name=self.unit.name,
			status=MonitorLogStatus.DONE, startTime=now(), spentInMills=0, error=None,
			loopVariableName=self.loopVariableName, loopVariableValue=loop_variable_value,
			actions=[]
		)
		stage_monitor_log.units.append(unit_monitor_log)

		try:
			# test prerequisite
			prerequisite = self.prerequisiteTest(variables, principal_service)
			if not prerequisite:
				unit_monitor_log.prerequisite = False
				unit_monitor_log.status = MonitorLogStatus.DONE
				all_run = True
			else:
				unit_monitor_log.prerequisite = True

				# Dispatch based on transaction strategy
				if self.transaction_strategy == 'unit_level':
					all_run = self._do_run_with_unit_transaction(
						variables, new_pipeline, unit_monitor_log, storages, principal_service)
				else:
					all_run = self._do_run_without_transaction(
						variables, new_pipeline, unit_monitor_log, storages, principal_service)

				if all_run:
					unit_monitor_log.status = MonitorLogStatus.DONE
				else:
					unit_monitor_log.status = MonitorLogStatus.ERROR
		except Exception as e:
			# treat exception on test prerequisite as ignore, and log error
			logger.error(e, exc_info=True, stack_info=True)
			unit_monitor_log.status = MonitorLogStatus.ERROR
			unit_monitor_log.error = format_exc()
			all_run = False

		unit_monitor_log.spentInMills = spent_ms(unit_monitor_log.startTime)

		return all_run

	def _do_run_without_transaction(
			self, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, unit_monitor_log: MonitorLogUnit,
			storages: TopicStorages, principal_service: PrincipalService) -> bool:
		"""Run actions without managed transaction (current AUTOCOMMIT behavior)."""
		def run(should_run, action: CompiledAction) -> bool:
			return self.run_action(
				should_run=should_run, action=action, variables=variables,
				new_pipeline=new_pipeline, unit_monitor_log=unit_monitor_log,
				storages=storages, principal_service=principal_service)
		return ArrayHelper(self.actions).reduce(lambda should_run, x: run(should_run, x), True)

	def _do_run_with_unit_transaction(
			self, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, unit_monitor_log: MonitorLogUnit,
			storages: TopicStorages, principal_service: PrincipalService) -> bool:
		"""
		Run actions with unit-level managed transaction.
		Buffers new_pipeline calls and flushes them only on commit.
		If the storage does not support managed transactions (e.g., MongoDB),
		degrades to action_level behavior automatically.
		"""
		storage = self._get_managed_storage(storages)
		storage.begin_managed()

		# If storage doesn't support managed transactions (e.g., MongoDB inherits no-op),
		# degrade to action_level behavior to avoid false atomicity guarantee
		if not storage.is_managed():
			return self._do_run_without_transaction(
				variables, new_pipeline, unit_monitor_log, storages, principal_service)

		buffered_pipelines: List[Tuple] = []

		def buffered_new_pipeline(schema, trigger) -> None:
			buffered_pipelines.append((schema, trigger))

		try:
			def run(should_run, action: CompiledAction) -> bool:
				return self.run_action(
					should_run=should_run, action=action, variables=variables,
					new_pipeline=buffered_new_pipeline, unit_monitor_log=unit_monitor_log,
					storages=storages, principal_service=principal_service)
			all_run = ArrayHelper(self.actions).reduce(lambda should_run, x: run(should_run, x), True)
		except Exception:
			storage.end_managed(False)
			raise

		if all_run:
			storage.end_managed(True)
			# Flush buffered downstream pipeline triggers only after successful commit
			for schema, trigger in buffered_pipelines:
				new_pipeline(schema, trigger)
		else:
			storage.end_managed(False)
			# Discard buffered downstream pipeline triggers on failure

		return all_run

	def _get_managed_storage(self, storages: TopicStorages):
		"""
		Get the storage instance for managed transaction.
		In unit_level mode, all storage actions share the same data source,
		so the first storage action (cached at compile time) is representative.
		"""
		if self.managed_storage_action is not None:
			return storages.ask_topic_storage(self.managed_storage_action.schema)
		# Should not reach here in unit_level mode
		raise PipelineKernelException('No storage action found for managed transaction.')

	# noinspection PyMethodMayBeStatic
	def run_action(
			self, should_run: bool,
			action: CompiledAction, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, unit_monitor_log: MonitorLogUnit,
			storages: TopicStorages, principal_service: PrincipalService
	) -> bool:
		if not should_run:
			return False
		else:
			return action.run(
				variables=variables, new_pipeline=new_pipeline, unit_monitor_log=unit_monitor_log,
				storages=storages, principal_service=principal_service)
