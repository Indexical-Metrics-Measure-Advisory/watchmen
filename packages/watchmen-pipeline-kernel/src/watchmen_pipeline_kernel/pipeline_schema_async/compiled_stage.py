from logging import getLogger
from traceback import format_exc
from typing import List

from watchmen_auth import PrincipalService
from watchmen_data_kernel.storage_bridge import now, parse_prerequisite_defined_as, parse_prerequisite_in_memory, \
	PipelineVariables, spent_ms
from watchmen_model.admin import Pipeline, PipelineStage
from watchmen_model.pipeline_kernel import MonitorLogStage, MonitorLogStatus, PipelineMonitorLog
from watchmen_pipeline_kernel.pipeline_schema_async.create_queue_pipeline import CreateQueuePipeline
from watchmen_pipeline_kernel.pipeline_schema_async.topic_storages import AsyncTopicStorages
from watchmen_pipeline_kernel.pipeline_schema_async.compiled_unit import AsyncCompiledUnit, compile_async_units
from watchmen_utilities import ArrayHelper

logger = getLogger(__name__)


class AsyncCompiledStage:
	def __init__(self, pipeline: Pipeline, stage: PipelineStage, principal_service: PrincipalService):
		self.pipeline = pipeline
		self.stage = stage
		self.prerequisiteDefinedAs = parse_prerequisite_defined_as(stage, principal_service)
		self.prerequisiteTest = parse_prerequisite_in_memory(stage, principal_service)
		self.units = compile_async_units(pipeline, stage, principal_service)

	async def run(
			self, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, monitor_log: PipelineMonitorLog,
			storages: AsyncTopicStorages, principal_service: PrincipalService) -> bool:
		stage_monitor_log = MonitorLogStage(
			stageId=self.stage.stageId, name=self.stage.name,
			status=MonitorLogStatus.DONE, startTime=now(), spentInMills=0, error=None,
			prerequisite=True,
			prerequisiteDefinedAs=self.prerequisiteDefinedAs(),
			units=[]
		)
		monitor_log.stages.append(stage_monitor_log)

		try:
			prerequisite = self.prerequisiteTest(variables, principal_service)
			if not prerequisite:
				stage_monitor_log.prerequisite = False
				stage_monitor_log.status = MonitorLogStatus.DONE
				all_run = True
			else:
				stage_monitor_log.prerequisite = True
				# sequential async reduce (replaces sync ArrayHelper.reduce)
				all_run = True
				for unit in self.units:
					all_run = await self.run_unit(
						should_run=all_run, unit=unit, variables=variables, new_pipeline=new_pipeline,
						stage_monitor_log=stage_monitor_log,
						storages=storages, principal_service=principal_service)
					if not all_run:
						break
				if all_run:
					monitor_log.status = MonitorLogStatus.DONE
				else:
					monitor_log.status = MonitorLogStatus.ERROR
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			stage_monitor_log.status = MonitorLogStatus.ERROR
			stage_monitor_log.error = format_exc()
			all_run = False

		stage_monitor_log.spentInMills = spent_ms(stage_monitor_log.startTime)

		return all_run

	# noinspection PyMethodMayBeStatic
	async def run_unit(
			self, should_run: bool,
			unit: AsyncCompiledUnit, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, stage_monitor_log: MonitorLogStage,
			storages: AsyncTopicStorages, principal_service: PrincipalService
	) -> bool:
		if not should_run:
			return False
		else:
			return await unit.run(
				variables=variables, new_pipeline=new_pipeline, stage_monitor_log=stage_monitor_log,
				storages=storages, principal_service=principal_service)


def compile_async_stages(pipeline: Pipeline, principal_service: PrincipalService) -> List[AsyncCompiledStage]:
	stages = pipeline.stages
	if stages is None or len(stages) == 0:
		return []
	else:
		return ArrayHelper(stages).map(lambda x: AsyncCompiledStage(pipeline, x, principal_service)).to_list()
