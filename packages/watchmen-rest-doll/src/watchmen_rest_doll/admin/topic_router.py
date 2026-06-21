from datetime import datetime
from typing import Callable, List, Optional, Tuple

import yaml
from fastapi import APIRouter, Body, Depends, Request, Response

from watchmen_auth import PrincipalService
from watchmen_data_kernel.cache import CacheService
from watchmen_data_kernel.common import ask_all_date_formats, ask_replace_topic_to_storage, ask_sync_topic_to_storage
from watchmen_data_kernel.service import sync_topic_structure_storage
from watchmen_meta.admin import FactorService, PipelineService, TopicService, TopicSnapshotSchedulerService
from watchmen_meta.analysis import TopicIndexService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.system import DataSourceService
from watchmen_model.admin import Factor, FactorEncryptMethod, FactorIndexGroup, FactorType, \
	Pipeline, Topic, TopicSnapshotScheduler, TopicType, UserRole, TopicKind
from watchmen_model.common import DataPage, DataSourceId, Pageable, TenantId, TopicId
from watchmen_pipeline_kernel.topic_snapshot import as_snapshot_task_topic_name, create_snapshot_pipeline, \
	create_snapshot_target_topic, create_snapshot_task_topic, rebuild_snapshot_pipeline, \
	rebuild_snapshot_target_topic, rebuild_snapshot_task_topic
from watchmen_rest import get_admin_principal, get_console_principal, get_any_admin_principal
from watchmen_rest.util import raise_400, raise_403, raise_404, validate_tenant_id
from watchmen_rest_doll.doll import ask_tuple_delete_enabled
from watchmen_rest_doll.util import trans, trans_readonly, trans_with_tail
from watchmen_utilities import ArrayHelper, ExtendedBaseModel, is_blank, is_date, is_not_blank
from .pipeline_router import ask_save_pipeline_action

router = APIRouter()


def ensure_design_environment_for_yaml_update() -> None:
	if not ask_replace_topic_to_storage() and not ask_sync_topic_to_storage():
		raise_400('Current environment is runtime. YAML update is allowed only in design environment.')


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def is_system_topic(topic: Topic) -> bool:
	return topic.kind == TopicKind.SYSTEM


def get_factor_service(topic_service: TopicService) -> FactorService:
	return FactorService(topic_service.snowflakeGenerator)


def get_topic_index_service(topic_service: TopicService) -> TopicIndexService:
	return TopicIndexService(topic_service.storage, topic_service.snowflakeGenerator)


def get_snapshot_scheduler_service(topic_service: TopicService) -> TopicSnapshotSchedulerService:
	return TopicSnapshotSchedulerService(
		topic_service.storage, topic_service.snowflakeGenerator, topic_service.principalService)


def get_pipeline_service(topic_service: TopicService) -> PipelineService:
	return PipelineService(topic_service.storage, topic_service.snowflakeGenerator, topic_service.principalService)


def get_data_source_service(topic_service: TopicService) -> DataSourceService:
	return DataSourceService(topic_service.storage, topic_service.snowflakeGenerator, topic_service.principalService)


@router.get('/topic', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=None)
async def load_topic_by_id(
		topic_id: Optional[TopicId] = None, principal_service: PrincipalService = Depends(get_console_principal)
) -> Topic:
	if is_blank(topic_id):
		raise_400('Topic id is required.')
	
	topic_service = get_topic_service(principal_service)
	
	def action() -> Topic:
		# noinspection PyTypeChecker
		topic: Topic = topic_service.find_by_id(topic_id)
		if topic is None:
			raise_404()
		# tenant id must match current principal's
		if topic.tenantId != principal_service.get_tenant_id():
			raise_404()
		return topic
	
	return trans_readonly(topic_service, action)


@router.get('/topic/yaml', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_class=Response)
async def load_topic_yaml_by_id(
		topic_id: Optional[TopicId] = None, principal_service: PrincipalService = Depends(get_console_principal)
) -> Response:
	if is_blank(topic_id):
		raise_400('Topic id is required.')
	
	topic_service = get_topic_service(principal_service)
	
	def action() -> Topic:
		# noinspection PyTypeChecker
		topic: Topic = topic_service.find_by_id(topic_id)
		if topic is None:
			raise_404()
		# tenant id must match current principal's
		if topic.tenantId != principal_service.get_tenant_id():
			raise_404()
		if is_system_topic(topic):
			raise_404()
		return topic
	
	topic = trans_readonly(topic_service, action)
	yaml_str = yaml.dump(topic.model_dump(mode='json', by_alias=True, exclude_none=True), sort_keys=False)
	return Response(content=yaml_str, media_type="application/x-yaml")


def redress_factor_ids(topic: Topic, topic_service: TopicService) -> None:
	factor_service = get_factor_service(topic_service)
	# noinspection PyTypeChecker
	ArrayHelper(topic.factors).each(lambda x: factor_service.redress_factor_id(x))


def build_topic_index(topic: Topic, topic_service: TopicService) -> None:
	get_topic_index_service(topic_service).build_index(topic)


def post_save_topic(topic: Topic, topic_service: TopicService) -> None:
	build_topic_index(topic, topic_service)
	CacheService.topic().put(topic)


def sync_topic_structure(
		topic: Topic, original_topic: Optional[Topic], principal_service: PrincipalService) -> Callable[[], None]:
	def tail() -> None:
		sync_topic_structure_storage(topic, original_topic, principal_service)
	
	return tail


def handle_scheduler(
		scheduler: TopicSnapshotScheduler, source_topic: Topic, task_topic: Topic,
		topic_service: TopicService, scheduler_service: TopicSnapshotSchedulerService,
		principal_service: PrincipalService
) -> Optional[Callable[[], None]]:
	target_topic_id = scheduler.targetTopicId
	if is_blank(target_topic_id):
		# incorrect scheduler, ignored
		return None
	
	should_save_scheduler = False
	
	target_topic: Optional[Topic] = topic_service.find_by_id(target_topic_id)
	if target_topic is None:
		# create target topic when not found
		target_topic = create_snapshot_target_topic(scheduler, source_topic)
		target_topic, target_topic_tail = ask_save_topic_action(topic_service, principal_service)(target_topic)
		scheduler.targetTopicId = target_topic.topicId
		should_save_scheduler = True
	else:
		# rebuild target topic
		target_topic = rebuild_snapshot_target_topic(target_topic, source_topic)
		target_topic, target_topic_tail = ask_save_topic_action(topic_service, principal_service)(target_topic)
	
	pipeline_service = get_pipeline_service(topic_service)
	pipeline_id = scheduler.pipelineId
	if is_blank(pipeline_id):
		# create pipeline not declared
		pipeline = create_snapshot_pipeline(task_topic, target_topic)
		pipeline = ask_save_pipeline_action(pipeline_service, principal_service)(pipeline)
		scheduler.pipelineId = pipeline.pipelineId
		should_save_scheduler = True
	else:
		pipeline: Optional[Pipeline] = pipeline_service.find_by_id(pipeline_id)
		if pipeline is None:
			# create pipeline when not found
			pipeline = create_snapshot_pipeline(task_topic, target_topic)
			pipeline = ask_save_pipeline_action(pipeline_service, principal_service)(pipeline)
			scheduler.pipelineId = pipeline.pipelineId
			should_save_scheduler = True
		else:
			# rebuild pipeline
			pipeline = rebuild_snapshot_pipeline(pipeline, task_topic, target_topic)
			ask_save_pipeline_action(pipeline_service, principal_service)(pipeline)
	
	if should_save_scheduler:
		scheduler_service.update(scheduler)
	
	return target_topic_tail


def combine_tail_actions(tails: List[Callable[[], None]]) -> Callable[[], None]:
	def tail() -> None:
		ArrayHelper(tails).each(lambda x: x())
	
	return tail


# noinspection PyUnusedLocal
def ask_save_topic_action(
		topic_service: TopicService, principal_service: PrincipalService, handle_snapshots: Optional[bool] = False
) -> Callable[[Topic], Tuple[Topic, Callable[[], None]]]:
	def action(topic: Topic) -> Tuple[Topic, Callable[[], None]]:
		if topic_service.is_storable_id_faked(topic.topicId):
			topic_service.redress_storable_id(topic)
			redress_factor_ids(topic, topic_service)
			# noinspection PyTypeChecker
			topic: Topic = topic_service.create(topic)
			tail = sync_topic_structure(topic, None, principal_service)
		else:
			# noinspection PyTypeChecker
			existing_topic: Optional[Topic] = topic_service.find_by_id(topic.topicId)
			if existing_topic is not None:
				if existing_topic.tenantId != topic.tenantId:
					raise_403()
			
			redress_factor_ids(topic, topic_service)
			# noinspection PyTypeChecker
			topic: Topic = topic_service.update(topic)
			
			if handle_snapshots:
				scheduler_service = get_snapshot_scheduler_service(topic_service)
				schedulers = scheduler_service.find_by_topic(topic.topicId)
				if len(schedulers) != 0:
					# first find the task topic
					task_topic_name = as_snapshot_task_topic_name(topic)
					task_topic = topic_service.find_by_name_and_tenant(task_topic_name, topic.tenantId)
					if task_topic is None:
						# create task topic
						task_topic = create_snapshot_task_topic(topic)
					else:
						# rebuild task topic
						task_topic = rebuild_snapshot_task_topic(task_topic, topic)
					# save task topic
					task_topic, tail_task_topic = ask_save_topic_action(topic_service, principal_service)(task_topic)
					# handle target topic and pipelines for each scheduler
					tails = ArrayHelper(schedulers) \
						.map(
						lambda x: handle_scheduler(
							x, topic, task_topic, topic_service, scheduler_service, principal_service)) \
						.filter(lambda x: x is not None) \
						.to_list()
					tail = combine_tail_actions(ArrayHelper(tails).grab(tail_task_topic).to_list())
				else:
					tail = sync_topic_structure(topic, existing_topic, principal_service)
			else:
				tail = sync_topic_structure(topic, existing_topic, principal_service)
		
		post_save_topic(topic, topic_service)
		
		return topic, tail
	
	return action


@router.post('/topic', tags=[UserRole.ADMIN], response_model=None)
async def save_topic(
		topic: Topic, principal_service: PrincipalService = Depends(get_admin_principal)
) -> Topic:
	validate_tenant_id(topic, principal_service)
	topic_service = get_topic_service(principal_service)
	action = ask_save_topic_action(topic_service, principal_service, True)
	return trans_with_tail(topic_service, lambda: action(topic))


@router.post('/topic/yaml', tags=[UserRole.ADMIN], response_class=Response)
async def save_topic_yaml(
		request: Request, principal_service: PrincipalService = Depends(get_admin_principal)
) -> Response:
	ensure_design_environment_for_yaml_update()
	yaml_bytes = await request.body()
	yaml_str = yaml_bytes.decode('utf-8')
	try:
		topic_dict = yaml.safe_load(yaml_str)
		topic = Topic.model_validate(topic_dict)
	except Exception as e:
		raise_400(f'Invalid YAML: {str(e)}')

	validate_tenant_id(topic, principal_service)
	if is_system_topic(topic):
		raise_400('System topics cannot be saved via YAML.')
	topic_service = get_topic_service(principal_service)
	action = ask_save_topic_action(topic_service, principal_service, True)
	saved_topic = trans_with_tail(topic_service, lambda: action(topic))
	
	saved_yaml_str = yaml.dump(saved_topic.model_dump(mode='json', by_alias=True, exclude_none=True), sort_keys=False)
	return Response(content=saved_yaml_str, media_type="application/x-yaml")


class QueryTopicDataPage(DataPage):
	data: List[Topic]


@router.post('/topic/name', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=None)
async def find_topics_page_by_name(
		query_name: Optional[str], pageable: Pageable = Body(...),
		principal_service: PrincipalService = Depends(get_console_principal)
) -> QueryTopicDataPage:
	topic_service = get_topic_service(principal_service)
	
	def action() -> QueryTopicDataPage:
		tenant_id: TenantId = principal_service.get_tenant_id()
		if is_blank(query_name):
			# noinspection PyTypeChecker
			return topic_service.find_page_by_text(None, tenant_id, pageable)
		else:
			# noinspection PyTypeChecker
			return topic_service.find_page_by_text(query_name, tenant_id, pageable)
	
	return trans_readonly(topic_service, action)


def to_topic_type(topic_type: str) -> Optional[TopicType]:
	for a_topic_type in TopicType:
		if topic_type == a_topic_type:
			# noinspection PyTypeChecker
			return a_topic_type
	return None


def to_exclude_types(exclude_types: Optional[str]) -> List[TopicType]:
	if is_blank(exclude_types):
		return []
	else:
		return ArrayHelper(exclude_types.strip().split(',')) \
			.map(lambda x: x.strip()) \
			.filter(lambda x: is_not_blank(x)) \
			.map(lambda x: to_topic_type(x)) \
			.filter(lambda x: x is not None) \
			.to_list()


@router.get('/topic/list/name', tags=[UserRole.ADMIN], response_model=None)
async def find_topics_by_name(
		query_name: Optional[str], exclude_types: Optional[str],
		principal_service: PrincipalService = Depends(get_console_principal)
) -> List[Topic]:
	topic_service = get_topic_service(principal_service)
	
	def action() -> List[Topic]:
		tenant_id: TenantId = principal_service.get_tenant_id()
		if is_blank(query_name):
			# noinspection PyTypeChecker
			return topic_service.find_by_name(None, to_exclude_types(exclude_types), tenant_id)
		else:
			# noinspection PyTypeChecker
			return topic_service.find_by_name(query_name, to_exclude_types(exclude_types), tenant_id)
	
	return trans_readonly(topic_service, action)


@router.get('/topic/name/yaml', tags=[UserRole.ADMIN], response_class=Response)
async def find_topic_yaml_by_name(
		query_name: Optional[str],
		principal_service: PrincipalService = Depends(get_console_principal)
) -> Response:
	if is_blank(query_name):
		raise_400('Topic name is required.')
		
	topic_service = get_topic_service(principal_service)
	
	def action() -> Topic:
		tenant_id: TenantId = principal_service.get_tenant_id()
		topic: Optional[Topic] = topic_service.find_by_name_and_tenant(query_name, tenant_id)
		if topic is None:
			raise_404()
		if is_system_topic(topic):
			raise_404()
		return topic

	topic = trans_readonly(topic_service, action)
	yaml_str = yaml.dump(topic.model_dump(mode='json', by_alias=True, exclude_none=True), sort_keys=False)
	return Response(content=yaml_str, media_type="application/x-yaml")


@router.post('/topic/ids', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=None)
async def find_topics_by_ids(
		topic_ids: List[TopicId],
		principal_service: PrincipalService = Depends(get_console_principal)
) -> List[Topic]:
	if len(topic_ids) == 0:
		return []
	
	topic_service = get_topic_service(principal_service)
	
	def action() -> List[Topic]:
		tenant_id: TenantId = principal_service.get_tenant_id()
		return topic_service.find_by_ids(topic_ids, tenant_id)
	
	return trans_readonly(topic_service, action)


@router.get('/topic/all', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=None)
async def find_all_topics(principal_service: PrincipalService = Depends(get_console_principal)) -> List[Topic]:
	tenant_id = principal_service.get_tenant_id()
	
	topic_service = get_topic_service(principal_service)
	
	def action() -> List[Topic]:
		return topic_service.find_all(tenant_id)
	
	return trans_readonly(topic_service, action)


@router.get('/topic/all/yaml', tags=[UserRole.ADMIN], response_class=Response)
async def find_all_topics_yaml(principal_service: PrincipalService = Depends(get_admin_principal)) -> Response:
	tenant_id = principal_service.get_tenant_id()
	topic_service = get_topic_service(principal_service)

	def action() -> List[Topic]:
		topics = topic_service.find_all(tenant_id)
		return ArrayHelper(topics).filter(lambda x: not is_system_topic(x)).to_list()

	topics = trans_readonly(topic_service, action)
	yaml_str = yaml.dump([t.model_dump(mode='json', by_alias=True, exclude_none=True) for t in topics], sort_keys=False)
	return Response(content=yaml_str, media_type="application/x-yaml")


class LastModified(ExtendedBaseModel):
	at: Optional[str] = None


# noinspection DuplicatedCode
@router.post('/topic/updated', tags=[UserRole.ADMIN], response_model=None)
async def find_updated_topics(
		lastModified: LastModified, principal_service: PrincipalService = Depends(get_admin_principal)) -> List[Topic]:
	if lastModified is None or is_blank(lastModified.at):
		return []
	parsed, last_modified_at = is_date(lastModified.at, ask_all_date_formats())
	if not parsed:
		return []
	if not isinstance(last_modified_at, datetime):
		last_modified_at = datetime(
			year=last_modified_at.year, month=last_modified_at.month, day=last_modified_at.day,
			hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
	
	topic_service = get_topic_service(principal_service)
	
	def action() -> List[Topic]:
		return topic_service.find_modified_after(last_modified_at, principal_service.get_tenant_id())
	
	return trans_readonly(topic_service, action)


def remove_topic_index(topic_id: TopicId, topic_service: TopicService) -> None:
	get_topic_index_service(topic_service).remove_index(topic_id)


def post_delete_topic(topic_id: TopicId, topic_service: TopicService) -> None:
	remove_topic_index(topic_id, topic_service)
	CacheService.topic().remove(topic_id)


@router.delete('/topic', tags=[UserRole.SUPER_ADMIN, UserRole.ADMIN], response_model=None)
async def delete_topic_by_id_by_admin(
		topic_id: Optional[TopicId] = None,
		principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> Topic:
	if not ask_tuple_delete_enabled():
		raise_404('Not Found')
	
	if is_blank(topic_id):
		raise_400('Topic id is required.')
	
	topic_service = get_topic_service(principal_service)
	
	def action() -> Topic:
		# noinspection PyTypeChecker
		topic: Topic = topic_service.delete(topic_id)
		if topic is None:
			raise_404()
		post_delete_topic(topic.topicId, topic_service)
		return topic
	
	return trans(topic_service, action)


@router.get("/topic/index/rebuild", tags=[UserRole.ADMIN])
async def rebuild_topics_index(principal_service: PrincipalService = Depends(get_admin_principal)):
	topic_service = get_topic_service(principal_service)
	index_service = get_topic_index_service(topic_service)
	
	def action():
		topic_list: List[Topic] = topic_service.find_all(principal_service.get_tenant_id())
		for topic in topic_list:
			if topic.kind == TopicKind.BUSINESS:
				index_service.build_index(topic)
	
	trans(topic_service, action)


# ====================================================================================
# AI Agent 友好的 YAML Upsert 端点（按业务名操作，无需任何内部 id）
# ====================================================================================

class AgentFactorYaml(ExtendedBaseModel):
	"""AI Agent 的 factor 定义（入参和出参共用），只需业务字段，无需 factorId"""
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
	"""AI Agent 的 topic 定义（入参和出参共用），无需 topicId / factorId / tenantId / version"""
	name: str
	type: TopicType = TopicType.DISTINCT
	kind: TopicKind = TopicKind.BUSINESS
	description: Optional[str] = None
	dataSourceCode: Optional[str] = None
	factors: List[AgentFactorYaml] = []


class AgentUpsertResult(ExtendedBaseModel):
	"""Upsert 结果，返回完整 Topic（含 id）+ factorId 映射表"""
	action: str
	dryRun: bool
	topic: Optional[dict] = None
	factorIdMapping: dict = {}





def resolve_data_source_by_code(
		data_source_code: str, tenant_id: TenantId,
		data_source_service: DataSourceService) -> Optional[DataSourceId]:
	"""按 dataSourceCode 在租户内查找数据源 id"""
	data_sources = data_source_service.find_all(tenant_id)
	for ds in data_sources:
		if ds.dataSourceCode == data_source_code:
			return ds.dataSourceId
	return None


def build_factor_from_agent(agent_factor: AgentFactorYaml, existing_factor_id: Optional[str]) -> Factor:
	"""从 Agent 输入构建 Factor，复用已存在的 factorId（按 name 匹配）"""
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
	按 name 做 upsert 准备，返回 (action_type, topic, existing_factor_map)。
	action_type: 'create' 或 'update'。
	"""
	tenant_id: TenantId = principal_service.get_tenant_id()

	# 1. dataSourceCode → dataSourceId
	data_source_service = get_data_source_service(topic_service)
	data_source_id = resolve_data_source_by_code(agent_input.dataSourceCode, tenant_id, data_source_service)
	if data_source_id is None:
		raise_400(f'Data source [{agent_input.dataSourceCode}] not found in tenant [{tenant_id}].')

	# 2. topic.name → 查找现有 topic
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
		# 按 factor.name 复用 factorId，未匹配的（新 factor）factorId 留空由 redress 生成
		existing_factor_map = {f.name: f.factorId for f in (existing.factors or [])}
		new_factors = [build_factor_from_agent(f, existing_factor_map.get(f.name)) for f in agent_input.factors]
		existing.type = agent_input.type
		existing.kind = agent_input.kind
		existing.description = agent_input.description
		existing.dataSourceId = data_source_id
		existing.factors = new_factors
		# version 从 existing 继承，避免乐观锁冲突
		return 'update', existing, existing_factor_map


@router.post('/topic/yaml/agent-upsert', tags=[UserRole.ADMIN], response_class=Response)
async def upsert_topic_yaml_for_agent(
		request: Request, dry_run: bool = False,
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> Response:
	"""
	AI Agent 专用的 Topic YAML upsert 端点。
	按 topic.name 做 upsert，按 factor.name 复用 factorId。
	入参只需业务字段（name / dataSourceCode / factors），无需任何内部 id。

	参数:
	  - dry_run: true 时只校验不落库，返回 would_create / would_update
	"""
	ensure_design_environment_for_yaml_update()
	yaml_bytes = await request.body()
	yaml_str = yaml_bytes.decode('utf-8')
	try:
		agent_dict = yaml.safe_load(yaml_str)
		agent_input = AgentTopicYaml(**agent_dict)
	except Exception as e:
		raise_400(f'Invalid YAML: {str(e)}')

	# 校验 dataSourceCode 非空（upsert 入参必填）
	if is_blank(agent_input.dataSourceCode):
		raise_400('dataSourceCode is required.')

	# 校验 factor.name 不重复
	factor_names = [f.name for f in agent_input.factors]
	if len(factor_names) != len(set(factor_names)):
		raise_400('Duplicate factor names are not allowed.')

	# 禁止操作系统 topic
	if agent_input.kind == TopicKind.SYSTEM:
		raise_400('System topics cannot be saved via agent-upsert.')

	topic_service = get_topic_service(principal_service)

	if dry_run:
		# dry-run：只读事务，只做查询和校验
		def do_prepare():
			return prepare_agent_topic_upsert(agent_input, principal_service, topic_service)

		action_type, full_topic, existing_factor_map = trans_readonly(topic_service, do_prepare)
		display_action = 'would_create' if action_type == 'create' else 'would_update'
		# 转换为无 id 视图后返回
		ds_map = build_data_source_id_to_code_map(principal_service.get_tenant_id(), get_data_source_service(principal_service))
		view = to_agent_topic_view(full_topic, ds_map)
		# factorIdMapping 改为 name→name，仅指示 update 时被复用的 factor
		matched_names = [f.name for f in agent_input.factors if f.name in existing_factor_map]
		matched_mapping = {name: name for name in matched_names}
		result = AgentUpsertResult(
			action=display_action, dryRun=True,
			topic=view.model_dump(mode='json', by_alias=True, exclude_none=True),
			factorIdMapping=matched_mapping
		)
	else:
		# 落库：读写事务，带 tail（同步存储结构）
		def do_save():
			action_type, full_topic, _ = prepare_agent_topic_upsert(
				agent_input, principal_service, topic_service)
			# 在事务内构建 ds_map，使 data_source_service 复用 topic_service 的 storage
			data_source_service = get_data_source_service(topic_service)
			data_source_service.storage = topic_service.storage
			ds_map = build_data_source_id_to_code_map(principal_service.get_tenant_id(), data_source_service)
			save_action = ask_save_topic_action(topic_service, principal_service, True)
			saved_topic, tail = save_action(full_topic)
			view = to_agent_topic_view(saved_topic, ds_map)
			return (action_type, view), tail

		action_type, view = trans_with_tail(topic_service, do_save)
		# factorIdMapping 改为 name→name，落库后所有 factor name 都在
		saved_mapping = {f.name: f.name for f in view.factors}
		result = AgentUpsertResult(
			action=action_type, dryRun=False,
			topic=view.model_dump(mode='json', by_alias=True, exclude_none=True),
			factorIdMapping=saved_mapping
		)

	result_yaml = yaml.dump(result.model_dump(mode='json', by_alias=True, exclude_none=True), sort_keys=False)
	return Response(content=result_yaml, media_type="application/x-yaml")


# ====================================================================================
# AI Agent 友好的 YAML 下载端点（返回无 id 结构，复用 AgentTopicYaml）
# ====================================================================================

def build_data_source_id_to_code_map(
		tenant_id: TenantId, data_source_service: DataSourceService) -> dict:
	"""构建租户内 dataSourceId → dataSourceCode 映射"""
	data_sources = data_source_service.find_all(tenant_id)
	return {ds.dataSourceId: ds.dataSourceCode for ds in data_sources}


def to_agent_topic_view(topic: Topic, ds_id_to_code: dict) -> AgentTopicYaml:
	"""将完整 Topic 转换为 Agent 视图（剥离所有内部 id）"""
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
	"""序列化单个 Agent 视图为 YAML"""
	return yaml.dump(view.model_dump(mode='json', by_alias=True, exclude_none=True), sort_keys=False)


@router.get('/topic/yaml/agent-view', tags=[UserRole.ADMIN, UserRole.CONSOLE], response_class=Response)
async def load_topic_yaml_agent_view_by_id(
		topic_id: Optional[TopicId] = None,
		principal_service: PrincipalService = Depends(get_console_principal)
) -> Response:
	"""按 topic_id 下载精简 YAML（无 topicId / factorId / tenantId / dataSourceId）"""
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
