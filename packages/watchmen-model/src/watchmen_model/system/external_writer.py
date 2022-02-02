from enum import Enum

from pydantic import BaseModel

from watchmen_model.common import ExternalWriterId, OptimisticLock, TenantBasedTuple


class ExternalWriterType(str, Enum):
	STANDARD_WRITER = 'standard-writer',
	ELASTIC_SEARCH_WRITER = 'elastic-search-writer'


class ExternalWriter(TenantBasedTuple, OptimisticLock, BaseModel):
	writerId: ExternalWriterId = None
	writerCode: str = None
	type: ExternalWriterType = ExternalWriterType.STANDARD_WRITER
	# personal access token
	pat: str = None
	url: str = None
