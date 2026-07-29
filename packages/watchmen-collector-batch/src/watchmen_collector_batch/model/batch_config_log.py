from typing import Dict

from watchmen_model.common import TenantBasedTuple


class BatchConfigLog(TenantBasedTuple):
    logId: int
    tranId: int
    pipelineId: str
    actionId: str
    status: int
    action: Dict
    error: Dict
