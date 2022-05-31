from typing import List, Optional, Tuple

from fastapi import APIRouter, Body, Depends
from pydantic import BaseModel

from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.meta import BucketService
from watchmen_indicator_surface.settings import ask_tuple_delete_enabled
from watchmen_indicator_surface.util import trans, trans_readonly
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import UserRole
from watchmen_model.common import BucketId, DataPage, EnumId, Pageable, TenantId
from watchmen_model.indicator import Bucket, MeasureMethod
from watchmen_rest import get_admin_principal, get_console_principal, get_super_admin_principal
from watchmen_rest.util import raise_400, raise_403, raise_404, validate_tenant_id
from watchmen_utilities import ArrayHelper, is_blank, is_not_blank

router = APIRouter()


def get_bucket_service(principal_service: PrincipalService) -> BucketService:
	return BucketService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.get('/indicator/bucket', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=Bucket)
async def load_bucket_by_id(
		bucket_id: Optional[BucketId], principal_service: PrincipalService = Depends(get_console_principal)
) -> Bucket:
	if is_blank(bucket_id):
		raise_400('Bucket id is required.')

	bucket_service = get_bucket_service(principal_service)

	def action() -> Bucket:
		# noinspection PyTypeChecker
		bucket: Bucket = bucket_service.find_by_id(bucket_id)
		if bucket is None:
			raise_404()
		# tenant id must match current principal's
		if bucket.tenantId != principal_service.get_tenant_id():
			raise_404()
		return bucket

	return trans_readonly(bucket_service, action)


@router.post('/indicator/bucket', tags=[UserRole.ADMIN], response_model=Bucket)
async def save_bucket(bucket: Bucket, principal_service: PrincipalService = Depends(get_admin_principal)) -> Bucket:
	validate_tenant_id(bucket, principal_service)
	bucket_service = get_bucket_service(principal_service)

	# noinspection DuplicatedCode
	def action(a_bucket: Bucket) -> Bucket:
		if bucket_service.is_storable_id_faked(a_bucket.bucketId):
			bucket_service.redress_storable_id(a_bucket)
			# noinspection PyTypeChecker
			a_bucket: Bucket = bucket_service.create(a_bucket)
		else:
			# noinspection PyTypeChecker
			existing_bucket: Optional[Bucket] = bucket_service.find_by_id(a_bucket.bucketId)
			if existing_bucket is not None:
				if existing_bucket.tenantId != a_bucket.tenantId:
					raise_403()

			# noinspection PyTypeChecker
			a_bucket: Bucket = bucket_service.update(a_bucket)

		return a_bucket

	return trans(bucket_service, lambda: action(bucket))


class QueryBucketDataPage(DataPage):
	data: List[Bucket]


@router.post('/indicator/bucket/name', tags=[UserRole.ADMIN], response_model=QueryBucketDataPage)
async def find_buckets_page_by_name(
		query_name: Optional[str], pageable: Pageable = Body(...),
		principal_service: PrincipalService = Depends(get_admin_principal)) -> QueryBucketDataPage:
	bucket_service = get_bucket_service(principal_service)

	def action() -> QueryBucketDataPage:
		tenant_id: TenantId = principal_service.get_tenant_id()
		if is_blank(query_name):
			# noinspection PyTypeChecker
			return bucket_service.find_page_by_text(None, tenant_id, pageable)
		else:
			# noinspection PyTypeChecker
			return bucket_service.find_page_by_text(query_name, tenant_id, pageable)

	return trans_readonly(bucket_service, action)


@router.get("/indicator/bucket/numeric-value", tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=List[Bucket])
async def find_buckets_by_numeric_value(
		query_name: Optional[str], principal_service: PrincipalService = Depends(get_console_principal)) -> List[
	Bucket]:
	bucket_service = get_bucket_service(principal_service)

	def action() -> List[Bucket]:
		tenant_id: TenantId = principal_service.get_tenant_id()
		if is_blank(query_name):
			# noinspection PyTypeChecker
			return bucket_service.find_numeric_value_by_text(None, tenant_id)
		else:
			# noinspection PyTypeChecker
			return bucket_service.find_numeric_value_by_text(query_name, tenant_id)

	return trans_readonly(bucket_service, action)


class QueryByBucketMethod(BaseModel):
	method: MeasureMethod = None
	enumId: Optional[EnumId] = None


class QueryByBucket(BaseModel):
	methods: List[QueryByBucketMethod]


@router.post("/indicator/bucket/methods", tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=List[Bucket])
async def find_buckets_by_measure_methods(
		query_bucket: QueryByBucket, principal_service: PrincipalService = Depends(get_console_principal)
) -> List[Bucket]:
	if query_bucket is None:
		raise_400('Measure method is required.')
	if query_bucket.methods is None or len(query_bucket.methods) == 0:
		raise_400('Measure method is required.')
	measure_methods: List[Tuple[MeasureMethod, Optional[EnumId]]] = ArrayHelper(query_bucket.methods) \
		.filter(lambda x: x is not None and x.method is not None) \
		.filter(lambda x: x.method != MeasureMethod or (x.method == MeasureMethod.ENUM and is_not_blank(x.enumId))) \
		.map(lambda x: (x.method, x.enumId)) \
		.to_list()
	if len(measure_methods) == 0:
		raise_400('Measure method is required.')

	bucket_service = get_bucket_service(principal_service)

	def action() -> List[Bucket]:
		tenant_id: TenantId = principal_service.get_tenant_id()
		return bucket_service.find_by_measure_method(measure_methods, tenant_id)

	return trans_readonly(bucket_service, action)


@router.post('/indicator/bucket/ids', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=List[Bucket])
async def find_buckets_by_measure_methods(
		bucket_ids: List[BucketId], principal_service: PrincipalService = Depends(get_console_principal)
) -> List[Bucket]:
	if len(bucket_ids) == 0:
		return []

	bucket_service = get_bucket_service(principal_service)

	def action() -> List[Bucket]:
		tenant_id: TenantId = principal_service.get_tenant_id()
		return bucket_service.find_by_ids(bucket_ids, tenant_id)

	return trans_readonly(bucket_service, action)


@router.get('/indicator/bucket/export', tags=[UserRole.ADMIN], response_model=List[Bucket])
async def find_buckets_for_export(principal_service: PrincipalService = Depends(get_admin_principal)) -> List[Bucket]:
	bucket_service = get_bucket_service(principal_service)

	def action() -> List[Bucket]:
		tenant_id: TenantId = principal_service.get_tenant_id()
		return bucket_service.find_all(tenant_id)

	return trans_readonly(bucket_service, action)


@router.delete('/indicator/bucket', tags=[UserRole.SUPER_ADMIN], response_model=Bucket)
async def delete_bucket_by_id_by_super_admin(
		bucket_id: Optional[BucketId] = None,
		principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> Bucket:
	if not ask_tuple_delete_enabled():
		raise_404('Not Found')

	if is_blank(bucket_id):
		raise_400('Bucket id is required.')

	bucket_service = get_bucket_service(principal_service)

	def action() -> Bucket:
		# noinspection PyTypeChecker
		bucket: Bucket = bucket_service.delete(bucket_id)
		if bucket is None:
			raise_404()
		return bucket

	return trans(bucket_service, action)
