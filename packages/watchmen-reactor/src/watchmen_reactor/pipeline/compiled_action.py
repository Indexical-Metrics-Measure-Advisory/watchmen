from abc import abstractmethod
from logging import getLogger
from traceback import format_exc
from typing import Any, Callable, Dict, List

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_snowflake_generator
from watchmen_model.admin import AlarmAction, AlarmActionSeverity, CopyToMemoryAction, DeleteTopicAction, \
	DeleteTopicActionType, Pipeline, PipelineAction, PipelineStage, PipelineUnit, ReadTopicAction, \
	ReadTopicActionType, SystemActionType, WriteToExternalAction, WriteTopicAction, WriteTopicActionType
from watchmen_model.reactor import MonitorAlarmAction, MonitorCopyToMemoryAction, MonitorDeleteAction, \
	MonitorLogAction, MonitorLogStatus, MonitorLogUnit, MonitorReadAction, MonitorWriteAction, \
	MonitorWriteToExternalAction
from watchmen_reactor.common import ReactorException
from watchmen_utilities import ArrayHelper
from .runtime import ConstantValue, CreateQueuePipeline, now, parse_action_defined_as, parse_constant, \
	parse_prerequisite, parse_prerequisite_defined_as, PipelineVariables, PrerequisiteDefinedAs, PrerequisiteTest, \
	spent_ms

logger = getLogger(__name__)


class CompiledAction:
	def __init__(
			self, pipeline: Pipeline, stage: PipelineStage, unit: PipelineUnit, action: PipelineAction,
			principal_service: PrincipalService):
		self.pipeline = pipeline
		self.stage = stage
		self.unit = unit
		self.action = action
		self.actionDefinedAs = parse_action_defined_as(action)
		self.parse_action(action, principal_service)

	@abstractmethod
	def parse_action(self, action: PipelineAction, principal_service: PrincipalService) -> None:
		pass

	def run(
			self, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, unit_monitor_log: MonitorLogUnit,
			principal_service: PrincipalService) -> bool:
		"""
		returns True means continue, False means something wrong occurred, break the following
		"""
		action_monitor_log = self.create_action_log(self.create_common_action_log())
		unit_monitor_log.actions.append(action_monitor_log)
		return self.do_run(variables, new_pipeline, action_monitor_log, principal_service)

	# noinspection PyMethodMayBeStatic
	def safe_run(self, action_monitor_log: MonitorLogAction, work: Callable[[], None]) -> bool:
		"""
		returns True means continue, False means something wrong occurred, break the following
		"""
		# noinspection PyBroadException
		try:
			work()
			action_monitor_log.status = MonitorLogStatus.DONE
			action_monitor_log.spentInMills = spent_ms(action_monitor_log.startTime)
			return True
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			action_monitor_log.status = MonitorLogStatus.ERROR
			action_monitor_log.error = format_exc()
			action_monitor_log.spentInMills = spent_ms(action_monitor_log.startTime)
			return False

	@abstractmethod
	def do_run(
			self, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, action_monitor_log: MonitorLogAction,
			principal_service: PrincipalService) -> bool:
		"""
		returns True means continue, False means something wrong occurred, break the following
		"""
		pass

	def create_common_action_log(self) -> Dict[str, Any]:
		return {
			# create uid of action monitor log
			'uid': str(ask_snowflake_generator().next_id()),
			'actionId': self.action.actionId, 'type': self.action.type,
			'status': MonitorLogStatus.DONE, 'startTime': now(), 'spentInMills': 0, 'error': None,
			'insertCount': 0, 'updateCount': 0, 'deleteCount': 0,
			'definedAs': self.actionDefinedAs(), 'touched': None
		}

	@abstractmethod
	def create_action_log(self, common: Dict[str, Any]) -> MonitorLogAction:
		pass


class CompiledAlarmAction(CompiledAction):
	prerequisiteDefinedAs: PrerequisiteDefinedAs
	prerequisiteTest: PrerequisiteTest
	severity: AlarmActionSeverity = AlarmActionSeverity.MEDIUM
	message: ConstantValue = None

	def parse_action(self, action: AlarmAction, principal_service: PrincipalService) -> None:
		self.prerequisiteDefinedAs = parse_prerequisite_defined_as(action, principal_service)
		self.prerequisiteTest = parse_prerequisite(action, principal_service)
		self.severity = AlarmActionSeverity.MEDIUM if action.severity is None else action.severity
		self.message = parse_constant(action.message, principal_service)

	def do_run(
			self, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, action_monitor_log: MonitorLogAction,
			principal_service: PrincipalService) -> bool:
		try:
			prerequisite = self.prerequisiteTest(variables, principal_service)
			if not prerequisite:
				action_monitor_log.prerequisite = False
				action_monitor_log.spentInMills = spent_ms(action_monitor_log.startTime)
				action_monitor_log.status = MonitorLogStatus.DONE
				return True
			else:
				action_monitor_log.prerequisite = True

				# default log on error label
				def work() -> None:
					value = self.message(variables)
					action_monitor_log.touched = value
					logger.error(f'[PIPELINE] [ALARM] [{self.severity.upper()}] {value}')

				return self.safe_run(action_monitor_log, work)
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			action_monitor_log.status = MonitorLogStatus.ERROR
			action_monitor_log.spentInMills = spent_ms(action_monitor_log.startTime)
			action_monitor_log.error = format_exc()
			return False

	def create_action_log(self, common: Dict[str, Any]) -> MonitorAlarmAction:
		return MonitorAlarmAction(**common, prerequisite=True, prerequisiteDefinedAs=self.prerequisiteDefinedAs())


class CompiledCopyToMemoryAction(CompiledAction):
	def parse_action(self, action: CopyToMemoryAction, principal_service: PrincipalService) -> None:
		# TODO
		pass

	def do_run(
			self, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, action_monitor_log: MonitorLogAction,
			principal_service: PrincipalService) -> bool:
		# TODO
		pass

	def create_action_log(self, common: Dict[str, Any]) -> MonitorCopyToMemoryAction:
		return MonitorCopyToMemoryAction(**common, value=None)


class CompiledWriteToExternalAction(CompiledAction):
	def parse_action(self, action: WriteToExternalAction, principal_service: PrincipalService) -> None:
		# TODO
		pass

	def do_run(
			self, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, action_monitor_log: MonitorLogAction,
			principal_service: PrincipalService) -> bool:
		# TODO
		pass

	def create_action_log(self, common: Dict[str, Any]) -> MonitorWriteToExternalAction:
		return MonitorWriteToExternalAction(**common, value=None)


class CompiledReadTopicAction(CompiledAction):
	def parse_action(self, action: ReadTopicAction, principal_service: PrincipalService) -> None:
		# TODO
		pass

	def do_run(
			self, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, action_monitor_log: MonitorLogAction,
			principal_service: PrincipalService) -> bool:
		# TODO
		pass

	def create_action_log(self, common: Dict[str, Any]) -> MonitorReadAction:
		return MonitorReadAction(**common, by=None, value=None)


class CompiledReadRowAction(CompiledReadTopicAction):
	pass


class CompiledReadRowsAction(CompiledReadTopicAction):
	pass


class CompiledReadFactorAction(CompiledReadTopicAction):
	pass


class CompiledReadFactorsAction(CompiledReadTopicAction):
	pass


class CompiledExistsAction(CompiledReadTopicAction):
	pass


class CompiledWriteTopicAction(CompiledAction):
	def parse_action(self, action: WriteTopicAction, principal_service: PrincipalService) -> None:
		# TODO
		pass

	def do_run(
			self, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, action_monitor_log: MonitorLogAction,
			principal_service: PrincipalService) -> bool:
		# TODO
		pass

	def create_action_log(self, common: Dict[str, Any]) -> MonitorWriteAction:
		return MonitorWriteAction(**common, by=None, value=None)


class CompiledInsertRowAction(CompiledWriteTopicAction):
	pass


class CompiledInsertOrMergeRowAction(CompiledWriteTopicAction):
	pass


class CompiledMergeRowAction(CompiledWriteTopicAction):
	pass


class CompiledWriteFactorAction(CompiledWriteTopicAction):
	pass


class CompiledDeleteTopicAction(CompiledAction):
	def parse_action(self, action: DeleteTopicAction, principal_service: PrincipalService) -> None:
		# TODO
		pass

	def do_run(
			self, variables: PipelineVariables,
			new_pipeline: CreateQueuePipeline, action_monitor_log: MonitorLogAction,
			principal_service: PrincipalService) -> bool:
		# TODO
		pass

	def create_action_log(self, common: Dict[str, Any]) -> MonitorDeleteAction:
		return MonitorDeleteAction(**common, by=None, value=None)


class CompiledDeleteRowAction(CompiledDeleteTopicAction):
	pass


class CompiledDeleteRowsAction(CompiledDeleteTopicAction):
	pass


def compile_action(
		pipeline: Pipeline, stage: PipelineStage, unit: PipelineUnit, action: PipelineAction,
		principal_service: PrincipalService
) -> CompiledAction:
	action_type = action.type
	if action_type == SystemActionType.ALARM:
		return CompiledAlarmAction(pipeline, stage, unit, action, principal_service)
	elif action_type == SystemActionType.COPY_TO_MEMORY:
		return CompiledCopyToMemoryAction(pipeline, stage, unit, action, principal_service)
	elif action_type == SystemActionType.WRITE_TO_EXTERNAL:
		return CompiledWriteToExternalAction(pipeline, stage, unit, action, principal_service)
	elif action_type == ReadTopicActionType.READ_ROW:
		return CompiledReadRowAction(pipeline, stage, unit, action, principal_service)
	elif action_type == ReadTopicActionType.READ_ROWS:
		return CompiledReadRowsAction(pipeline, stage, unit, action, principal_service)
	elif action_type == ReadTopicActionType.READ_FACTOR:
		return CompiledReadFactorAction(pipeline, stage, unit, action, principal_service)
	elif action_type == ReadTopicActionType.READ_FACTORS:
		return CompiledReadFactorsAction(pipeline, stage, unit, action, principal_service)
	elif action_type == ReadTopicActionType.EXISTS:
		return CompiledExistsAction(pipeline, stage, unit, action, principal_service)
	elif action_type == WriteTopicActionType.INSERT_ROW:
		return CompiledInsertRowAction(pipeline, stage, unit, action, principal_service)
	elif action_type == WriteTopicActionType.INSERT_OR_MERGE_ROW:
		return CompiledInsertOrMergeRowAction(pipeline, stage, unit, action, principal_service)
	elif action_type == WriteTopicActionType.MERGE_ROW:
		return CompiledMergeRowAction(pipeline, stage, unit, action, principal_service)
	elif action_type == WriteTopicActionType.WRITE_FACTOR:
		return CompiledWriteFactorAction(pipeline, stage, unit, action, principal_service)
	elif action_type == DeleteTopicActionType.DELETE_ROW:
		return CompiledDeleteRowAction(pipeline, stage, unit, action, principal_service)
	elif action_type == DeleteTopicActionType.DELETE_ROWS:
		return CompiledDeleteRowsAction(pipeline, stage, unit, action, principal_service)
	else:
		raise ReactorException(f'Action type[{action_type}] is not supported.')


def compile_actions(
		pipeline: Pipeline, stage: PipelineStage, unit: PipelineUnit,
		principal_service: PrincipalService) -> List[CompiledAction]:
	actions = unit.do
	if actions is None or len(actions) == 0:
		return []
	else:
		return ArrayHelper(actions) \
			.map(lambda x: compile_action(pipeline, stage, unit, x, principal_service)).to_list()
