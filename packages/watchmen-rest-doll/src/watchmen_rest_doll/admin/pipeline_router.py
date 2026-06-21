import yaml
from datetime import datetime
from typing import Callable, List, Optional, Tuple

from fastapi import APIRouter, Depends, Request, Body
from starlette.responses import Response

from watchmen_auth import PrincipalService
from watchmen_data_kernel.cache import CacheService
from watchmen_data_kernel.common import ask_all_date_formats, ask_replace_topic_to_storage, ask_sync_topic_to_storage
from watchmen_meta.admin import PipelineService, TopicService
from watchmen_meta.analysis import PipelineIndexService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator, TupleService
from watchmen_model.admin import Pipeline, PipelineAction, PipelineStage, PipelineUnit, Topic, TopicKind, UserRole
from watchmen_model.common import PipelineId, TenantId, TopicId
from watchmen_rest import get_admin_principal, get_console_principal, get_super_admin_principal
from watchmen_rest.util import raise_400, raise_403, raise_404, validate_tenant_id
from watchmen_rest_doll.doll import ask_tuple_delete_enabled
from watchmen_rest_doll.util import trans, trans_readonly
from watchmen_utilities import ArrayHelper, is_blank, is_date, ExtendedBaseModel

router = APIRouter()


def ensure_design_environment_for_yaml_update() -> None:
	if not ask_replace_topic_to_storage() and not ask_sync_topic_to_storage():
		raise_400('Current environment is runtime. YAML update is allowed only in design environment.')


def get_pipeline_service(principal_service: PrincipalService) -> PipelineService:
	return PipelineService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_pipeline_index_service(pipeline_service: PipelineService) -> PipelineIndexService:
	return PipelineIndexService(pipeline_service.storage, pipeline_service.snowflakeGenerator)


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def is_system_topic_by_id(topic_id: TopicId, principal_service: PrincipalService) -> bool:
	topic_service = get_topic_service(principal_service)
	topic = trans_readonly(topic_service, lambda: topic_service.find_by_id(topic_id))
	if topic is None:
		return False
	return topic.kind == TopicKind.SYSTEM


def filter_pipelines_by_source_topic_system(
		pipelines: List[Pipeline], principal_service: PrincipalService
) -> List[Pipeline]:
	return ArrayHelper(pipelines).filter(
		lambda x: not is_system_topic_by_id(x.topicId, principal_service)
	).to_list()


@router.get('/pipeline', tags=[UserRole.ADMIN], response_model=None)
async def load_pipeline_by_id(
		pipeline_id: Optional[PipelineId],
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> Pipeline:
	if is_blank(pipeline_id):
		raise_400('Pipeline id is required.')

	pipeline_service = get_pipeline_service(principal_service)

	def action() -> Pipeline:
		# noinspection PyTypeChecker
		pipeline: Pipeline = pipeline_service.find_by_id(pipeline_id)
		if pipeline is None:
			raise_404()
		# tenant id must match current principal's
		if pipeline.tenantId != principal_service.get_tenant_id():
			raise_404()
		return pipeline

	return trans_readonly(pipeline_service, action)


@router.get('/pipeline/yaml', tags=[UserRole.ADMIN], response_class=Response)
async def load_pipeline_yaml_by_id(
		pipeline_id: Optional[PipelineId],
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> Response:
	if is_blank(pipeline_id):
		raise_400('Pipeline id is required.')

	pipeline_service = get_pipeline_service(principal_service)

	def action() -> Pipeline:
		# noinspection PyTypeChecker
		pipeline: Pipeline = pipeline_service.find_by_id(pipeline_id)
		if pipeline is None:
			raise_404()
		# tenant id must match current principal's
		if pipeline.tenantId != principal_service.get_tenant_id():
			raise_404()
		if is_system_topic_by_id(pipeline.topicId, principal_service):
			raise_404()
		return pipeline

	pipeline = trans_readonly(pipeline_service, action)
	yaml_str = yaml.dump(pipeline.model_dump(mode='json', by_alias=True, exclude_none=True), sort_keys=False)
	return Response(content=yaml_str, media_type="application/x-yaml")


def redress_action_ids(action: PipelineAction, pipeline_service: PipelineService) -> None:
	if TupleService.is_storable_id_faked(action.actionId):
		action.actionId = pipeline_service.generate_storable_id()


def redress_unit_ids(unit: PipelineUnit, pipeline_service: PipelineService) -> None:
	if TupleService.is_storable_id_faked(unit.unitId):
		unit.unitId = pipeline_service.generate_storable_id()
	ArrayHelper(unit.do).each(lambda x: redress_action_ids(x, pipeline_service))


def redress_stage_ids(stage: PipelineStage, pipeline_service: PipelineService) -> None:
	if TupleService.is_storable_id_faked(stage.stageId):
		stage.stageId = pipeline_service.generate_storable_id()
	ArrayHelper(stage.units).each(lambda x: redress_unit_ids(x, pipeline_service))


def redress_ids(pipeline: Pipeline, pipeline_service: PipelineService) -> None:
	ArrayHelper(pipeline.stages).each(lambda x: redress_stage_ids(x, pipeline_service))


def build_pipeline_index(pipeline: Pipeline, pipeline_service: PipelineService) -> None:
	get_pipeline_index_service(pipeline_service).build_index(pipeline)


def build_pipeline_cache(pipeline: Pipeline) -> None:
	CacheService.pipeline().put(pipeline)


def post_save_pipeline(pipeline: Pipeline, pipeline_service: PipelineService) -> None:
	build_pipeline_index(pipeline, pipeline_service)
	build_pipeline_cache(pipeline)


# noinspection PyUnusedLocal
def ask_save_pipeline_action(
		pipeline_service: PipelineService, principal_service: PrincipalService) -> Callable[[Pipeline], Pipeline]:
	def action(pipeline: Pipeline) -> Pipeline:
		if pipeline_service.is_storable_id_faked(pipeline.pipelineId):
			pipeline_service.redress_storable_id(pipeline)
			redress_ids(pipeline, pipeline_service)
			# noinspection PyTypeChecker
			pipeline: Pipeline = pipeline_service.create(pipeline)
		else:
			# noinspection PyTypeChecker
			existing_pipeline: Optional[Pipeline] = pipeline_service.find_by_id(pipeline.pipelineId)
			if existing_pipeline is not None:
				if existing_pipeline.tenantId != pipeline.tenantId:
					raise_403()

			redress_ids(pipeline, pipeline_service)
			# noinspection PyTypeChecker
			pipeline: Pipeline = pipeline_service.update(pipeline)

		post_save_pipeline(pipeline, pipeline_service)

		return pipeline

	return action


@router.post('/pipeline', tags=[UserRole.ADMIN], response_model=None)
async def save_pipeline(
		pipeline: Pipeline, principal_service: PrincipalService = Depends(get_admin_principal)
) -> Pipeline:
	validate_tenant_id(pipeline, principal_service)
	if is_system_topic_by_id(pipeline.topicId, principal_service):
		raise_400('Pipelines with system topic as source cannot be saved via YAML.')
	pipeline_service = get_pipeline_service(principal_service)
	action = ask_save_pipeline_action(pipeline_service, principal_service)
	return trans(pipeline_service, lambda: action(pipeline))


@router.post('/pipeline/yaml', tags=[UserRole.ADMIN], response_class=Response)
async def save_pipeline_yaml(
		request: Request, principal_service: PrincipalService = Depends(get_admin_principal)
) -> Response:
	ensure_design_environment_for_yaml_update()
	yaml_bytes = await request.body()
	yaml_str = yaml_bytes.decode('utf-8')
	try:
		pipeline_dict = yaml.safe_load(yaml_str)
		pipeline = Pipeline.model_validate(pipeline_dict)
	except Exception as e:
		raise_400(f'Invalid YAML: {str(e)}')

	validate_tenant_id(pipeline, principal_service)
	pipeline_service = get_pipeline_service(principal_service)
	action = ask_save_pipeline_action(pipeline_service, principal_service)
	saved_pipeline = trans(pipeline_service, lambda: action(pipeline))

	saved_yaml_str = yaml.dump(saved_pipeline.model_dump(mode='json', by_alias=True, exclude_none=True), sort_keys=False)
	return Response(content=saved_yaml_str, media_type="application/x-yaml")


def post_update_pipeline_name(pipeline: Pipeline, pipeline_service: PipelineService) -> None:
	get_pipeline_index_service(pipeline_service).update_index_on_name_changed(pipeline)
	CacheService.pipeline().put(pipeline)


@router.get('/pipeline/rename', tags=[UserRole.ADMIN], response_class=Response)
async def update_pipeline_name_by_id(
		pipeline_id: Optional[PipelineId], name: Optional[str],
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> None:
	"""
	rename pipeline will not increase the optimistic lock version
	"""
	if is_blank(pipeline_id):
		raise_400('Pipeline id is required.')

	pipeline_service = get_pipeline_service(principal_service)

	def action() -> None:
		existing_tenant_id: Optional[TenantId] = pipeline_service.find_tenant_id(pipeline_id)
		if existing_tenant_id is None:
			raise_404()
		elif existing_tenant_id != principal_service.get_tenant_id():
			raise_403()
		# noinspection PyTypeChecker
		pipeline: Pipeline = pipeline_service.update_name(pipeline_id, name, principal_service.get_tenant_id())
		post_update_pipeline_name(pipeline, pipeline_service)

	trans(pipeline_service, action)


def post_update_pipeline_enablement(pipeline: Pipeline, pipeline_service: PipelineService) -> None:
	get_pipeline_index_service(pipeline_service).update_index_on_enablement_changed(pipeline)
	CacheService.pipeline().put(pipeline)


@router.get('/pipeline/enabled', tags=[UserRole.ADMIN], response_class=Response)
async def update_pipeline_enabled_by_id(
		pipeline_id: Optional[PipelineId], enabled: Optional[bool],
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> None:
	"""
	enable/disable pipeline will not increase the optimistic lock version
	"""
	if is_blank(pipeline_id):
		raise_400('Pipeline id is required.')
	if enabled is None:
		raise_400('Enabled is required.')

	pipeline_service = get_pipeline_service(principal_service)

	def action() -> None:
		existing_tenant_id: Optional[TenantId] = pipeline_service.find_tenant_id(pipeline_id)
		if existing_tenant_id is None:
			raise_404()
		elif existing_tenant_id != principal_service.get_tenant_id():
			raise_403()
		# noinspection PyTypeChecker
		pipeline: Pipeline = pipeline_service.update_enablement(pipeline_id, enabled, principal_service.get_tenant_id())
		post_update_pipeline_enablement(pipeline, pipeline_service)

	trans(pipeline_service, action)


@router.get('/pipeline/all', tags=[UserRole.ADMIN], response_model=None)
async def find_all_pipelines(principal_service: PrincipalService = Depends(get_admin_principal)) -> List[Pipeline]:
	pipeline_service = get_pipeline_service(principal_service)

	def action() -> List[Pipeline]:
		tenant_id = principal_service.get_tenant_id()
		return pipeline_service.find_all(tenant_id)

	return trans_readonly(pipeline_service, action)


@router.get('/pipeline/all/yaml', tags=[UserRole.ADMIN], response_class=Response)
async def find_all_pipelines_yaml(principal_service: PrincipalService = Depends(get_admin_principal)) -> Response:
	pipeline_service = get_pipeline_service(principal_service)

	def action() -> List[Pipeline]:
		tenant_id = principal_service.get_tenant_id()
		pipelines = pipeline_service.find_all(tenant_id)
		return filter_pipelines_by_source_topic_system(pipelines, principal_service)

	pipelines = trans_readonly(pipeline_service, action)
	yaml_str = yaml.dump([p.model_dump(mode='json', by_alias=True, exclude_none=True) for p in pipelines], sort_keys=False)
	return Response(content=yaml_str, media_type="application/x-yaml")


class LastModified(ExtendedBaseModel):
	at: Optional[str] = None


# noinspection DuplicatedCode
@router.post('/pipeline/updated', tags=[UserRole.ADMIN], response_model=None)
async def find_updated_pipelines(
		lastModified: LastModified, principal_service: PrincipalService = Depends(get_admin_principal)
) -> List[Pipeline]:
	if lastModified is None or is_blank(lastModified.at):
		return []
	parsed, last_modified_at = is_date(lastModified.at, ask_all_date_formats())
	if not parsed:
		return []
	if not isinstance(last_modified_at, datetime):
		last_modified_at = datetime(
			year=last_modified_at.year, month=last_modified_at.month, day=last_modified_at.day,
			hour=0, minute=0, second=0, microsecond=0, tzinfo=None)

	pipeline_service = get_pipeline_service(principal_service)

	def action() -> List[Pipeline]:
		return pipeline_service.find_modified_after(last_modified_at, principal_service.get_tenant_id())

	return trans_readonly(pipeline_service, action)


@router.get('/pipeline/name/yaml', tags=[UserRole.ADMIN], response_class=Response)
async def find_pipeline_yaml_by_name(
		query_name: Optional[str],
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> Response:
	if is_blank(query_name):
		raise_400('Pipeline name is required.')

	pipeline_service = get_pipeline_service(principal_service)

	def action() -> Pipeline:
		tenant_id: TenantId = principal_service.get_tenant_id()
		pipeline: Optional[Pipeline] = pipeline_service.find_by_name_and_tenant(query_name, tenant_id)
		if pipeline is None:
			raise_404()
		if is_system_topic_by_id(pipeline.topicId, principal_service):
			raise_404()
		return pipeline

	pipeline = trans_readonly(pipeline_service, action)
	yaml_str = yaml.dump(pipeline.model_dump(mode='json', by_alias=True, exclude_none=True), sort_keys=False)
	return Response(content=yaml_str, media_type="application/x-yaml")


def remove_pipeline_index(pipeline_id: PipelineId, pipeline_service: PipelineService) -> None:
	get_pipeline_index_service(pipeline_service).remove_index(pipeline_id)


def post_delete_pipeline(pipeline_id: PipelineId, pipeline_service: PipelineService) -> None:
	remove_pipeline_index(pipeline_id, pipeline_service)
	CacheService.pipeline().remove(pipeline_id)


@router.delete('/pipeline', tags=[UserRole.SUPER_ADMIN], response_model=None)
async def delete_pipeline_by_id_by_super_admin(
		pipeline_id: Optional[PipelineId] = None,
		principal_service: PrincipalService = Depends(get_super_admin_principal)
) -> Pipeline:
	if not ask_tuple_delete_enabled():
		raise_404('Not Found')

	if is_blank(pipeline_id):
		raise_400('Topic id is required.')

	pipeline_service = get_pipeline_service(principal_service)

	def action() -> Pipeline:
		# noinspection PyTypeChecker
		pipeline: Pipeline = pipeline_service.delete(pipeline_id)
		if pipeline is None:
			raise_404()
		post_delete_pipeline(pipeline.pipelineId, pipeline_service)
		return pipeline

	return trans(pipeline_service, action)


# ====================================================================================
# AI Agent 友好的 Pipeline YAML 端点（无 id 结构，按 name 索引）
# ====================================================================================

class AgentPipelineTopicResolver:
	"""缓存租户内所有 topic 及 factor 索引，供 pipeline agent YAML 转换使用。"""

	def __init__(self, topics: List[Topic]) -> None:
		self.topic_by_id: dict = {}                      # str(topicId) -> Topic
		self.topic_by_name: dict = {}                    # topicName -> Topic
		self.factor_id_to_name: dict = {}                # str(factorId) -> factorName
		self.factor_id_to_topic_name: dict = {}          # str(factorId) -> topicName
		self.factor_name_by_topic_name: dict = {}        # topicName -> {factorName: str(factorId)}
		for t in topics or []:
			tid = str(t.topicId) if t.topicId is not None else None
			if tid:
				self.topic_by_id[tid] = t
			self.topic_by_name[t.name] = t
			factor_map: dict = {}
			for f in (t.factors or []):
				fid = str(f.factorId) if f.factorId is not None else None
				if not fid:
					continue
				self.factor_id_to_name[fid] = f.name
				self.factor_id_to_topic_name[fid] = t.name
				factor_map[f.name] = fid
			self.factor_name_by_topic_name[t.name] = factor_map

	def topic_id_to_name(self, topic_id) -> Optional[str]:
		if topic_id is None:
			return None
		topic = self.topic_by_id.get(str(topic_id))
		return topic.name if topic else None

	def factor_id_to_name_safe(self, factor_id) -> Optional[str]:
		if factor_id is None:
			return None
		return self.factor_id_to_name.get(str(factor_id))

	def factor_id_to_topic_name_safe(self, factor_id) -> Optional[str]:
		if factor_id is None:
			return None
		return self.factor_id_to_topic_name.get(str(factor_id))


def build_pipeline_topic_resolver(principal_service: PrincipalService) -> AgentPipelineTopicResolver:
	topic_service = get_topic_service(principal_service)
	topics = trans_readonly(topic_service, lambda: topic_service.find_all(principal_service.get_tenant_id()))
	return AgentPipelineTopicResolver(topics)


class AgentPipelineYaml(ExtendedBaseModel):
	"""AI Agent 的 pipeline 定义（入参和出参共用），无需 pipelineId / tenantId / version / topicId / factorId / stageId / unitId / actionId。"""
	name: str
	sourceTopicName: str
	type: Optional[str] = None
	enabled: Optional[bool] = True
	validated: Optional[bool] = False
	conditional: Optional[bool] = False
	on: Optional[dict] = None
	stages: Optional[List[dict]] = []


class AgentPipelineUpsertResult(ExtendedBaseModel):
	"""Pipeline upsert 结果"""
	action: str
	dryRun: bool
	pipeline: Optional[dict] = None
	topicIdMapping: dict = {}   # topicName -> topicId
	factorIdMapping: dict = {}  # topicName.factorName -> factorId


# ---------- full → agent 转换 ----------

def _joint_to_agent_view(joint, resolver: AgentPipelineTopicResolver):
	if not isinstance(joint, dict):
		return joint
	if 'filters' in joint:
		joint['filters'] = [_cond_to_agent_view(f, resolver) for f in (joint.get('filters') or [])]
	return joint


def _cond_to_agent_view(cond, resolver: AgentPipelineTopicResolver):
	if not isinstance(cond, dict):
		return cond
	if 'jointType' in cond:
		return _joint_to_agent_view(cond, resolver)
	# parameter expression
	if 'left' in cond:
		cond['left'] = _param_to_agent_view(cond['left'], resolver)
	if 'right' in cond:
		cond['right'] = _param_to_agent_view(cond['right'], resolver)
	return cond


def _param_to_agent_view(param, resolver: AgentPipelineTopicResolver):
	if not isinstance(param, dict):
		return param
	kind = param.get('kind')
	if kind == 'topic':
		if 'topicId' in param and param.get('topicId') is not None:
			topic_name = resolver.topic_id_to_name(param.get('topicId'))
			param.pop('topicId', None)
			if topic_name:
				param['topicName'] = topic_name
		if 'factorId' in param and param.get('factorId') is not None:
			factor_name = resolver.factor_id_to_name_safe(param.get('factorId'))
			param.pop('factorId', None)
			if factor_name:
				param['factorName'] = factor_name
	if 'parameters' in param and isinstance(param.get('parameters'), list):
		param['parameters'] = [_param_to_agent_view(p, resolver) for p in param['parameters']]
	if 'on' in param:
		param['on'] = _joint_to_agent_view(param['on'], resolver)
	return param


def _action_to_agent_view(action: dict, resolver: AgentPipelineTopicResolver) -> dict:
	if not isinstance(action, dict):
		return action
	action.pop('actionId', None)
	# action 级 topicId / factorId (FromTopic / FromFactor / ToTopic / ToFactor)
	if 'topicId' in action and action.get('topicId') is not None:
		topic_name = resolver.topic_id_to_name(action.get('topicId'))
		action.pop('topicId', None)
		if topic_name:
			action['topicName'] = topic_name
	if 'factorId' in action and action.get('factorId') is not None:
		fid = action.get('factorId')
		factor_name = resolver.factor_id_to_name_safe(fid)
		topic_name = resolver.factor_id_to_topic_name_safe(fid)
		action.pop('factorId', None)
		if factor_name:
			action['factorName'] = factor_name
		if topic_name and 'topicName' not in action:
			action['topicName'] = topic_name
	# by (FindBy)
	if 'by' in action:
		action['by'] = _joint_to_agent_view(action['by'], resolver)
	# source (CopyToMemoryAction / WriteFactorAction)
	if 'source' in action:
		action['source'] = _param_to_agent_view(action['source'], resolver)
	# mapping[].factorId / mapping[].source (MappingRow)
	if 'mapping' in action and isinstance(action.get('mapping'), list):
		for m in action['mapping']:
			if not isinstance(m, dict):
				continue
			if 'factorId' in m and m.get('factorId') is not None:
				factor_name = resolver.factor_id_to_name_safe(m.get('factorId'))
				m.pop('factorId', None)
				if factor_name:
					m['factorName'] = factor_name
			if 'source' in m:
				m['source'] = _param_to_agent_view(m['source'], resolver)
	# on (AlarmAction / Conditional)
	if 'on' in action:
		action['on'] = _joint_to_agent_view(action['on'], resolver)
	return action


def _unit_to_agent_view(unit: dict, resolver: AgentPipelineTopicResolver) -> dict:
	if not isinstance(unit, dict):
		return unit
	unit.pop('unitId', None)
	if 'on' in unit:
		unit['on'] = _joint_to_agent_view(unit['on'], resolver)
	if 'do' in unit and isinstance(unit.get('do'), list):
		unit['do'] = [_action_to_agent_view(a, resolver) for a in unit['do']]
	return unit


def _stage_to_agent_view(stage: dict, resolver: AgentPipelineTopicResolver) -> dict:
	if not isinstance(stage, dict):
		return stage
	stage.pop('stageId', None)
	if 'on' in stage:
		stage['on'] = _joint_to_agent_view(stage['on'], resolver)
	if 'units' in stage and isinstance(stage.get('units'), list):
		stage['units'] = [_unit_to_agent_view(u, resolver) for u in stage['units']]
	return stage


def to_agent_pipeline_view(pipeline: Pipeline, resolver: AgentPipelineTopicResolver) -> AgentPipelineYaml:
	"""将完整 Pipeline 转换为 Agent 视图（剥离所有内部 id，topicId → sourceTopicName 等）"""
	data = pipeline.model_dump(mode='json', by_alias=True, exclude_none=True)
	# 剥离内部 id / tenant / version
	data.pop('pipelineId', None)
	data.pop('tenantId', None)
	data.pop('version', None)
	# root source topic
	topic_id = data.pop('topicId', None)
	source_topic_name = resolver.topic_id_to_name(topic_id) if topic_id is not None else None
	if not source_topic_name:
		raise_400('Pipeline source topic is missing or resolved failed.')
	# on
	if 'on' in data and data.get('on') is not None:
		data['on'] = _joint_to_agent_view(data['on'], resolver)
	# stages
	if 'stages' in data and isinstance(data.get('stages'), list):
		data['stages'] = [_stage_to_agent_view(s, resolver) for s in data['stages']]
	data['sourceTopicName'] = source_topic_name
	return AgentPipelineYaml(**data)


def dump_agent_pipeline_view_yaml(view: AgentPipelineYaml) -> str:
	return yaml.dump(view.model_dump(mode='json', by_alias=True, exclude_none=True), sort_keys=False)


# ---------- agent → full 转换 ----------

def _joint_from_agent_view(joint, resolver: AgentPipelineTopicResolver, topic_id_mapping: dict, factor_id_mapping: dict):
	if not isinstance(joint, dict):
		return joint
	if 'filters' in joint:
		joint['filters'] = [
			_cond_from_agent_view(f, resolver, topic_id_mapping, factor_id_mapping)
			for f in (joint.get('filters') or [])
		]
	return joint


def _cond_from_agent_view(cond, resolver, topic_id_mapping, factor_id_mapping):
	if not isinstance(cond, dict):
		return cond
	if 'jointType' in cond:
		return _joint_from_agent_view(cond, resolver, topic_id_mapping, factor_id_mapping)
	if 'left' in cond:
		cond['left'] = _param_from_agent_view(cond['left'], resolver, topic_id_mapping, factor_id_mapping)
	if 'right' in cond:
		cond['right'] = _param_from_agent_view(cond['right'], resolver, topic_id_mapping, factor_id_mapping)
	return cond


def _param_from_agent_view(param, resolver, topic_id_mapping, factor_id_mapping):
	if not isinstance(param, dict):
		return param
	kind = param.get('kind')
	if kind == 'topic':
		topic_name = param.pop('topicName', None)
		factor_name = param.pop('factorName', None)
		if topic_name:
			topic = resolver.topic_by_name.get(topic_name)
			if topic is None:
				raise_400(f'Topic [{topic_name}] not found.')
			param['topicId'] = topic.topicId
			topic_id_mapping[topic_name] = topic.topicId
			if factor_name:
				factor_map = resolver.factor_name_by_topic_name.get(topic_name, {})
				factor_id = factor_map.get(factor_name)
				if factor_id is None:
					raise_400(f'Factor [{topic_name}.{factor_name}] not found.')
				param['factorId'] = factor_id
				factor_id_mapping[f'{topic_name}.{factor_name}'] = factor_id
	if 'parameters' in param and isinstance(param.get('parameters'), list):
		param['parameters'] = [
			_param_from_agent_view(p, resolver, topic_id_mapping, factor_id_mapping)
			for p in param['parameters']
		]
	if 'on' in param:
		param['on'] = _joint_from_agent_view(param['on'], resolver, topic_id_mapping, factor_id_mapping)
	return param


def _action_from_agent_view(action, resolver, topic_id_mapping, factor_id_mapping):
	if not isinstance(action, dict):
		return action
	topic_name = action.pop('topicName', None)
	factor_name = action.pop('factorName', None)
	if topic_name:
		topic = resolver.topic_by_name.get(topic_name)
		if topic is None:
			raise_400(f'Topic [{topic_name}] not found.')
		action['topicId'] = topic.topicId
		topic_id_mapping[topic_name] = topic.topicId
	if factor_name:
		# factorName 在 action 级属于 action 的 topic（read/write 目标）
		if not topic_name:
			raise_400('factorName provided without topicName in action.')
		factor_map = resolver.factor_name_by_topic_name.get(topic_name, {})
		factor_id = factor_map.get(factor_name)
		if factor_id is None:
			raise_400(f'Factor [{topic_name}.{factor_name}] not found.')
		action['factorId'] = factor_id
		factor_id_mapping[f'{topic_name}.{factor_name}'] = factor_id
	if 'by' in action:
		action['by'] = _joint_from_agent_view(action['by'], resolver, topic_id_mapping, factor_id_mapping)
	if 'source' in action:
		action['source'] = _param_from_agent_view(action['source'], resolver, topic_id_mapping, factor_id_mapping)
	# mapping[].factorName 属于目标 topic（= action 的 topicName），mapping[].source 是源参数
	if 'mapping' in action and isinstance(action.get('mapping'), list):
		for m in action['mapping']:
			if not isinstance(m, dict):
				continue
			if 'factorName' in m and m.get('factorName') is not None:
				m_factor_name = m.pop('factorName')
				if topic_name:
					factor_map = resolver.factor_name_by_topic_name.get(topic_name, {})
					fid = factor_map.get(m_factor_name)
					if fid is None:
						raise_400(f'Factor [{topic_name}.{m_factor_name}] not found.')
					m['factorId'] = fid
					factor_id_mapping[f'{topic_name}.{m_factor_name}'] = fid
			if 'source' in m:
				m['source'] = _param_from_agent_view(m['source'], resolver, topic_id_mapping, factor_id_mapping)
	if 'on' in action:
		action['on'] = _joint_from_agent_view(action['on'], resolver, topic_id_mapping, factor_id_mapping)
	return action


def _unit_from_agent_view(unit, resolver, topic_id_mapping, factor_id_mapping):
	if not isinstance(unit, dict):
		return unit
	if 'on' in unit:
		unit['on'] = _joint_from_agent_view(unit['on'], resolver, topic_id_mapping, factor_id_mapping)
	if 'do' in unit and isinstance(unit.get('do'), list):
		unit['do'] = [
			_action_from_agent_view(a, resolver, topic_id_mapping, factor_id_mapping)
			for a in unit['do']
		]
	return unit


def _stage_from_agent_view(stage, resolver, topic_id_mapping, factor_id_mapping):
	if not isinstance(stage, dict):
		return stage
	if 'on' in stage:
		stage['on'] = _joint_from_agent_view(stage['on'], resolver, topic_id_mapping, factor_id_mapping)
	if 'units' in stage and isinstance(stage.get('units'), list):
		stage['units'] = [
			_unit_from_agent_view(u, resolver, topic_id_mapping, factor_id_mapping)
			for u in stage['units']
		]
	return stage


def build_pipeline_from_agent(
		agent_input: AgentPipelineYaml, principal_service: PrincipalService,
		pipeline_service: PipelineService, topic_service: TopicService
) -> Tuple[str, Pipeline, AgentPipelineTopicResolver, dict, dict]:
	"""
	按 pipeline.name 做 upsert 准备。
	返回 (action_type, pipeline, resolver, topic_id_mapping, factor_id_mapping)。
	action_type: 'create' 或 'update'。
	"""
	tenant_id: TenantId = principal_service.get_tenant_id()

	# build resolver（在外层事务中查询）
	topics = topic_service.find_all(tenant_id)
	resolver = AgentPipelineTopicResolver(topics)

	# resolve source topic
	source_topic = resolver.topic_by_name.get(agent_input.sourceTopicName)
	if source_topic is None:
		raise_400(f'Source topic [{agent_input.sourceTopicName}] not found.')
	if source_topic.kind == TopicKind.SYSTEM:
		raise_400('Pipelines with system topic as source cannot be saved via agent-upsert.')

	# find existing by name + tenant
	existing: Optional[Pipeline] = pipeline_service.find_by_name_and_tenant(agent_input.name, tenant_id)

	# build dict and convert
	pipeline_dict = agent_input.model_dump(exclude_none=True)
	topic_id_mapping: dict = {agent_input.sourceTopicName: source_topic.topicId}
	factor_id_mapping: dict = {}
	pipeline_dict.pop('sourceTopicName', None)
	pipeline_dict['topicId'] = source_topic.topicId
	# on
	if 'on' in pipeline_dict and pipeline_dict.get('on') is not None:
		pipeline_dict['on'] = _joint_from_agent_view(
			pipeline_dict['on'], resolver, topic_id_mapping, factor_id_mapping)
	# stages
	if 'stages' in pipeline_dict and isinstance(pipeline_dict.get('stages'), list):
		pipeline_dict['stages'] = [
			_stage_from_agent_view(s, resolver, topic_id_mapping, factor_id_mapping)
			for s in pipeline_dict['stages']
		]

	if existing is None:
		action_type = 'create'
		pipeline_dict['pipelineId'] = None
		pipeline_dict['tenantId'] = tenant_id
	else:
		action_type = 'update'
		pipeline_dict['pipelineId'] = existing.pipelineId
		pipeline_dict['tenantId'] = existing.tenantId
		if existing.version is not None:
			pipeline_dict['version'] = existing.version

	pipeline = Pipeline.model_validate(pipeline_dict)
	return action_type, pipeline, resolver, topic_id_mapping, factor_id_mapping


# ---------- 端点 ----------

@router.get('/pipeline/yaml/agent-view', tags=[UserRole.ADMIN, UserRole.CONSOLE], response_class=Response)
async def load_pipeline_yaml_agent_view_by_id(
		pipeline_id: Optional[PipelineId] = None,
		principal_service: PrincipalService = Depends(get_console_principal)
) -> Response:
	"""按 pipeline_id 下载精简 YAML（无 pipelineId / topicId / factorId / stageId / unitId / actionId / tenantId / version）"""
	if is_blank(pipeline_id):
		raise_400('Pipeline id is required.')
	pipeline_service = get_pipeline_service(principal_service)

	def action() -> Pipeline:
		# noinspection PyTypeChecker
		pipeline: Pipeline = pipeline_service.find_by_id(pipeline_id)
		if pipeline is None:
			raise_404()
		if pipeline.tenantId != principal_service.get_tenant_id():
			raise_404()
		if is_system_topic_by_id(pipeline.topicId, principal_service):
			raise_404()
		return pipeline

	pipeline = trans_readonly(pipeline_service, action)
	resolver = build_pipeline_topic_resolver(principal_service)
	view = to_agent_pipeline_view(pipeline, resolver)
	return Response(content=dump_agent_pipeline_view_yaml(view), media_type="application/x-yaml")


@router.get('/pipeline/name/yaml/agent-view', tags=[UserRole.ADMIN, UserRole.CONSOLE], response_class=Response)
async def find_pipeline_yaml_agent_view_by_name(
		query_name: Optional[str],
		principal_service: PrincipalService = Depends(get_console_principal)
) -> Response:
	"""按 name 下载精简 YAML（无 pipelineId / topicId / factorId / stageId / unitId / actionId / tenantId / version）"""
	if is_blank(query_name):
		raise_400('Pipeline name is required.')
	pipeline_service = get_pipeline_service(principal_service)

	def action() -> Pipeline:
		tenant_id: TenantId = principal_service.get_tenant_id()
		pipeline: Optional[Pipeline] = pipeline_service.find_by_name_and_tenant(query_name, tenant_id)
		if pipeline is None:
			raise_404()
		if is_system_topic_by_id(pipeline.topicId, principal_service):
			raise_404()
		return pipeline

	pipeline = trans_readonly(pipeline_service, action)
	resolver = build_pipeline_topic_resolver(principal_service)
	view = to_agent_pipeline_view(pipeline, resolver)
	return Response(content=dump_agent_pipeline_view_yaml(view), media_type="application/x-yaml")


@router.get('/pipeline/all/yaml/agent-view', tags=[UserRole.ADMIN], response_class=Response)
async def find_all_pipelines_yaml_agent_view(
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> Response:
	"""下载全部 Pipeline 的精简 YAML 数组"""
	pipeline_service = get_pipeline_service(principal_service)

	def action() -> List[Pipeline]:
		tenant_id = principal_service.get_tenant_id()
		pipelines = pipeline_service.find_all(tenant_id)
		return filter_pipelines_by_source_topic_system(pipelines, principal_service)

	pipelines = trans_readonly(pipeline_service, action)
	resolver = build_pipeline_topic_resolver(principal_service)
	views = [to_agent_pipeline_view(p, resolver) for p in pipelines]
	yaml_str = yaml.dump(
		[v.model_dump(mode='json', by_alias=True, exclude_none=True) for v in views],
		sort_keys=False
	)
	return Response(content=yaml_str, media_type="application/x-yaml")


@router.post('/pipeline/yaml/agent-upsert', tags=[UserRole.ADMIN], response_class=Response)
async def upsert_pipeline_yaml_for_agent(
		request: Request, dry_run: bool = False,
		principal_service: PrincipalService = Depends(get_admin_principal)
) -> Response:
	"""
	AI Agent 专用的 Pipeline YAML upsert 端点。
	按 pipeline.name 做 upsert，stage/unit/action id 不复用，服务端统一 redress 生成。
	入参只需业务字段（name / sourceTopicName / stages 等），无需任何内部 id。
	"""
	ensure_design_environment_for_yaml_update()
	yaml_bytes = await request.body()
	yaml_str = yaml_bytes.decode('utf-8')
	try:
		agent_dict = yaml.safe_load(yaml_str)
		agent_input = AgentPipelineYaml(**agent_dict)
	except Exception as e:
		raise_400(f'Invalid YAML: {str(e)}')

	if is_blank(agent_input.sourceTopicName):
		raise_400('sourceTopicName is required.')
	if is_blank(agent_input.name):
		raise_400('Pipeline name is required.')

	pipeline_service = get_pipeline_service(principal_service)
	topic_service = get_topic_service(principal_service)

	if dry_run:
		def do_prepare():
			return build_pipeline_from_agent(agent_input, principal_service, pipeline_service, topic_service)

		action_type, pipeline, resolver, topic_id_mapping, factor_id_mapping = trans_readonly(
			pipeline_service, do_prepare)
		display_action = 'would_create' if action_type == 'create' else 'would_update'
		view = to_agent_pipeline_view(pipeline, resolver)
		result = AgentPipelineUpsertResult(
			action=display_action, dryRun=True,
			pipeline=view.model_dump(mode='json', by_alias=True, exclude_none=True),
			topicIdMapping=topic_id_mapping,
			factorIdMapping=factor_id_mapping
		)
	else:
		def do_save():
			action_type, pipeline, resolver, topic_id_mapping, factor_id_mapping = build_pipeline_from_agent(
				agent_input, principal_service, pipeline_service, topic_service)
			save_action = ask_save_pipeline_action(pipeline_service, principal_service)
			saved_pipeline = save_action(pipeline)
			return action_type, saved_pipeline, resolver, topic_id_mapping, factor_id_mapping

		action_type, saved_pipeline, resolver, topic_id_mapping, factor_id_mapping = trans(pipeline_service, do_save)
		result = AgentPipelineUpsertResult(
			action=action_type, dryRun=False,
			pipeline=saved_pipeline.model_dump(mode='json', by_alias=True, exclude_none=True),
			topicIdMapping=topic_id_mapping,
			factorIdMapping=factor_id_mapping
		)

	result_yaml = yaml.dump(result.model_dump(mode='json', by_alias=True, exclude_none=True), sort_keys=False)
	return Response(content=result_yaml, media_type="application/x-yaml")
