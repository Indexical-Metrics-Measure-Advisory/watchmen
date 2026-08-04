from typing import Dict

from watchmen_model.common import TenantBasedTuple


class DataShard(TenantBasedTuple):
    shardId: int
    name: str
    tableName: str
    startId: int
    endId: int
    status: int
    result: Dict
    type: int
