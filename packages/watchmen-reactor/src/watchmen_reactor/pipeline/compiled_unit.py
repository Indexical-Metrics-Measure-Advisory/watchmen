from copy import deepcopy
from typing import Any, List

from watchmen_auth import PrincipalService
from watchmen_model.admin import Pipeline, PipelineStage, PipelineUnit
from watchmen_model.reactor import MonitorLogStage, MonitorLogStatus, MonitorLogUnit
from watchmen_reactor.common import ask_parallel_actions_in_loop_unit
from watchmen_utilities import ArrayHelper, is_not_blank
from .compiled_action import compile_actions, CompiledAction
from .runtime import CreateQueuePipeline, now, parse_conditional, parse_prerequisite_defined_as, PipelineVariables, \
	spent_ms


class CompiledUnit:
	def __init__(self, pipeline: Pipeline, stage: PipelineStage, unit: PipelineUnit):
		self.pipeline = pipeline
		self.stage = stage
		self.unit = unit
		self.prerequisiteDefinedAs = parse_prerequisite_defined_as(pipeline)
		self.prerequisiteTest = parse_conditional(pipeline)
		self.loopVariableName = unit.loopVariableName
		self.hasLoop = is_not_blank(self.loopVariableName)
		self.actions = compile_actions(pipeline, stage, unit)

	def run(
			self, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, stage_monitor_log: MonitorLogStage,
			principal_service: PrincipalService) -> bool:
		"""
		returns True means continue, False means something wrong occurred, break the following
		"""
		loop_variable_name = self.loopVariableName
		if is_not_blank(loop_variable_name):
			loop_variable_value = variables.find(loop_variable_name)
			if loop_variable_value is None:
				# no value or it is none, run once
				return self.do_run(variables, new_pipeline, stage_monitor_log, principal_service)
			elif isinstance(loop_variable_value, list):
				# a list, run for each element
				# note variables CANNOT be passed from inside of loop, which means even variables are changed in loop,
				# the next loop will not be impacted, and also will not impact steps followed
				def clone_variables(replaced: Any) -> PipelineVariables:
					cloned = variables.clone()
					cloned.put(loop_variable_name, deepcopy(replaced))
					return cloned

				def run_element_in_loop(replaced: Any) -> bool:
					return self.do_run(clone_variables(replaced), new_pipeline, stage_monitor_log, principal_service)

				if ask_parallel_actions_in_loop_unit():
					# TODO parallel version, now use sequential version
					return ArrayHelper(loop_variable_value).every(run_element_in_loop)
				else:
					# sequential version
					return ArrayHelper(loop_variable_value).every(run_element_in_loop)
			else:
				# not a list, run once
				return self.do_run(variables, new_pipeline, stage_monitor_log, principal_service)
		else:
			# no loop declared
			return self.do_run(variables, new_pipeline, stage_monitor_log, principal_service)

	def do_run(
			self, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, stage_monitor_log: MonitorLogStage,
			principal_service: PrincipalService) -> bool:
		loop_variable_name = self.loopVariableName
		if is_not_blank(loop_variable_name):
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

		def run(should_run, action: CompiledAction) -> bool:
			return self.run_action(should_run, action, variables, new_pipeline, unit_monitor_log, principal_service)

		all_run = ArrayHelper(self.actions).reduce(lambda should_run, x: run(should_run, x), True)
		if all_run:
			unit_monitor_log.status = MonitorLogStatus.DONE
		else:
			unit_monitor_log.status = MonitorLogStatus.ERROR
		unit_monitor_log.spentInMills = spent_ms(unit_monitor_log.startTime)
		return all_run

	# noinspection PyMethodMayBeStatic
	def run_action(
			self, should_run: bool,
			action: CompiledAction, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, unit_monitor_log: MonitorLogUnit,
			principal_service: PrincipalService
	) -> bool:
		if not should_run:
			return False
		else:
			return action.run(variables, new_pipeline, unit_monitor_log, principal_service)


def compile_units(pipeline: Pipeline, stage: PipelineStage) -> List[CompiledUnit]:
	units = stage.units
	if units is None or len(units) == 0:
		return []
	else:
		return ArrayHelper(units).map(lambda x: CompiledUnit(pipeline, stage, x)).to_list()
