from enum import Enum
from typing import Optional

from watchmen_model.common import construct_parameter, construct_parameter_joint, ExternalWriterId, Parameter
from .conditional import Conditional
from .pipeline_action import MemoryWriter, PipelineAction, SystemActionType


class AlarmActionSeverity(str, Enum):
	LOW = 'low',
	MEDIUM = 'medium',
	HIGH = 'high',
	CRITICAL = 'critical',


class AlarmAction(PipelineAction, Conditional):
	type: SystemActionType = SystemActionType.ALARM
	severity: AlarmActionSeverity = AlarmActionSeverity.MEDIUM
	message: Optional[str] = None

	def __setattr__(self, name, value):
		if name == 'on':
			super().__setattr__(name, construct_parameter_joint(value))
		else:
			super().__setattr__(name, value)


class CopyToMemoryAction(MemoryWriter):
	"""
	copy something to memory variable
	"""
	type: SystemActionType = SystemActionType.COPY_TO_MEMORY
	source: Optional[Parameter] = None

	def __setattr__(self, name, value):
		if name == 'source':
			super().__setattr__(name, construct_parameter(value))
		else:
			super().__setattr__(name, value)


class WriteToExternalAction(PipelineAction):
	type: SystemActionType = SystemActionType.WRITE_TO_EXTERNAL
	externalWriterId: Optional[ExternalWriterId] = None
	eventCode: Optional[str] = None
