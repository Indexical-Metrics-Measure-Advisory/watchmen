from copy import deepcopy
from logging import getLogger
from typing import Any, List

from watchmen_auth import PrincipalService
from watchmen_data_kernel.storage_bridge import now, PipelineVariables
from watchmen_model.admin import Pipeline, PipelineStage, PipelineUnit
from watchmen_model.pipeline_kernel import MonitorLogStage, MonitorLogStatus, MonitorLogUnit
from watchmen_pipeline_kernel.common import ask_parallel_actions_in_loop_unit
from watchmen_pipeline_kernel.pipeline_schema_interface import CreateQueuePipeline, TopicStorages
from watchmen_utilities import ArrayHelper
from .compiled_single_unit import CompiledSingleUnit
from .distributed_compiled_unit import DistributedUnitLoop

logger = getLogger(__name__)


class CompiledUnit(CompiledSingleUnit):
	def __init__(
			self, pipeline: Pipeline, stage: PipelineStage, unit: PipelineUnit,
			principal_service: PrincipalService):
		super().__init__(pipeline, stage, unit, principal_service)

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
				# return self.do_run(
				# 	variables=clone_variables(loop_variable_value), new_pipeline=new_pipeline,
				# 	stage_monitor_log=stage_monitor_log, storages=storages, principal_service=principal_service)
				unit_monitor_log = MonitorLogUnit(
					unitId=self.unit.unitId, name=self.unit.name,
					status=MonitorLogStatus.DONE, startTime=now(), spentInMills=0, error=None,
					loopVariableName=self.loopVariableName, loopVariableValue=loop_variable_value,
					actions=[]
				)
				stage_monitor_log.units.append(unit_monitor_log)
				return True
			elif isinstance(loop_variable_value, list):
				# a list, run for each element

				if ask_parallel_actions_in_loop_unit():
					# parallel version, now use sequential version
					return DistributedUnitLoop().with_unit(self.pipeline, self.stage, self.unit) \
						.with_principal_service(principal_service) \
						.with_pipeline_variables(variables) \
						.with_loop_variable_values(loop_variable_name, loop_variable_value) \
						.distribute(stage_monitor_log, new_pipeline)
				else:
					def run_element_in_loop(replaced: Any) -> bool:
						return self.do_run(
							variables=clone_variables(replaced), new_pipeline=new_pipeline,
							stage_monitor_log=stage_monitor_log, storages=storages, principal_service=principal_service)

					# sequential version
					return ArrayHelper(loop_variable_value).every(run_element_in_loop)
			else:
				# not a list, run once
				# return self.do_run(
				# 	variables=clone_variables(loop_variable_value), new_pipeline=new_pipeline,
				# 	stage_monitor_log=stage_monitor_log,
				# 	storages=storages, principal_service=principal_service)
				# not a list, raise exception
				unit_monitor_log = MonitorLogUnit(
					unitId=self.unit.unitId, name=self.unit.name,
					status=MonitorLogStatus.ERROR, startTime=now(), spentInMills=0,
					loopVariableName=self.loopVariableName, loopVariableValue=loop_variable_value,
					actions=[],
					error=f'Value of loop variable[{loop_variable_name}] must be a list, current is [{loop_variable_value}].'
				)
				stage_monitor_log.units.append(unit_monitor_log)
				return False
		else:
			# no loop declared
			return self.do_run(
				variables=variables, new_pipeline=new_pipeline, stage_monitor_log=stage_monitor_log,
				storages=storages, principal_service=principal_service)


def compile_units(pipeline: Pipeline, stage: PipelineStage, principal_service: PrincipalService) -> List[CompiledUnit]:
	units = stage.units
	if units is None or len(units) == 0:
		return []
	else:
		return ArrayHelper(units).map(lambda x: CompiledUnit(pipeline, stage, x, principal_service)).to_list()
