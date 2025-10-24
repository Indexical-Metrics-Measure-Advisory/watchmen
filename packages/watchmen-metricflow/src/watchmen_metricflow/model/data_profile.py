from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict

from watchmen_model.common import TenantBasedTuple, Auditable, OptimisticLock
from watchmen_utilities import ExtendedBaseModel


class DatabaseOutput(BaseModel):
    
    model_config = ConfigDict(use_enum_values=True)

    type: str
    host: Optional[str] = None
    user: Optional[str] = None
    password: Optional[str] = None
    port: Optional[int] = None
    dbname: Optional[str] = None
    schema: Optional[str] = None
    threads: Optional[int] = None
    keepalives_idle: Optional[int] = None
    connect_timeout: Optional[int] = None
    retries: Optional[int] = None
    path: Optional[str] = None  # for duckdb


class DataProfile(ExtendedBaseModel, TenantBasedTuple, Auditable,OptimisticLock):
    
    model_config = ConfigDict(use_enum_values=True)

    name: str
    target: str
    outputs: Dict[str, DatabaseOutput] = Field(default_factory=dict)
    id: Optional[str] = None
