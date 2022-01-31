from enum import Enum

from watchmen_model.common import ExternalWriterId, Parameter
from .pipeline import Conditional
from .pipeline_action import MemoryWriter, PipelineAction, SystemActionType


class AlarmActionSeverity(str, Enum):
	LOW = 'low',
	MEDIUM = 'medium',
	HIGH = 'high',
	CRITICAL = 'critical',


class AlarmAction(PipelineAction, Conditional):
	type: SystemActionType.ALARM = SystemActionType.ALARM
	severity: AlarmActionSeverity = AlarmActionSeverity.MEDIUM
	message: str = None


class CopyToMemoryAction(MemoryWriter):
	"""
	copy something to memory variable
	"""
	type: SystemActionType.COPY_TO_MEMORY = SystemActionType.COPY_TO_MEMORY
	source: Parameter = None


class WriteToExternalAction(PipelineAction):
	type: SystemActionType.WRITE_TO_EXTERNAL = SystemActionType.WRITE_TO_EXTERNAL
	externalWriterId: ExternalWriterId = None
	eventCode: str = None
