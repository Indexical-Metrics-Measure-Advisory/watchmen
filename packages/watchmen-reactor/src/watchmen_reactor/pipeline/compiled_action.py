from abc import abstractmethod
from datetime import datetime
from logging import getLogger
from typing import Any, Dict, List

from watchmen_model.admin import AlarmAction, AlarmActionSeverity, Pipeline, PipelineAction, PipelineStage, PipelineUnit
from watchmen_model.reactor import MonitorAlarmAction, MonitorLogAction, MonitorLogUnit
from watchmen_utilities import ArrayHelper
from .runtime import parse_conditional, parse_constant, PipelineVariables

logger = getLogger(__name__)


class CompiledAction:
	def __init__(self, pipeline: Pipeline, stage: PipelineStage, unit: PipelineUnit, action: PipelineAction):
		self.pipeline = pipeline
		self.stage = stage
		self.unit = unit
		self.action = action

	# noinspection PyMethodMayBeStatic
	def timestamp(self):
		return datetime.now()

	@abstractmethod
	def run(self, variables: PipelineVariables, unit_monitor_log: MonitorLogUnit) -> bool:
		pass

	def create_common_action_log(self) -> Dict[str, Any]:
		return {
			'actionId': self.action.actionId, 'type': self.action.type, 'status': None,
			'startTime': self.timestamp(), 'completeTime': None,
			'error': None,
			'insertCount': 0, 'updateCount': 0, 'deleteCount': 0
		}

	def create_action_log(self, unit_monitor_log: MonitorLogUnit) -> MonitorLogAction:
		action_monitor_log = self.do_create_action_log(self.create_common_action_log())
		unit_monitor_log.actions.append(action_monitor_log)
		return action_monitor_log

	@abstractmethod
	def do_create_action_log(self, common: Dict[str, Any]) -> MonitorLogAction:
		pass


class CompiledAlarmAction(CompiledAction):
	def __init__(self, pipeline: Pipeline, stage: PipelineStage, unit: PipelineUnit, action: AlarmAction):
		super().__init__(pipeline, stage, unit, action)
		self.conditional_test = parse_conditional(action)
		self.severity = AlarmActionSeverity.MEDIUM if action.severity is None else action.severity
		self.message = parse_constant(action.message)

	def run(self, variables: PipelineVariables, unit_monitor_log: MonitorLogUnit) -> bool:
		# TODO
		pass

	def do_create_action_log(self, common: Dict[str, Any]) -> MonitorLogAction:
		return MonitorAlarmAction(
			# TODO uid for action monitor log
			# uid: MonitorLogActionId
			**common,
			conditionResult=True,
			value=None
		)


def compile_actions(pipeline: Pipeline, stage: PipelineStage, unit: PipelineUnit) -> List[CompiledAction]:
	actions = unit.do
	if actions is None or len(actions) == 0:
		return []
	else:
		return ArrayHelper(actions).map(lambda x: CompiledAction(pipeline, stage, unit, x)).to_list()
