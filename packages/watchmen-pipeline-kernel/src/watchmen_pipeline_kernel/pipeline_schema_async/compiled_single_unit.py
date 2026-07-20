from logging import getLogger
from traceback import format_exc
from typing import List

from watchmen_auth import PrincipalService
from watchmen_data_kernel.storage_bridge import now, parse_prerequisite_defined_as, parse_prerequisite_in_memory, \
	PipelineVariables, spent_ms
from watchmen_model.admin import Pipeline, PipelineStage, PipelineUnit
from watchmen_model.pipeline_kernel import MonitorLogStage, MonitorLogStatus, MonitorLogUnit
from watchmen_pipeline_kernel.pipeline_schema_async.compiled_action import AsyncCompiledAction, \
	compile_async_actions
from .create_queue_pipeline import CreateQueuePipeline
from .topic_storages import AsyncTopicStorages
from watchmen_utilities import ArrayHelper, is_not_blank

logger = getLogger(__name__)


class AsyncCompiledSingleUnit:
	"""
	async unit with no loop. looped unit will be executed on several single unit
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
		self.actions = compile_async_actions(pipeline, stage, unit, principal_service)

	async def run(
			self, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, stage_monitor_log: MonitorLogStage,
			storages: AsyncTopicStorages, principal_service: PrincipalService) -> bool:
		return await self.do_run(
			variables, new_pipeline, stage_monitor_log, storages, principal_service)

	async def do_run(
			self, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, stage_monitor_log: MonitorLogStage,
			storages: AsyncTopicStorages, principal_service: PrincipalService) -> bool:
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
				# sequential async reduce (replaces sync ArrayHelper.reduce)
				all_run = True
				for action in self.actions:
					all_run = await self.run_action(
						should_run=all_run, action=action, variables=variables,
						new_pipeline=new_pipeline, unit_monitor_log=unit_monitor_log,
						storages=storages, principal_service=principal_service)
					if not all_run:
						break
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

	# noinspection PyMethodMayBeStatic
	async def run_action(
			self, should_run: bool,
			action: AsyncCompiledAction, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, unit_monitor_log: MonitorLogUnit,
			storages: AsyncTopicStorages, principal_service: PrincipalService
	) -> bool:
		if not should_run:
			return False
		else:
			return await action.run(
				variables=variables, new_pipeline=new_pipeline, unit_monitor_log=unit_monitor_log,
				storages=storages, principal_service=principal_service)
