from typing import List, Optional

from fastapi import APIRouter, Body, Depends

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.system import KafkaCollectorConfigService
from watchmen_model.admin import UserRole
from watchmen_model.common import DataPage, KafkaCollectorConfigId, Pageable
from watchmen_model.system import KafkaCollectorConfig
from watchmen_rest import get_any_admin_principal, get_super_admin_principal
from watchmen_rest.util import raise_400, raise_403, raise_404
from watchmen_rest_doll.doll import ask_tuple_delete_enabled
from watchmen_rest_doll.util import trans, trans_readonly
from watchmen_utilities import is_blank
from .utils import attach_tenant_name

router = APIRouter()


def get_kafka_collector_config_service(principal_service: PrincipalService) -> KafkaCollectorConfigService:
	return KafkaCollectorConfigService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.get('/kafka_collector_config', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=None)
async def load_kafka_collector_config_by_id(
		config_id: Optional[KafkaCollectorConfigId] = None,
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> KafkaCollectorConfig:
	if is_blank(config_id):
		raise_400('Kafka collector config id is required.')
	if not principal_service.is_super_admin():
		if config_id != principal_service.get_tenant_id():
			raise_403()

	kafka_collector_config_service = get_kafka_collector_config_service(principal_service)

	def action() -> KafkaCollectorConfig:
		# noinspection PyTypeChecker
		config: KafkaCollectorConfig = kafka_collector_config_service.find_by_id(config_id)
		if config is None:
			raise_404()
		return config

	return trans_readonly(kafka_collector_config_service, action)


@router.post('/kafka_collector_config', tags=[UserRole.SUPER_ADMIN], response_model=None)
async def save_kafka_collector_config(
		config: KafkaCollectorConfig,
		principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> KafkaCollectorConfig:
	kafka_collector_config_service = get_kafka_collector_config_service(principal_service)

	# noinspection DuplicatedCode
	def action(a_config: KafkaCollectorConfig) -> KafkaCollectorConfig:
		if kafka_collector_config_service.is_storable_id_faked(a_config.configId):
			kafka_collector_config_service.redress_storable_id(a_config)
			# noinspection PyTypeChecker
			a_config: KafkaCollectorConfig = kafka_collector_config_service.create(a_config)
		else:
			# noinspection PyTypeChecker
			a_config: KafkaCollectorConfig = kafka_collector_config_service.update(a_config)
		return a_config

	return trans(kafka_collector_config_service, lambda: action(config))


class QueryKafkaCollectorConfigDataPage(DataPage):
	data: List[KafkaCollectorConfig]


@router.post(
	'/kafka_collector_config/name', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=None)
async def find_kafka_collector_configs_by_name(
		query_name: Optional[str] = None, pageable: Pageable = Body(...),
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> QueryKafkaCollectorConfigDataPage:
	kafka_collector_config_service = get_kafka_collector_config_service(principal_service)

	# noinspection DuplicatedCode
	def action() -> QueryKafkaCollectorConfigDataPage:
		tenant_id = None
		if principal_service.is_tenant_admin():
			tenant_id = principal_service.get_tenant_id()
		if is_blank(query_name):
			# noinspection PyTypeChecker
			return kafka_collector_config_service.find_by_text(None, tenant_id, pageable)
		else:
			# noinspection PyTypeChecker
			return kafka_collector_config_service.find_by_text(query_name, tenant_id, pageable)

	page = trans_readonly(kafka_collector_config_service, action)
	page.data = attach_tenant_name(page.data, principal_service)
	return page


@router.get(
	'/kafka_collector_config/all', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=None)
async def find_all_kafka_collector_configs(
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> List[KafkaCollectorConfig]:
	tenant_id = None
	if principal_service.is_tenant_admin():
		tenant_id = principal_service.get_tenant_id()

	kafka_collector_config_service = get_kafka_collector_config_service(principal_service)

	def action() -> List[KafkaCollectorConfig]:
		return kafka_collector_config_service.find_all(tenant_id)

	return attach_tenant_name(trans_readonly(kafka_collector_config_service, action), principal_service)


@router.delete('/kafka_collector_config', tags=[UserRole.SUPER_ADMIN], response_model=None)
async def delete_kafka_collector_config_by_id(
		config_id: Optional[KafkaCollectorConfigId] = None,
		principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> KafkaCollectorConfig:
	if not ask_tuple_delete_enabled():
		raise_404('Not Found')

	if is_blank(config_id):
		raise_400('Kafka collector config id is required.')

	kafka_collector_config_service = get_kafka_collector_config_service(principal_service)

	def action() -> KafkaCollectorConfig:
		# noinspection PyTypeChecker
		config: KafkaCollectorConfig = kafka_collector_config_service.delete(config_id)
		if config is None:
			raise_404()
		return config

	return trans(kafka_collector_config_service, action)
