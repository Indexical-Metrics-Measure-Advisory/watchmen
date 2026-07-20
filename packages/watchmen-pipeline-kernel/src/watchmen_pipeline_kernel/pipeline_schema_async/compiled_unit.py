from logging import getLogger
from typing import Any, List

from watchmen_auth import PrincipalService
from watchmen_data_kernel.storage_bridge import PipelineVariables
from watchmen_model.admin import Pipeline, PipelineStage, PipelineUnit
from watchmen_model.pipeline_kernel import MonitorLogStage, MonitorLogStatus, MonitorLogUnit
from watchmen_pipeline_kernel.pipeline_schema_async.create_queue_pipeline import CreateQueuePipeline
from watchmen_pipeline_kernel.pipeline_schema_async.topic_storages import AsyncTopicStorages
from watchmen_pipeline_kernel.pipeline_schema_async.compiled_single_unit import AsyncCompiledSingleUnit

logger = getLogger(__name__)


class AsyncCompiledUnit(AsyncCompiledSingleUnit):
	def __init__(
			self, pipeline: Pipeline, stage: PipelineStage, unit: PipelineUnit,
			principal_service: PrincipalService):
		super().__init__(pipeline, stage, unit, principal_service)

	async def run(
			self, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, stage_monitor_log: MonitorLogStage,
			storages: AsyncTopicStorages, principal_service: PrincipalService) -> bool:
		"""
		returns True means continue, False means something wrong occurred, break the following
		"""
		loop_variable_name = self.loopVariableName
		if self.hasLoop:
			def clone_variables(replaced: Any) -> PipelineVariables:
				cloned = variables.shallow_clone()
				cloned.put(loop_variable_name, replaced)
				return cloned

			loop_variable_value = variables.find(loop_variable_name)
			if loop_variable_value is None:
				# no value or it is none, run once
				unit_monitor_log = MonitorLogUnit(
					unitId=self.unit.unitId, name=self.unit.name,
					status=MonitorLogStatus.DONE, startTime=None, spentInMills=0, error=None,
					loopVariableName=self.loopVariableName, loopVariableValue=loop_variable_value,
					actions=[]
				)
				stage_monitor_log.units.append(unit_monitor_log)
				return True
			elif isinstance(loop_variable_value, list):
				# a list, run for each element sequentially (async)
				# Note: parallel loop distribution (DistributedUnitLoop / Dask) from the sync path
				# is not mirrored here; loop units run sequentially with await.
				for replaced in loop_variable_value:
					ok = await self.do_run(
						variables=clone_variables(replaced), new_pipeline=new_pipeline,
						stage_monitor_log=stage_monitor_log, storages=storages, principal_service=principal_service)
					if not ok:
						return False
				return True
			else:
				# not a list, run once
				unit_monitor_log = MonitorLogUnit(
					unitId=self.unit.unitId, name=self.unit.name,
					status=MonitorLogStatus.ERROR, startTime=None, spentInMills=0,
					loopVariableName=self.loopVariableName, loopVariableValue=loop_variable_value,
					actions=[],
					error=f'Value of loop variable[{loop_variable_name}] must be a list, current is [{loop_variable_value}].'
				)
				stage_monitor_log.units.append(unit_monitor_log)
				return False
		else:
			# no loop declared
			return await self.do_run(
				variables=variables, new_pipeline=new_pipeline, stage_monitor_log=stage_monitor_log,
				storages=storages, principal_service=principal_service)


def compile_async_units(
		pipeline: Pipeline, stage: PipelineStage,
		principal_service: PrincipalService) -> List[AsyncCompiledUnit]:
	units = stage.units
	if units is None or len(units) == 0:
		return []
	else:
		from watchmen_utilities import ArrayHelper
		return ArrayHelper(units).map(lambda x: AsyncCompiledUnit(pipeline, stage, x, principal_service)).to_list()
