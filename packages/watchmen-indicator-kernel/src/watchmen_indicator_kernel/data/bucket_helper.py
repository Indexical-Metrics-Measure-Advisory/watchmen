from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.common import IndicatorKernelException
from watchmen_indicator_kernel.meta import BucketService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.common import BucketId
from watchmen_model.indicator import Bucket


def get_bucket_service(principal_service: PrincipalService) -> BucketService:
	return BucketService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


# noinspection DuplicatedCode
def ask_bucket(bucket_id: BucketId, principal_service: PrincipalService) -> Bucket:
	bucket_service = get_bucket_service(principal_service)
	bucket_service.begin_transaction()
	try:
		# noinspection PyTypeChecker
		bucket: Bucket = bucket_service.find_by_id(bucket_id)
		if bucket is None:
			raise IndicatorKernelException(f'Bucket[id={bucket_id}] not found.')
		if bucket.tenantId != principal_service.get_tenant_id():
			raise IndicatorKernelException(f'Bucket[id={bucket_id}] not found.')
		return bucket
	finally:
		bucket_service.close_transaction()
