from datetime import datetime
from enum import Enum
from typing import Optional, TypeVar

from watchmen_model.common import DataSourceId, OptimisticLock, TenantBasedTuple, TenantId, TopicId
from watchmen_utilities import ExtendedBaseModel

TopicArchivePolicyId = TypeVar('TopicArchivePolicyId', bound=str)
ArchiveBatchId = TypeVar('ArchiveBatchId', bound=str)


class ArchiveBatchStatus(str, Enum):
	# rows are being copied into cold storage
	COPYING = 'copying'
	# rows are copied, waiting for verification
	COPIED = 'copied'
	# copied rows are verified, waiting for source data deletion
	VERIFIED = 'verified'
	# source data is deleted, archive is done
	PURGED = 'purged'
	FAILED = 'failed'


class TopicArchivePolicy(ExtendedBaseModel, TenantBasedTuple, OptimisticLock):
	policyId: Optional[TopicArchivePolicyId] = None
	topicId: Optional[TopicId] = None
	enabled: bool = True
	# topic data whose insert time is before (now - hotDays) will be archived
	hotDays: int = 90
	# archived data is kept forever when cold days is none
	coldDays: Optional[int] = None
	# the data source which archived data is moved into
	archiveDataSourceId: Optional[DataSourceId] = None
	batchSize: int = 5000
	# cold data destruction requires an approval when true, reserved for the next phase
	destroyRequiresApproval: bool = True


class ArchiveBatch(ExtendedBaseModel, TenantBasedTuple):
	batchId: Optional[ArchiveBatchId] = None
	policyId: Optional[TopicArchivePolicyId] = None
	topicId: Optional[TopicId] = None
	# time window of the archived data
	timeFrom: Optional[datetime] = None
	timeTo: Optional[datetime] = None
	rowCount: int = 0
	# checksum of archived row ids, used for verification
	checksum: Optional[str] = None
	# where the archived data lives, as the ledger of cold storage
	storageUri: Optional[str] = None
	status: ArchiveBatchStatus = ArchiveBatchStatus.COPYING
	errorMessage: Optional[str] = None
	archivedAt: Optional[datetime] = None
