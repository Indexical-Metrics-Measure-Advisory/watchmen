from enum import Enum
from typing import Any, Dict, TypeVar

from pydantic import BaseModel

from watchmen_model.admin import PipelineTriggerType
from watchmen_model.common import TenantId

PipelineTriggerTraceId = TypeVar('PipelineTriggerTraceId', bound=str)


class PipelineTriggerData(BaseModel):
	# topic name
	code: str = None
	# current data
	data: Dict[str, Any] = None
	triggerType: PipelineTriggerType = PipelineTriggerType.INSERT
	# pass tenant id when use super admin
	tenantId: TenantId = None
	# user given trace id, typically leave it as none
	traceId: PipelineTriggerTraceId = None


class PipelineTriggerDataWithPAT(PipelineTriggerData):
	pat: str


class PipelineTriggerResult(BaseModel):
	received: bool = True
	traceId: PipelineTriggerTraceId
	"""
	id of trigger data, 
	type must be str since length of value beyonds the limitation of serialization of javascript json number
	"""
	internalDataId: str


class TopicDataColumnNames(str, Enum):
	ID = 'id_',
	RAW_TOPIC_DATA = 'data_',
	AGGREGATE_ASSIST = 'aggregate_assist_',
	VERSION = 'version_',
	TENANT_ID = 'tenant_id_',
	INSERT_TIME = 'insert_time_',
	UPDATE_TIME = 'update_time_'
