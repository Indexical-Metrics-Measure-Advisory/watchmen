from logging import getLogger
from traceback import format_exc
from typing import List

from watchmen_auth import PrincipalService
from watchmen_data_kernel.storage_bridge import now, parse_prerequisite_defined_as, parse_prerequisite_in_memory, \
	PipelineVariables, spent_ms
from watchmen_model.admin import Pipeline, PipelineStage
from watchmen_model.pipeline_kernel import MonitorLogStage, MonitorLogStatus, PipelineMonitorLog
from watchmen_pipeline_kernel.pipeline_schema_interface import CreateQueuePipeline, TopicStorages
from watchmen_utilities import ArrayHelper
from .compiled_unit import compile_units, CompiledUnit

logger = getLogger(__name__)


class CompiledStage:
	def __init__(self, pipeline: Pipeline, stage: PipelineStage, principal_service: PrincipalService):
		self.pipeline = pipeline
		self.stage = stage
		self.prerequisiteDefinedAs = parse_prerequisite_defined_as(stage, principal_service)
		self.prerequisiteTest = parse_prerequisite_in_memory(stage, principal_service)
		self.units = compile_units(pipeline, stage, principal_service)

	def run(
			self, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, monitor_log: PipelineMonitorLog,
			storages: TopicStorages, principal_service: PrincipalService) -> bool:
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

				def run(should_run: bool, unit: CompiledUnit) -> bool:
					return self.run_unit(
						should_run=should_run, unit=unit, variables=variables, new_pipeline=new_pipeline,
						stage_monitor_log=stage_monitor_log,
						storages=storages, principal_service=principal_service)

				all_run = ArrayHelper(self.units).reduce(lambda should_run, x: run(should_run, x), True)
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
	def run_unit(
			self, should_run: bool,
			unit: CompiledUnit, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, stage_monitor_log: MonitorLogStage,
			storages: TopicStorages, principal_service: PrincipalService
	) -> bool:
		if not should_run:
			return False
		else:
			return unit.run(
				variables=variables, new_pipeline=new_pipeline, stage_monitor_log=stage_monitor_log,
				storages=storages, principal_service=principal_service)


def compile_stages(pipeline: Pipeline, principal_service: PrincipalService) -> List[CompiledStage]:
	stages = pipeline.stages
	if stages is None or len(stages) == 0:
		return []
	else:
		return ArrayHelper(stages).map(lambda x: CompiledStage(pipeline, x, principal_service)).to_list()
