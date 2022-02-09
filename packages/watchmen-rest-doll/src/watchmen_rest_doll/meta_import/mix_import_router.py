from enum import Enum
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from watchmen_auth import PrincipalService
from watchmen_meta.admin import UserService
from watchmen_model.admin import Pipeline, Space, Topic, UserRole
from watchmen_model.common import ConnectedSpaceId, PipelineId, SpaceId, TenantBasedTuple, TenantId, TopicId
from watchmen_rest.util import raise_400, raise_403
from watchmen_rest_doll.auth import get_any_admin_principal
from watchmen_rest_doll.console.connected_space_router import ConnectedSpaceWithSubjects
from watchmen_rest_doll.doll import ask_meta_storage, ask_snowflake_generator
from watchmen_utilities import ArrayHelper, is_blank
from ..util import trans

router = APIRouter()


class MixedImportType(str, Enum):
	NON_REDUNDANT = 'non-redundant'
	REPLACE = 'replace'
	FORCE_NEW = 'force-new'


class MixImportDataRequest(BaseModel):
	topics: List[Topic] = []
	pipelines: List[Pipeline] = []
	spaces: List[Space] = []
	connectedSpaces: List[ConnectedSpaceWithSubjects] = []
	importType: MixedImportType = None


class ImportDataResult(BaseModel):
	name: Optional[str] = None
	reason: Optional[str] = None


class TopicImportDataResult(ImportDataResult):
	topicId: Optional[TopicId] = None


class PipelineImportDataResult(ImportDataResult):
	pipelineId: Optional[PipelineId] = None


class SpaceImportDataResult(ImportDataResult):
	spaceId: Optional[SpaceId] = None


class ConnectedSpaceImportDataResult(ImportDataResult):
	connectId: Optional[ConnectedSpaceId] = None


class MixImportDataResponse(BaseModel):
	passed: bool = None
	topics: List[TopicImportDataResult] = []
	pipelines: List[PipelineImportDataResult] = []
	spaces: List[SpaceImportDataResult] = []
	connectedSpaces: List[ConnectedSpaceImportDataResult] = []


def get_user_service(principal_service: PrincipalService) -> UserService:
	return UserService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def same_tenant_validate(tenant_id: Optional[TenantId], a_tuple: TenantBasedTuple) -> TenantId:
	if is_blank(a_tuple.tenantId):
		return tenant_id
	elif tenant_id is None:
		return a_tuple.tenantId
	elif tenant_id != a_tuple.tenantId:
		raise_400('Data must under same tenant.')


def find_tenant_id(request: MixImportDataRequest) -> Optional[TenantId]:
	tenant_id = ArrayHelper(request.topics).reduce(same_tenant_validate, None)
	tenant_id = ArrayHelper(request.pipelines).reduce(same_tenant_validate, tenant_id)
	tenant_id = ArrayHelper(request.spaces).reduce(same_tenant_validate, tenant_id)
	tenant_id = ArrayHelper(request.connectedSpaces).reduce(same_tenant_validate, tenant_id)
	subjects = ArrayHelper(request.connectedSpaces).map(lambda x: x.subjects).flatten()
	tenant_id = subjects.reduce(same_tenant_validate, tenant_id)
	tenant_id = subjects.map(lambda x: x.reports).flatten().reduce(same_tenant_validate, tenant_id)
	return tenant_id


def set_tenant_id(a_tuple: TenantBasedTuple, tenant_id: TenantId) -> None:
	a_tuple.tenantId = tenant_id


def fill_tenant_id(request: MixImportDataRequest, tenant_id: TenantId) -> None:
	ArrayHelper(request.topics).each(lambda x: set_tenant_id(x, tenant_id))
	ArrayHelper(request.pipelines).each(lambda x: set_tenant_id(x, tenant_id))
	ArrayHelper(request.spaces).each(lambda x: set_tenant_id(x, tenant_id))
	ArrayHelper(request.connectedSpaces).each(lambda x: set_tenant_id(x, tenant_id))
	ArrayHelper(request.connectedSpaces).map(lambda x: x.subjects).flatten() \
		.each(lambda x: set_tenant_id(x, tenant_id)) \
		.map(lambda x: x.reports).flatten() \
		.each(lambda x: set_tenant_id(x, tenant_id))


def validate_tenant_id_when_super_admin(request: MixImportDataRequest) -> None:
	tenant_id = find_tenant_id(request)
	if tenant_id is None:
		raise_400('Tenant id is required.')
	fill_tenant_id(request, tenant_id)


def validate_tenant_id_when_tenant_admin(request: MixImportDataRequest, tenant_id: TenantId) -> None:
	found_tenant_id = find_tenant_id(request)
	if found_tenant_id != tenant_id:
		raise_400('Tenant id is required.')
	fill_tenant_id(request, found_tenant_id)


def validate_tenant_id(request: MixImportDataRequest, principal_service: PrincipalService) -> None:
	if principal_service.is_super_admin():
		validate_tenant_id_when_super_admin(request)
	elif principal_service.is_tenant_admin():
		validate_tenant_id_when_tenant_admin(request, principal_service.get_tenant_id())
	else:
		raise_403()


def clear_data_source_id(topics: Optional[List[Topic]]):
	def clear(topic: Topic) -> None:
		topic.dataSourceId = None

	ArrayHelper(topics).each(clear)


def import_on_non_redundant(
		request: MixImportDataRequest,
		user_service: UserService, principal_service: PrincipalService) -> MixImportDataResponse:
	"""
	import with non-redundant, any tuple already exists will be ignored
	"""
	validate_tenant_id(request, principal_service)
	pass


def import_on_replace(
		request: MixImportDataRequest,
		user_service: UserService, principal_service: PrincipalService) -> MixImportDataResponse:
	"""
	import with replace
	"""
	validate_tenant_id(request, principal_service)
	pass


def import_on_force_new(
		request: MixImportDataRequest,
		user_service: UserService, principal_service: PrincipalService) -> MixImportDataResponse:
	"""
	import with force new
	"""
	validate_tenant_id(request, principal_service)
	pass


@router.post('/import', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=MixImportDataResponse)
async def mix_import(
		request: MixImportDataRequest, principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> MixImportDataResponse:
	user_service = get_user_service(principal_service)

	if request.importType == MixedImportType.NON_REDUNDANT:
		action = import_on_non_redundant
	elif request.importType == MixedImportType.REPLACE:
		action = import_on_replace
	elif request.importType == MixedImportType.FORCE_NEW:
		action = import_on_force_new
	else:
		raise_400(f'Incorrect import type[{request.importType}].')

	return trans(user_service, lambda: action(request, user_service, principal_service))
# @router.post("/import", tags=["import"])
# async def import_assert(import_request: ImportDataRequest,
#                         current_user: User = Depends(deps.get_current_user)) -> ImportDataResponse:
#     if import_request.importType == ImportTPSCSType.NON_REDUNDANT.value:
#         log.info("import asset with NON_REDUNDANT type")
#         return __process_non_redundant_import(import_request, current_user)
#     elif import_request.importType == ImportTPSCSType.REPLACE.value:
#         log.info("import asset with replace type")
#         return __process_replace_import(import_request, current_user)
#     elif import_request.importType == ImportTPSCSType.FORCE_NEW.value:
#         return __process_forced_new_import(import_request, current_user)
#     else:
#         raise Exception("unknown import type {0}".format(import_request.importType))
