from copy import deepcopy
from logging import getLogger
from traceback import format_exc
from typing import Any, List

from watchmen_auth import PrincipalService
from watchmen_model.admin import Pipeline, PipelineStage, PipelineUnit
from watchmen_model.reactor import MonitorLogStage, MonitorLogStatus, MonitorLogUnit
from watchmen_reactor.common import ask_parallel_actions_in_loop_unit
from watchmen_reactor.pipeline_schema import TopicStorages
from watchmen_utilities import ArrayHelper, is_not_blank
from .compiled_action import compile_actions, CompiledAction
from .runtime import CreateQueuePipeline, now, parse_prerequisite_defined_as, parse_prerequisite_in_memory, \
	PipelineVariables, spent_ms

logger = getLogger(__name__)


class CompiledUnit:
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

	def run(
			self, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, stage_monitor_log: MonitorLogStage,
			storages: TopicStorages, principal_service: PrincipalService) -> bool:
		"""
		returns True means continue, False means something wrong occurred, break the following
		"""
		loop_variable_name = self.loopVariableName
		if self.hasLoop:
			# note variables CANNOT be passed from inside of loop, which means even variables are changed in loop,
			# the next loop will not be impacted, and also will not impact steps followed
			def clone_variables(replaced: Any) -> PipelineVariables:
				cloned = variables.clone()
				cloned.put(loop_variable_name, deepcopy(replaced))
				return cloned

			loop_variable_value = variables.find(loop_variable_name)
			if loop_variable_value is None:
				# no value or it is none, run once
				return self.do_run(
					variables=clone_variables(variables), new_pipeline=new_pipeline,
					stage_monitor_log=stage_monitor_log, storages=storages, principal_service=principal_service)
			elif isinstance(loop_variable_value, list):
				# a list, run for each element
				def run_element_in_loop(replaced: Any) -> bool:
					return self.do_run(
						variables=clone_variables(replaced), new_pipeline=new_pipeline,
						stage_monitor_log=stage_monitor_log, storages=storages, principal_service=principal_service)

				if ask_parallel_actions_in_loop_unit():
					# TODO parallel version, now use sequential version
					return ArrayHelper(loop_variable_value).every(run_element_in_loop)
				else:
					# sequential version
					return ArrayHelper(loop_variable_value).every(run_element_in_loop)
			else:
				# not a list, run once
				return self.do_run(
					variables=clone_variables(variables), new_pipeline=new_pipeline,
					stage_monitor_log=stage_monitor_log,
					storages=storages, principal_service=principal_service)
		else:
			# no loop declared
			return self.do_run(
				variables=variables, new_pipeline=new_pipeline, stage_monitor_log=stage_monitor_log,
				storages=storages, principal_service=principal_service)

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
			units=[]
		)
		stage_monitor_log.stages.append(unit_monitor_log)

		try:
			# test prerequisite
			prerequisite = self.prerequisiteTest(variables, principal_service)
			if not prerequisite:
				unit_monitor_log.prerequisite = False
				unit_monitor_log.status = MonitorLogStatus.DONE
				all_run = True
			else:
				unit_monitor_log.prerequisite = True

				def run(should_run, action: CompiledAction) -> bool:
					return self.run_action(
						should_run=should_run, action=action, variables=variables,
						new_pipeline=new_pipeline, unit_monitor_log=unit_monitor_log,
						storages=storages, principal_service=principal_service)

				all_run = ArrayHelper(self.actions).reduce(lambda should_run, x: run(should_run, x), True)
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


def compile_units(pipeline: Pipeline, stage: PipelineStage, principal_service: PrincipalService) -> List[CompiledUnit]:
	units = stage.units
	if units is None or len(units) == 0:
		return []
	else:
		return ArrayHelper(units).map(lambda x: CompiledUnit(pipeline, stage, x, principal_service)).to_list()
