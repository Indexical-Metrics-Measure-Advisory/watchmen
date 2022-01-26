from enum import Enum

from watchmen_model.common import ExternalWriterId, OptimisticLock, TenantId, Tuple


class ExternalWriterType(str, Enum):
	STANDARD_WRITER = 'standard-writer',
	ELASTIC_SEARCH_WRITER = 'elastic-search-writer'


class ExternalWriter(Tuple, OptimisticLock):
	writerId: ExternalWriterId = None
	writerCode: str = None
	type: ExternalWriterType = ExternalWriterType.STANDARD_WRITER
	# personal access token
	pat: str = None
	url: str = None
	tenantId: TenantId = None
