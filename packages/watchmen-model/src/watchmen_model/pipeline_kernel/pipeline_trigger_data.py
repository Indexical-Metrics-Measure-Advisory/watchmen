from enum import Enum
from typing import Any, Dict, TypeVar, Optional

from watchmen_model.admin import PipelineTriggerType
from watchmen_model.common import TenantId
from watchmen_utilities import ExtendedBaseModel

PipelineTriggerTraceId = TypeVar('PipelineTriggerTraceId', bound=str)


class PipelineTriggerData(ExtendedBaseModel):
	# topic name
	code: Optional[str] = None
	# current data
	data: Optional[Dict[str, Any]] = None
	triggerType: PipelineTriggerType = PipelineTriggerType.INSERT
	# pass tenant id when use super admin
	tenantId: Optional[TenantId] = None
	# user given trace id, typically leave it as none
	traceId: Optional[PipelineTriggerTraceId] = None


class PipelineTriggerDataWithPAT(PipelineTriggerData):
	pat: Optional[str] = None


class PipelineTriggerResult(ExtendedBaseModel):
	received: bool = True
	traceId: Optional[PipelineTriggerTraceId] = None
	"""
	id of trigger data, 
	type must be str since length of value beyonds the limitation of serialization of javascript json number
	"""
	internalDataId: str = ''
	logId: Optional[str] = None


class TopicDataColumnNames(str, Enum):
	ID = 'id_',
	RAW_TOPIC_DATA = 'data_',
	AGGREGATE_ASSIST = 'aggregate_assist_',
	VERSION = 'version_',
	TENANT_ID = 'tenant_id_',
	INSERT_TIME = 'insert_time_',
	UPDATE_TIME = 'update_time_'
