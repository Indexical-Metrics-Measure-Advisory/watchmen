from abc import abstractmethod
from datetime import datetime
from logging import getLogger
from traceback import format_exc
from typing import Any, Dict, List

from watchmen_meta.common import ask_snowflake_generator
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

	def run(self, variables: PipelineVariables, unit_monitor_log: MonitorLogUnit) -> bool:
		"""
		returns True means continue, False means something wrong occurred, break the following
		"""
		action_monitor_log = self.create_action_log(self.create_common_action_log())
		unit_monitor_log.actions.append(action_monitor_log)
		return self.do_run(variables, action_monitor_log)

	@abstractmethod
	def do_run(self, variables: PipelineVariables, action_monitor_log: MonitorLogAction) -> bool:
		"""
		returns True means continue, False means something wrong occurred, break the following
		"""
		pass

	def create_common_action_log(self) -> Dict[str, Any]:
		return {
			'uid': str(ask_snowflake_generator().next_id()),
			'actionId': self.action.actionId, 'type': self.action.type, 'status': None,
			'startTime': self.timestamp(), 'completeTime': None,
			'error': None,
			'insertCount': 0, 'updateCount': 0, 'deleteCount': 0
		}

	@abstractmethod
	def create_action_log(self, common: Dict[str, Any]) -> MonitorLogAction:
		pass


class CompiledAlarmAction(CompiledAction):
	def __init__(self, pipeline: Pipeline, stage: PipelineStage, unit: PipelineUnit, action: AlarmAction):
		super().__init__(pipeline, stage, unit, action)
		self.conditional_test = parse_conditional(action)
		self.severity = AlarmActionSeverity.MEDIUM if action.severity is None else action.severity
		self.message = parse_constant(action.message)

	def do_run(self, variables: PipelineVariables, action_monitor_log: MonitorAlarmAction) -> bool:
		try:
			prerequisite = self.conditional_test(variables)
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			prerequisite = False
			action_monitor_log.error = format_exc()

		if not prerequisite:
			action_monitor_log.conditionResult = False
		else:
			action_monitor_log.conditionResult = True
			# default log on error label
			logger.error(f'[PIPELINE] [ALARM] [{self.severity.upper()}] {self.message(variables)}')
		action_monitor_log.completeTime = self.timestamp()
		return True

	def create_action_log(self, common: Dict[str, Any]) -> MonitorAlarmAction:
		return MonitorAlarmAction(
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
