from datetime import datetime
from typing import List

from watchmen_model.admin import Pipeline, PipelineStage, PipelineUnit
from watchmen_model.reactor import MonitorLogStage
from watchmen_utilities import ArrayHelper
from .compiled_action import compile_actions
from .runtime import PipelineVariables


class CompiledUnit:
	def __init__(self, pipeline: Pipeline, stage: PipelineStage, unit: PipelineUnit):
		self.pipeline = pipeline
		self.stage = stage
		self.unit = unit
		self.actions = compile_actions(pipeline, stage, unit)

	# noinspection PyMethodMayBeStatic
	def timestamp(self):
		return datetime.now()

	def run(self, variables: PipelineVariables, stage_monitor_log: MonitorLogStage) -> bool:
		# TODO, run unit, be careful, might contain loop
		pass


def compile_units(pipeline: Pipeline, stage: PipelineStage) -> List[CompiledUnit]:
	units = stage.units
	if units is None or len(units) == 0:
		return []
	else:
		return ArrayHelper(units).map(lambda x: CompiledUnit(pipeline, stage, x)).to_list()
