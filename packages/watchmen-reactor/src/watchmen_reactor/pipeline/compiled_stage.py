from datetime import datetime
from logging import getLogger
from traceback import format_exc
from typing import List

from watchmen_auth import PrincipalService
from watchmen_model.admin import Pipeline, PipelineStage
from watchmen_model.reactor import MonitorLogStage, PipelineMonitorLog
from watchmen_utilities import ArrayHelper
from .compiled_unit import compile_units, CompiledUnit
from .runtime import CreateQueuePipeline, parse_conditional, PipelineVariables

logger = getLogger(__name__)


class CompiledStage:
	def __init__(self, pipeline: Pipeline, stage: PipelineStage):
		self.pipeline = pipeline
		self.stage = stage
		self.conditional_test = parse_conditional(stage)
		self.units = compile_units(pipeline, stage)

	# noinspection PyMethodMayBeStatic
	def timestamp(self):
		return datetime.now()

	def run(
			self, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, monitor_log: PipelineMonitorLog,
			principal_service: PrincipalService) -> bool:
		stage_monitor_log = MonitorLogStage(
			stageId=self.stage.stageId, name=self.stage.name,
			startTime=self.timestamp(), completeTime=None,
			conditionResult=True,
			units=[],
			error=None
		)
		monitor_log.stages.append(stage_monitor_log)

		try:
			prerequisite = self.conditional_test(variables)
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			prerequisite = False
			stage_monitor_log.error = format_exc()

		if not prerequisite:
			all_run: bool = False
			stage_monitor_log.conditionResult = False
		else:
			stage_monitor_log.conditionResult = True

			def run(should_run: bool, unit: CompiledUnit) -> bool:
				return self.run_unit(should_run, unit, variables, new_pipeline, stage_monitor_log, principal_service)

			all_run = ArrayHelper(self.units).reduce(lambda should_run, x: run(should_run, x), True)
		stage_monitor_log.completeTime = self.timestamp()

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
