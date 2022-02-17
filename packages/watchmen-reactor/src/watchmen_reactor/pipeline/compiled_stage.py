from logging import getLogger
from traceback import format_exc
from typing import List

from watchmen_auth import PrincipalService
from watchmen_model.admin import Pipeline, PipelineStage
from watchmen_model.reactor import MonitorLogStage, MonitorLogStatus, PipelineMonitorLog
from watchmen_utilities import ArrayHelper
from .compiled_unit import compile_units, CompiledUnit
from .runtime import CreateQueuePipeline, now, parse_conditional, parse_prerequisite_defined_as, PipelineVariables, \
	spent_ms

logger = getLogger(__name__)


class CompiledStage:
	def __init__(self, pipeline: Pipeline, stage: PipelineStage):
		self.pipeline = pipeline
		self.stage = stage
		self.prerequisiteDefinedAs = parse_prerequisite_defined_as(stage)
		self.prerequisiteTest = parse_conditional(stage)
		self.units = compile_units(pipeline, stage)

	def run(
			self, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, monitor_log: PipelineMonitorLog,
			principal_service: PrincipalService) -> bool:
		stage_monitor_log = MonitorLogStage(
			stageId=self.stage.stageId, name=self.stage.name,
			status=MonitorLogStatus.DONE, startTime=now(), spentInMills=0, error=None,
			prerequisite=True,
			prerequisiteDefinedAs=self.prerequisiteDefinedAs(),
			units=[]
		)
		monitor_log.stages.append(stage_monitor_log)

		try:
			prerequisite = self.prerequisiteTest(variables)
			if not prerequisite:
				stage_monitor_log.conditionResult = False
				stage_monitor_log.status = MonitorLogStatus.DONE
				all_run = True
			else:
				stage_monitor_log.conditionResult = True

				def run(should_run: bool, unit: CompiledUnit) -> bool:
					return self.run_unit(
						should_run, unit, variables, new_pipeline, stage_monitor_log, principal_service)

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

		stage_monitor_log.completeTime = spent_ms(stage_monitor_log.startTime)

		return all_run

	# noinspection PyMethodMayBeStatic
	def run_unit(
			self, should_run: bool,
			unit: CompiledUnit, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, stage_monitor_log: MonitorLogStage,
			principal_service: PrincipalService
	) -> bool:
		if not should_run:
			return False
		else:
			return unit.run(variables, new_pipeline, stage_monitor_log, principal_service)


def compile_stages(pipeline: Pipeline) -> List[CompiledStage]:
	stages = pipeline.stages
	if stages is None or len(stages) == 0:
		return []
	else:
		return ArrayHelper(stages).map(lambda x: CompiledStage(pipeline, x)).to_list()
