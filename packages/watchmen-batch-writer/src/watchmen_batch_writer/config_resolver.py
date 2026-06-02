from logging import getLogger
from typing import Dict, List, Optional, Tuple

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.storage.collector_model_config_service import CollectorModelConfigService
from watchmen_collector_kernel.storage.collector_table_config_service import CollectorTableConfigService
from watchmen_data_kernel.meta import DataSourceService, PipelineService, TopicService
from watchmen_data_kernel.service import ask_topic_data_service, ask_topic_storage
from watchmen_data_kernel.storage import TopicDataEntityHelper, TopicDataService
from watchmen_data_kernel.storage_bridge.topic_utils import ask_topic_data_entity_helper
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import (
	FactorIndexGroup, InsertOrMergeRowAction, InsertRowAction, MergeRowAction, Pipeline,
	Topic, TopicType, WriteTopicActionType)
from watchmen_model.common import FactorId, TenantId
from watchmen_model.system import DataSource
from watchmen_pipeline_kernel import TopicDataColumnNames
from watchmen_storage import TopicDataStorageSPI
from watchmen_utilities import is_blank

logger = getLogger(__name__)

UNIQUE_INDEX_PREFIX = 'u-'
PK_FALLBACK_COLUMN = TopicDataColumnNames.ID.value


class ResolvedConfig:
	def __init__(
			self,
			table_name: str,
			tenant_id: str,
			raw_topic: Topic,
			raw_schema: TopicSchema,
			ods_topic: Optional[Topic],
			ods_schema: Optional[TopicSchema],
			field_map: Dict[str, str],
			data_source: DataSource,
			storage: TopicDataStorageSPI,
			data_service: TopicDataService,
			entity_helper: TopicDataEntityHelper,
			pk_columns: List[str],
			principal_service: PrincipalService
	):
		self.table_name = table_name
		self.tenant_id = tenant_id
		self.raw_topic = raw_topic
		self.raw_schema = raw_schema
		self.ods_topic = ods_topic
		self.ods_schema = ods_schema
		self.field_map = field_map
		self.data_source = data_source
		self.storage = storage
		self.data_service = data_service
		self.entity_helper = entity_helper
		self.pk_columns = pk_columns
		self.principal_service = principal_service

	@property
	def is_complete(self) -> bool:
		return self.ods_schema is not None and self.ods_topic is not None


class ConfigResolver:
	def __init__(self, principal_service: PrincipalService):
		self.principal_service = principal_service
		self._cache: Dict[str, Optional[ResolvedConfig]] = {}

	def _topic_service(self) -> TopicService:
		return TopicService(self.principal_service)

	def _data_source_service(self) -> DataSourceService:
		return DataSourceService(self.principal_service)

	def _pipeline_service(self) -> PipelineService:
		return PipelineService(self.principal_service)

	def _collector_table_config_service(self) -> CollectorTableConfigService:
		storage = ask_meta_storage()
		return CollectorTableConfigService(storage, ask_snowflake_generator(), self.principal_service)

	def _collector_model_config_service(self) -> CollectorModelConfigService:
		storage = ask_meta_storage()
		return CollectorModelConfigService(storage, ask_snowflake_generator(), self.principal_service)

	def resolve(self, table_name: str, tenant_id: TenantId) -> Optional[ResolvedConfig]:
		cache_key = f'{table_name}:{tenant_id}'
		cached = self._cache.get(cache_key)
		if cache_key in self._cache:
			return cached
		config = self._do_resolve(table_name, tenant_id)
		self._cache[cache_key] = config
		return config

	def preload(self, table_names: List[str], tenant_id: TenantId) -> None:
		for name in table_names:
			self.resolve(name, tenant_id)

	def invalidate(self, table_name: str, tenant_id: TenantId) -> None:
		self._cache.pop(f'{table_name}:{tenant_id}', None)

	def _do_resolve(self, table_name: str, tenant_id: TenantId) -> Optional[ResolvedConfig]:
		table_config_service = self._collector_table_config_service()
		table_config = table_config_service.find_by_table_name(table_name, tenant_id)
		if table_config is None:
			logger.warning(f'CollectorTableConfig not found for table={table_name}, tenant={tenant_id}')
			return None

		model_name = table_config.modelName
		if is_blank(model_name):
			logger.warning(f'ModelName is blank in CollectorTableConfig for table={table_name}')
			return None

		model_config_service = self._collector_model_config_service()
		model_config = model_config_service.find_by_name(model_name, tenant_id)
		if model_config is None:
			logger.warning(f'CollectorModelConfig not found for modelName={model_name}, tenant={tenant_id}')
			return None

		raw_topic_code = model_config.rawTopicCode
		if is_blank(raw_topic_code):
			logger.warning(f'RawTopicCode is blank in CollectorModelConfig for modelName={model_name}')
			return None

		topic_service = self._topic_service()
		raw_schema = topic_service.find_schema_by_name(raw_topic_code, tenant_id)
		if raw_schema is None:
			logger.warning(f'Raw TopicSchema not found for name={raw_topic_code}, tenant={tenant_id}')
			return None

		raw_topic = raw_schema.get_topic()
		if raw_topic.type != TopicType.RAW:
			logger.warning(f'Topic[name={raw_topic_code}] is not RAW, got {raw_topic.type}')
			return None

		if is_blank(raw_topic.dataSourceId):
			logger.warning(f'Topic[name={raw_topic_code}] has no dataSourceId')
			return self._build_partial(table_name, tenant_id, raw_topic, raw_schema)

		data_source_service = self._data_source_service()
		data_source = data_source_service.find_by_id(raw_topic.dataSourceId)
		if data_source is None:
			logger.warning(f'DataSource not found for id={raw_topic.dataSourceId}')
			return self._build_partial(table_name, tenant_id, raw_topic, raw_schema)

		storage = ask_topic_storage(raw_schema, self.principal_service)
		storage.register_topic(raw_topic, data_source)

		data_service = ask_topic_data_service(raw_schema, storage, self.principal_service)
		raw_entity_helper = ask_topic_data_entity_helper(raw_schema)
		raw_pk_columns = self._find_pk_columns(raw_topic, raw_schema)

		ods_topic, ods_schema, field_map = self._resolve_ods_mapping(raw_topic, tenant_id)
		if ods_schema is None:
			logger.warning(
				f'No ODS topic resolved from pipelines for raw topic={raw_topic_code}, table={table_name}')
			return self._build_partial(
				table_name, tenant_id, raw_topic, raw_schema, data_source, storage, data_service,
				raw_entity_helper, raw_pk_columns)

		return ResolvedConfig(
			table_name=table_name,
			tenant_id=tenant_id,
			raw_topic=raw_topic,
			raw_schema=raw_schema,
			ods_topic=ods_topic,
			ods_schema=ods_schema,
			field_map=field_map,
			data_source=data_source,
			storage=storage,
			data_service=data_service,
			entity_helper=raw_entity_helper,
			pk_columns=raw_pk_columns,
			principal_service=self.principal_service
		)

	def _build_partial(
			self, table_name: str, tenant_id: str, raw_topic: Topic, raw_schema: TopicSchema,
			data_source: Optional[DataSource] = None,
			storage: Optional[TopicDataStorageSPI] = None,
			data_service: Optional[TopicDataService] = None,
			entity_helper: Optional[TopicDataEntityHelper] = None,
			pk_columns: Optional[List[str]] = None) -> ResolvedConfig:
		return ResolvedConfig(
			table_name=table_name,
			tenant_id=tenant_id,
			raw_topic=raw_topic,
			raw_schema=raw_schema,
			ods_topic=None,
			ods_schema=None,
			field_map={},
			data_source=data_source,  # type: ignore[arg-type]
			storage=storage,  # type: ignore[arg-type]
			data_service=data_service,  # type: ignore[arg-type]
			entity_helper=entity_helper,  # type: ignore[arg-type]
			pk_columns=pk_columns or [PK_FALLBACK_COLUMN],
			principal_service=self.principal_service
		)

	def _resolve_ods_mapping(
			self, raw_topic: Topic, tenant_id: str
	) -> Tuple[Optional[Topic], Optional[TopicSchema], Dict[str, str]]:
		pipelines = self._pipeline_service().find_by_topic_id(raw_topic.topicId)
		write_actions = []
		for pipeline in pipelines:
			if pipeline.enabled is False:
				continue
			for stage in (pipeline.stages or []):
				for unit in (stage.units or []):
					for action in (unit.do or []):
						if isinstance(action, (InsertRowAction, InsertOrMergeRowAction, MergeRowAction)):
							write_actions.append(action)

		if not write_actions:
			return None, None, {}

		action = write_actions[0]
		ods_topic_id = action.topicId
		if is_blank(ods_topic_id):
			return None, None, {}

		ods_schema = self._topic_service().find_schema_by_id(ods_topic_id, tenant_id)
		if ods_schema is None:
			return None, None, {}

		ods_topic = ods_schema.get_topic()
		field_map = self._build_field_map(raw_topic, ods_topic, action.mapping or [])
		return ods_topic, ods_schema, field_map

	@staticmethod
	def _build_field_map(raw_topic: Topic, ods_topic: Topic, mapping_factors) -> Dict[str, str]:
		from watchmen_model.admin.pipeline_action_write import MappingFactor
		raw_factor_name = {f.factorId: f.name for f in (raw_topic.factors or [])}
		ods_factor_name = {f.factorId: f.name for f in (ods_topic.factors or [])}
		field_map: Dict[str, str] = {}
		for mf in (mapping_factors or []):
			if not isinstance(mf, MappingFactor):
				continue
			source = mf.source
			if source is None or getattr(source, 'kind', None) is None or str(source.kind) != 'topic':
				continue
			src_name = raw_factor_name.get(source.factorId)
			tgt_name = ods_factor_name.get(mf.factorId)
			if src_name and tgt_name:
				field_map[src_name] = tgt_name
		return field_map

	@staticmethod
	def _is_unique_index_group(index_group) -> bool:
		if index_group is None:
			return False
		if index_group == FactorIndexGroup.EMPTY or str(index_group) == '':
			return False
		return str(index_group).startswith(UNIQUE_INDEX_PREFIX)

	def _find_pk_columns(self, topic: Topic, schema: TopicSchema) -> List[str]:
		unique_factors = [f for f in (topic.factors or []) if self._is_unique_index_group(f.indexGroup)]
		if not unique_factors:
			return [PK_FALLBACK_COLUMN]
		entity_helper = ask_topic_data_entity_helper(schema)
		column_names: List[str] = []
		for factor in unique_factors:
			col_name = entity_helper.get_column_name(factor.name)
			if col_name:
				column_names.append(col_name)
		return column_names if column_names else [PK_FALLBACK_COLUMN]


def transform_canal_row(canal_row: Dict, field_map: Dict[str, str]) -> Dict:
	if not field_map:
		return dict(canal_row)
	return {field_map[k]: v for k, v in canal_row.items() if k in field_map}
