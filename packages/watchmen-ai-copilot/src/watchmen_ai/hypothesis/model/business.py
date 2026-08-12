from typing import Optional

from watchmen_model.common import OptimisticLock, UserBasedTuple, Auditable
from watchmen_utilities import ExtendedBaseModel


class BusinessChallenge(ExtendedBaseModel, UserBasedTuple, OptimisticLock, Auditable):
	id: Optional[str] = None
	title: str
	description: Optional[str] = None
