from datetime import datetime
from typing import List

from watchmen_model.admin import Pipeline, PipelineStage, PipelineUnit
from watchmen_model.reactor import MonitorLogStage, MonitorLogUnit
from watchmen_utilities import ArrayHelper, is_not_blank
from .compiled_action import compile_actions, CompiledAction
from .runtime import PipelineVariables


class CompiledUnit:
	def __init__(self, pipeline: Pipeline, stage: PipelineStage, unit: PipelineUnit):
		self.pipeline = pipeline
		self.stage = stage
		self.unit = unit
		self.loopVariableName = unit.loopVariableName
		self.hasLoop = is_not_blank(self.loopVariableName)
		self.actions = compile_actions(pipeline, stage, unit)

	# noinspection PyMethodMayBeStatic
	def timestamp(self):
		return datetime.now()

	def run(self, variables: PipelineVariables, stage_monitor_log: MonitorLogStage) -> bool:
		"""
		returns True means continue, False means something wrong occurred, break the following
		"""
		pass

	def do_run(self, variables: PipelineVariables, stage_monitor_log: MonitorLogStage) -> bool:
		unit_monitor_log = MonitorLogUnit(
			unitId=self.unit.unitId, name=self.unit.name,
			startTime=self.timestamp(), completeTime=None,
			units=[],
			error=None
		)
		stage_monitor_log.stages.append(unit_monitor_log)

		all_run = ArrayHelper(self.actions) \
			.reduce(lambda should_run, x: self.run_action(should_run, x, variables, unit_monitor_log), True)

	# noinspection PyMethodMayBeStatic
	def run_action(
			self, should_run: bool,
			action: CompiledAction, variables: PipelineVariables,
			unit_monitor_log: MonitorLogUnit
	) -> bool:
		if not should_run:
			return False
		else:
			return action.run(variables, unit_monitor_log)


def compile_units(pipeline: Pipeline, stage: PipelineStage) -> List[CompiledUnit]:
	units = stage.units
	if units is None or len(units) == 0:
		return []
	else:
		return ArrayHelper(units).map(lambda x: CompiledUnit(pipeline, stage, x)).to_list()
