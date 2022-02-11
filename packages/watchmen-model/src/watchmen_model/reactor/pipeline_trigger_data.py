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
