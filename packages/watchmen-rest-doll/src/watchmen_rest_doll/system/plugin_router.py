from typing import List, Optional

from fastapi import APIRouter, Body, Depends

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.system import PluginService
from watchmen_model.admin import UserRole
from watchmen_model.common import DataPage, Pageable, PluginId
from watchmen_model.system import Plugin
from watchmen_rest import get_any_admin_principal, get_super_admin_principal
from watchmen_rest.util import raise_400, raise_403, raise_404
from watchmen_rest_doll.doll import ask_tuple_delete_enabled
from watchmen_rest_doll.util import trans, trans_readonly
from watchmen_utilities import is_blank
from .utils import attach_tenant_name

router = APIRouter()


def get_plugin_service(principal_service: PrincipalService) -> PluginService:
	return PluginService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.get('/plugin', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=Plugin)
async def load_plugin_by_id(
		plugin_id: Optional[PluginId] = None,
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> Plugin:
	if is_blank(plugin_id):
		raise_400('Plugin id is required.')
	if not principal_service.is_super_admin():
		if plugin_id != principal_service.get_tenant_id():
			raise_403()

	plugin_service = get_plugin_service(principal_service)

	def action() -> Plugin:
		# noinspection PyTypeChecker
		plugin: Plugin = plugin_service.find_by_id(plugin_id)
		if plugin is None:
			raise_404()
		return plugin

	return trans_readonly(plugin_service, action)


@router.post('/plugin', tags=[UserRole.SUPER_ADMIN], response_model=Plugin)
async def save_plugin(
		plugin: Plugin, principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> Plugin:
	plugin_service = get_plugin_service(principal_service)

	# noinspection DuplicatedCode
	def action(a_plugin: Plugin) -> Plugin:
		if plugin_service.is_storable_id_faked(a_plugin.pluginId):
			plugin_service.redress_storable_id(a_plugin)
			# noinspection PyTypeChecker
			a_plugin: Plugin = plugin_service.create(a_plugin)
		else:
			# noinspection PyTypeChecker
			a_plugin: Plugin = plugin_service.update(a_plugin)

		return a_plugin

	return trans(plugin_service, lambda: action(plugin))


class QueryPluginDataPage(DataPage):
	data: List[Plugin]


@router.post(
	'/plugin/name', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=QueryPluginDataPage)
async def find_plugins_by_name(
		query_name: Optional[str] = None, pageable: Pageable = Body(...),
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> QueryPluginDataPage:
	plugin_service = get_plugin_service(principal_service)

	# noinspection DuplicatedCode
	def action() -> QueryPluginDataPage:
		tenant_id = None
		if principal_service.is_tenant_admin():
			tenant_id = principal_service.get_tenant_id()
		if is_blank(query_name):
			# noinspection PyTypeChecker
			return plugin_service.find_by_text(None, tenant_id, pageable)
		else:
			# noinspection PyTypeChecker
			return plugin_service.find_by_text(query_name, tenant_id, pageable)

	page = trans_readonly(plugin_service, action)
	page.data = attach_tenant_name(page.data, principal_service)
	return page


@router.get("/plugin/all", tags=[UserRole.ADMIN], response_model=List[Plugin])
async def find_all_plugins(
		principal_service: PrincipalService = Depends(get_any_admin_principal)) -> List[Plugin]:
	tenant_id = None
	if principal_service.is_tenant_admin():
		tenant_id = principal_service.get_tenant_id()

	plugin_service = get_plugin_service(principal_service)

	def action() -> List[Plugin]:
		return plugin_service.find_all(tenant_id)

	return attach_tenant_name(trans_readonly(plugin_service, action), principal_service)


@router.get("/plugin/achievement", tags=[UserRole.ADMIN], response_model=List[Plugin])
async def find_all_achievement_plugins(
		principal_service: PrincipalService = Depends(get_any_admin_principal)) -> List[Plugin]:
	tenant_id = None
	if principal_service.is_tenant_admin():
		tenant_id = principal_service.get_tenant_id()

	plugin_service = get_plugin_service(principal_service)

	def action() -> List[Plugin]:
		return plugin_service.find_all_achievement(tenant_id)

	return attach_tenant_name(trans_readonly(plugin_service, action), principal_service)


@router.delete('/plugin', tags=[UserRole.SUPER_ADMIN], response_model=Plugin)
async def delete_plugin_by_id(
		plugin_id: Optional[PluginId] = None,
		principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> Plugin:
	if not ask_tuple_delete_enabled():
		raise_404('Not Found')

	if is_blank(plugin_id):
		raise_400('Plugin id is required.')

	plugin_service = get_plugin_service(principal_service)

	def action() -> Plugin:
		# noinspection PyTypeChecker
		plugin: Plugin = plugin_service.delete(plugin_id)
		if plugin is None:
			raise_404()
		return plugin

	return trans(plugin_service, action)
