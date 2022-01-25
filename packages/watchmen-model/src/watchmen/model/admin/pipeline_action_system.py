from enum import Enum

from watchmen.model.admin.pipeline import Conditional
from watchmen.model.admin.pipeline_action import MemoryWriter, PipelineAction, SystemActionType
from watchmen.model.common import ExternalWriterId, Parameter


class AlarmActionSeverity(str, Enum):
	LOW = 'low',
	MEDIUM = 'medium',
	HIGH = 'high',
	CRITICAL = 'critical',


class AlarmAction(PipelineAction, Conditional):
	type: SystemActionType.ALARM = SystemActionType.ALARM
	severity: AlarmActionSeverity = AlarmActionSeverity.MEDIUM
	message: str = None


class CopyToMemoryAction(PipelineAction, MemoryWriter):
	"""
	copy something to memory variable
	"""
	type: SystemActionType.COPY_TO_MEMORY = SystemActionType.COPY_TO_MEMORY
	source: Parameter = None


class WriteToExternalAction(PipelineAction):
	type: SystemActionType.WRITE_TO_EXTERNAL = SystemActionType.WRITE_TO_EXTERNAL
	externalWriterId: ExternalWriterId = None
	eventCode: str = None
