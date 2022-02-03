from typing import List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException

from watchmen_auth import PrincipalService
from watchmen_meta_service.admin import SpaceService
from watchmen_model.admin import Space, UserRole
from watchmen_model.common import DataPage, Pageable, SpaceId, TenantId
from watchmen_rest.util import raise_400, raise_403, raise_404, raise_500
from watchmen_rest_doll.auth import get_admin_principal
from watchmen_rest_doll.doll import ask_meta_storage, ask_snowflake_generator
from watchmen_rest_doll.util import is_blank, validate_tenant_id

router = APIRouter()


def get_space_service(principal_service: PrincipalService) -> SpaceService:
	return SpaceService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.get('/space', tags=[UserRole.ADMIN], response_model=Space)
async def load_space_by_id(
		space_id: Optional[SpaceId] = None, principal_service: PrincipalService = Depends(get_admin_principal)
) -> Space:
	if is_blank(space_id):
		raise_400('Space id is required.')

	space_service = get_space_service(principal_service)
	space_service.begin_transaction()
	try:
		# noinspection PyTypeChecker
		space: Space = space_service.find_by_id(space_id)
		# tenant id must match current principal's
		if space.tenantId != principal_service.get_tenant_id():
			raise_404()
		return space
	except HTTPException as e:
		raise e
	except Exception as e:
		raise_500(e)
	finally:
		space_service.close_transaction()


@router.post('/space', tags=[UserRole.ADMIN], response_model=Space)
async def save_user_group(
		space: Space, principal_service: PrincipalService = Depends(get_admin_principal)) -> Space:
	validate_tenant_id(space, principal_service)

	space_service = get_space_service(principal_service)

	if space_service.is_tuple_id_faked(space.spaceId):
		space_service.begin_transaction()
		try:
			space_service.redress_tuple_id(space)
			# noinspection PyTypeChecker
			space: Space = space_service.create(space)
			# TODO check topics
			# TODO synchronize space to user group
			space_service.commit_transaction()
		except HTTPException as e:
			space_service.rollback_transaction()
			raise e
		except Exception as e:
			space_service.rollback_transaction()
			raise_500(e)
	else:
		space_service.begin_transaction()
		try:
			# noinspection PyTypeChecker
			existing_space: Optional[Space] = space_service.find_by_id(space.spaceId)
			if existing_space is not None:
				if existing_space.tenantId != space.tenantId:
					raise_403()

			# noinspection PyTypeChecker
			space: Space = space_service.update(space)
			# TODO check topics
			# TODO synchronize space to user group
			space_service.commit_transaction()
		except HTTPException as e:
			space_service.rollback_transaction()
			raise e
		except Exception as e:
			space_service.rollback_transaction()
			raise_500(e)

	return space


@router.post('/space/name', tags=[UserRole.ADMIN], response_model=DataPage)
async def find_user_groups_by_name(
		query_name: Optional[str], pageable: Pageable = Body(...),
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> DataPage:
	tenant_id: TenantId = principal_service.get_tenant_id()
	if is_blank(query_name):
		query_name = None

	space_service = get_space_service(principal_service)
	space_service.begin_transaction()
	try:
		return space_service.find_by_text(query_name, tenant_id, pageable)
	except Exception as e:
		raise_500(e)
	finally:
		space_service.close_transaction()


@router.post('/space/ids', tags=[UserRole.ADMIN], response_model=List[Space])
async def find_user_groups_by_ids(
		space_ids: List[SpaceId], principal_service: PrincipalService = Depends(get_admin_principal)
) -> List[Space]:
	if len(space_ids) == 0:
		return []

	tenant_id: TenantId = principal_service.get_tenant_id()

	user_group_service = get_space_service(principal_service)
	user_group_service.begin_transaction()
	try:
		return user_group_service.find_by_ids(space_ids, tenant_id)
	except Exception as e:
		raise_500(e)
	finally:
		user_group_service.close_transaction()
