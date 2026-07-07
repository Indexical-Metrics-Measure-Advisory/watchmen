import yaml
from typing import Callable, List, Optional, Tuple

from fastapi import APIRouter, Depends, Request
from starlette.responses import Response

from watchmen_auth import PrincipalService
from watchmen_meta.admin import TopicService
from watchmen_meta.system import DataSourceService
from watchmen_model.admin import Factor, FactorEncryptMethod, FactorIndexGroup, FactorType, \
	Topic, TopicKind, TopicType, UserRole
from watchmen_model.common import DataSourceId, DataPage, TenantId, TopicId
from watchmen_rest import get_admin_principal, get_console_principal
from watchmen_rest.util import raise_400, raise_403, raise_404
from watchmen_rest_doll.util import trans, trans_readonly, trans_with_tail
from watchmen_utilities import ArrayHelper, ExtendedBaseModel, is_blank, is_not_blank

from .topic_common import (
	ensure_design_environment_for_yaml_update,
	get_topic_service,
	get_data_source_service,
	is_system_topic,
	ask_save_topic_action,
	QueryTopicDataPage,
)

router = APIRouter()


class AgentFactorYaml(ExtendedBaseModel):
	"""AI Agent factor definition (shared input/output), only business fields, no factorId"""
	name: str
	type: FactorType
	label: Optional[str] = None
	enumId: Optional[str] = None
	description: Optional[str] = None
	defaultValue: Optional[str] = None
	flatten: Optional[bool] = False
	indexGroup: Optional[FactorIndexGroup] = None
	encrypt: Optional[FactorEncryptMethod] = None
	precision: Optional[str] = None


class AgentTopicYaml(ExtendedBaseModel):
	"""AI Agent topic definition (shared input/output), no topicId / factorId / tenantId / version"""
	name: str
	type: TopicType = TopicType.DISTINCT
	kind: TopicKind = TopicKind.BUSINESS
	description: Optional[str] = None
	dataSourceCode: Optional[str] = None
	factors: List[AgentFactorYaml] = []

	def __setattr__(self, name, value):
		if name == 'factors':
			if value is None:
				super().__setattr__(name, [])
				return
			converted = [
				f if isinstance(f, AgentFactorYaml) else AgentFactorYaml(**f)
				for f in value
			]
			super().__setattr__(name, converted)
		else:
			super().__setattr__(name, value)


class AgentUpsertResult(ExtendedBaseModel):
	"""Upsert result: returns id-free Topic view + factor name mapping (name->name)"""
	action: str
	dryRun: bool
	topic: Optional[dict] = None
	factorIdMapping: dict = {}




def resolve_data_source_by_code(
		data_source_code: str, tenant_id: TenantId,
		data_source_service: DataSourceService) -> Optional[DataSourceId]:
	"""Lookup datasource id by dataSourceCode within tenant"""
	data_sources = data_source_service.find_all(tenant_id)
	for ds in data_sources:
		if ds.dataSourceCode == data_source_code:
			return ds.dataSourceId
	return None


def build_factor_from_agent(agent_factor: AgentFactorYaml, existing_factor_id: Optional[str]) -> Factor:
	"""Build Factor from Agent input, reuse existing factorId when name matches"""
	return Factor(
		factorId=existing_factor_id,
		name=agent_factor.name,
		type=agent_factor.type,
		label=agent_factor.label,
		enumId=agent_factor.enumId,
		description=agent_factor.description,
		defaultValue=agent_factor.defaultValue,
		flatten=agent_factor.flatten,
		indexGroup=agent_factor.indexGroup,
		encrypt=agent_factor.encrypt,
		precision=agent_factor.precision
	)


def prepare_agent_topic_upsert(
		agent_input: AgentTopicYaml, principal_service: PrincipalService,
		topic_service: TopicService) -> Tuple[str, Topic, dict]:
	"""
	Prepare upsert by name, return (action_type, topic, existing_factor_map).
	action_type: 'create' or 'update'.
	"""
	tenant_id: TenantId = principal_service.get_tenant_id()

	# 1. dataSourceCode -> dataSourceId
	data_source_service = get_data_source_service(topic_service)
	# data_source_service is a separate service, reuse topic_service's in-transaction storage
	data_source_service.storage = topic_service.storage
	data_source_id = resolve_data_source_by_code(agent_input.dataSourceCode, tenant_id, data_source_service)
	if data_source_id is None:
		raise_400(f'Data source [{agent_input.dataSourceCode}] not found in tenant [{tenant_id}].')

	# 2. topic.name -> find existing topic
	existing: Optional[Topic] = topic_service.find_by_name_and_tenant(agent_input.name, tenant_id)

	if existing is None:
		# ===== CREATE =====
		new_factors = [build_factor_from_agent(f, None) for f in agent_input.factors]
		topic = Topic(
			topicId=None,
			tenantId=tenant_id,
			name=agent_input.name,
			type=agent_input.type,
			kind=agent_input.kind,
			description=agent_input.description,
			dataSourceId=data_source_id,
			factors=new_factors
		)
		return 'create', topic, {}
	else:
		# ===== UPDATE =====
		# Reuse factorId by factor.name; unmatched (new) factors leave factorId blank for redress
		existing_factor_map = {f.name: f.factorId for f in (existing.factors or [])}
		new_factors = [build_factor_from_agent(f, existing_factor_map.get(f.name)) for f in agent_input.factors]
		existing.type = agent_input.type
		existing.kind = agent_input.kind
		existing.description = agent_input.description
		existing.dataSourceId = data_source_id
		existing.factors = new_factors
		# inherit version from existing to avoid optimistic lock conflict
		return 'update', existing, existing_factor_map


@router.post('/topic/yaml/agent-upsert', tags=[UserRole.ADMIN], response_class=Response)
async def upsert_topic_yaml_for_agent(
		request: Request, dry_run: bool = False,
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> Response:
	"""
	AI Agent-specific Topic YAML upsert endpoint.
	Upsert by topic.name, reuse factorId by factor.name.
	Only business fields (name / dataSourceCode / factors) required, no internal ids.

	Args:
	  - dry_run: when true, only validate without persisting; returns would_create / would_update
	"""
	ensure_design_environment_for_yaml_update()
	yaml_bytes = await request.body()
	yaml_str = yaml_bytes.decode('utf-8')
	try:
		agent_dict = yaml.safe_load(yaml_str)
		agent_input = AgentTopicYaml(**agent_dict)
	except Exception as e:
		raise_400(f'Invalid YAML: {str(e)}')

	# Validate dataSourceCode is not blank (required for upsert)
	if is_blank(agent_input.dataSourceCode):
		raise_400('dataSourceCode is required.')

	# Validate no duplicate factor names
	factor_names = [f.name for f in agent_input.factors]
	if len(factor_names) != len(set(factor_names)):
		raise_400('Duplicate factor names are not allowed.')

	# Forbid modifying system topics
	if agent_input.kind == TopicKind.SYSTEM:
		raise_400('System topics cannot be saved via agent-upsert.')

	topic_service = get_topic_service(principal_service)

	if dry_run:
		# dry-run: read-only transaction, only query and validate
		def do_prepare():
			action_type, full_topic, existing_factor_map = prepare_agent_topic_upsert(
				agent_input, principal_service, topic_service)
			# Build ds_map inside transaction so data_source_service reuses topic_service's storage
			data_source_service = get_data_source_service(topic_service)
			data_source_service.storage = topic_service.storage
			ds_map = build_data_source_id_to_code_map(principal_service.get_tenant_id(), data_source_service)
			return action_type, full_topic, existing_factor_map, ds_map

		action_type, full_topic, existing_factor_map, ds_map = trans_readonly(topic_service, do_prepare)
		display_action = 'would_create' if action_type == 'create' else 'would_update'
		view = to_agent_topic_view(full_topic, ds_map)
		# factorIdMapping: name->name, only indicates factors reused during update
		matched_names = [f.name for f in agent_input.factors if f.name in existing_factor_map]
		matched_mapping = {name: name for name in matched_names}
		result = AgentUpsertResult(
			action=display_action, dryRun=True,
			topic=view.model_dump(mode='json', by_alias=True, exclude_none=True),
			factorIdMapping=matched_mapping
		)
	else:
		# Persist: read-write transaction with tail (sync storage structure)
		def do_save():
			action_type, full_topic, _ = prepare_agent_topic_upsert(
				agent_input, principal_service, topic_service)
			# Build ds_map inside transaction so data_source_service reuses topic_service's storage
			data_source_service = get_data_source_service(topic_service)
			data_source_service.storage = topic_service.storage
			ds_map = build_data_source_id_to_code_map(principal_service.get_tenant_id(), data_source_service)
			save_action = ask_save_topic_action(topic_service, principal_service, True)
			saved_topic, tail = save_action(full_topic)
			view = to_agent_topic_view(saved_topic, ds_map)
			return (action_type, view), tail

		action_type, view = trans_with_tail(topic_service, do_save)
		# factorIdMapping: name->name, all factor names are present after persist
		saved_mapping = {f.name: f.name for f in view.factors}
		result = AgentUpsertResult(
			action=action_type, dryRun=False,
			topic=view.model_dump(mode='json', by_alias=True, exclude_none=True),
			factorIdMapping=saved_mapping
		)

	result_yaml = yaml.dump(result.model_dump(mode='json', by_alias=True, exclude_none=True), sort_keys=False)
	return Response(content=result_yaml, media_type="application/x-yaml")


# ====================================================================================
# AI Agent-friendly YAML download endpoints (return id-free structure, reuse AgentTopicYaml)
# ====================================================================================

def build_data_source_id_to_code_map(
		tenant_id: TenantId, data_source_service: DataSourceService) -> dict:
	"""Build tenant's dataSourceId -> dataSourceCode mapping"""
	data_sources = data_source_service.find_all(tenant_id)
	return {ds.dataSourceId: ds.dataSourceCode for ds in data_sources}


def to_agent_topic_view(topic: Topic, ds_id_to_code: dict) -> AgentTopicYaml:
	"""Convert a full Topic to Agent view (strip all internal ids)"""
	agent_factors = [
		AgentFactorYaml(
			name=f.name,
			type=f.type,
			label=f.label,
			enumId=f.enumId,
			description=f.description,
			defaultValue=f.defaultValue,
			flatten=f.flatten,
			indexGroup=f.indexGroup,
			encrypt=f.encrypt,
			precision=f.precision
		)
		for f in (topic.factors or [])
	]
	return AgentTopicYaml(
		name=topic.name,
		type=topic.type,
		kind=topic.kind,
		description=topic.description,
		dataSourceCode=ds_id_to_code.get(topic.dataSourceId),
		factors=agent_factors
	)


def dump_agent_topic_view_yaml(view: AgentTopicYaml) -> str:
	"""Serialize a single Agent view to YAML"""
	return yaml.dump(view.model_dump(mode='json', by_alias=True, exclude_none=True), sort_keys=False)


@router.get('/topic/yaml/agent-view', tags=[UserRole.ADMIN, UserRole.CONSOLE], response_class=Response)
async def load_topic_yaml_agent_view_by_id(
		topic_id: Optional[TopicId] = None,
		principal_service: PrincipalService = Depends(get_console_principal)
) -> Response:
	"""Download simplified YAML by topic_id (no topicId / factorId / tenantId / dataSourceId)"""
	if is_blank(topic_id):
		raise_400('Topic id is required.')
	topic_service = get_topic_service(principal_service)

	def action() -> Tuple[Topic, dict]:
		# noinspection PyTypeChecker
		topic: Topic = topic_service.find_by_id(topic_id)
		if topic is None:
			raise_404()
		if topic.tenantId != principal_service.get_tenant_id():
			raise_404()
		if is_system_topic(topic):
			raise_404()
		data_source_service = get_data_source_service(topic_service)
		# data_source_service.storage = topic_service.storage
		ds_map = build_data_source_id_to_code_map(principal_service.get_tenant_id(), data_source_service)
		return topic, ds_map

	topic, ds_map = trans_readonly(topic_service, action)
	view = to_agent_topic_view(topic, ds_map)
	return Response(content=dump_agent_topic_view_yaml(view), media_type="application/x-yaml")


@router.get('/topic/name/yaml/agent-view', tags=[UserRole.ADMIN, UserRole.CONSOLE], response_class=Response)
async def find_topic_yaml_agent_view_by_name(
		query_name: Optional[str],
		principal_service: PrincipalService = Depends(get_console_principal)
) -> Response:
	"""按 name 下载精简 YAML（无 topicId / factorId / tenantId / dataSourceId）"""
	if is_blank(query_name):
		raise_400('Topic name is required.')
	topic_service = get_topic_service(principal_service)

	def action() -> Tuple[Topic, dict]:
		tenant_id: TenantId = principal_service.get_tenant_id()
		topic: Optional[Topic] = topic_service.find_by_name_and_tenant(query_name, tenant_id)
		if topic is None:
			raise_404()
		if is_system_topic(topic):
			raise_404()
		data_source_service = get_data_source_service(topic_service)
		data_source_service.storage = topic_service.storage
		ds_map = build_data_source_id_to_code_map(tenant_id, data_source_service)
		return topic, ds_map

	topic, ds_map = trans_readonly(topic_service, action)
	view = to_agent_topic_view(topic, ds_map)
	return Response(content=dump_agent_topic_view_yaml(view), media_type="application/x-yaml")


@router.get('/topic/all/yaml/agent-view', tags=[UserRole.ADMIN], response_class=Response)
async def find_all_topics_yaml_agent_view(
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> Response:
	"""下载全部 Topic 的精简 YAML 数组（无 topicId / factorId / tenantId / dataSourceId）"""
	topic_service = get_topic_service(principal_service)
	data_source_service = get_data_source_service(topic_service)
	data_source_service.storage = topic_service.storage

	def action() -> Tuple[List[Topic], dict]:
		tenant_id = principal_service.get_tenant_id()
		topics = topic_service.find_all(tenant_id)
		topics = ArrayHelper(topics).filter(lambda x: not is_system_topic(x)).to_list()
		ds_map = build_data_source_id_to_code_map(tenant_id, data_source_service)
		return topics, ds_map

	topics, ds_map = trans_readonly(topic_service, action)
	views = [to_agent_topic_view(t, ds_map) for t in topics]
	yaml_str = yaml.dump(
		[v.model_dump(mode='json', by_alias=True, exclude_none=True) for v in views],
		sort_keys=False
	)
	return Response(content=yaml_str, media_type="application/x-yaml")
