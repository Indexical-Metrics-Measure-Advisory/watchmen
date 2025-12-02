from typing import Optional

from pydantic import ConfigDict
from watchmen_utilities import ExtendedBaseModel
from watchmen_model.common import TenantBasedTuple, Auditable, OptimisticLock


class Category(ExtendedBaseModel,TenantBasedTuple, Auditable, OptimisticLock):
    id: str
    name: str
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    # is_active: Optional[bool] = None
    # sort_order: Optional[int] = None

    # keep style consistent with other models (e.g., enums output as values)
    model_config = ConfigDict(use_enum_values=True)
