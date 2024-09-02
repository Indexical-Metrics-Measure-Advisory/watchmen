from enum import Enum
from typing import Optional
from watchmen_utilities import ExtendedBaseModel
from watchmen_model.common import ExternalWriterId, OptimisticLock, TenantBasedTuple


class ExternalWriterType(str, Enum):
	STANDARD_WRITER = 'standard-writer',
	ELASTIC_SEARCH_WRITER = 'elastic-search-writer'


class ExternalWriter(TenantBasedTuple, OptimisticLock, ExtendedBaseModel):
	writerId: Optional[ExternalWriterId] = None
	writerCode: Optional[str] = None
	name: Optional[str] = None
	type: ExternalWriterType = ExternalWriterType.STANDARD_WRITER
	# personal access token
	pat: Optional[str] = None
	url: Optional[str] = None
