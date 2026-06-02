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
from watchmen_model.admin.pipeline_action_write import MappingFactor
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
			principal_service: PrincipalService,
			ods_storage: Optional[TopicDataStorageSPI] = None,
			ods_entity_helper: Optional[TopicDataEntityHelper] = None,
			ods_pk_columns: Optional[List[str]] = None,
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
		# ODS-side configuration: target of batch writes. None in the
		# partial (no-ODS) path.
		self.ods_storage = ods_storage
		self.ods_entity_helper = ods_entity_helper
		self.ods_pk_columns = ods_pk_columns

	@property
	def is_complete(self) -> bool:
		return self.ods_schema is not None and self.ods_topic is not None


class ConfigResolver:
	def __init__(self, principal_service: PrincipalService):
		self.principal_service = principal_service
		self._cache: Dict[str, Optional[ResolvedConfig]] = {}
		self._compiled_pipelines: Dict[str, 'RuntimeCompiledPipeline'] = {}

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
		# Also invalidate any compiled pipeline whose key starts with table_name
		keys_to_drop = [k for k in self._compiled_pipelines if k.startswith(f'{table_name}:')]
		for k in keys_to_drop:
			self._compiled_pipelines.pop(k, None)

	def get_compiled_pipeline(
			self, raw_topic: Topic, ods_topic_id: str
	) -> Optional['RuntimeCompiledPipeline']:
		"""
		Get a compiled pipeline for the given raw topic that targets the
		specified ODS topic. Returns the FIRST pipeline that matches
		(disabled pipelines are skipped). Caches per (raw_topic, ods_topic_id).

		Used by the BatchPipelineRunner when the
		`usePipelineRunner` feature flag is enabled. For most setups
		there is exactly one such pipeline per (raw, ods) pair; if there
		are multiple, the runner takes the first non-disabled one and
		logs a warning.
		"""
		from watchmen_pipeline_kernel.pipeline_schema import RuntimeCompiledPipeline
		cache_key = f'{raw_topic.topicId}:{ods_topic_id}'
		cached = self._compiled_pipelines.get(cache_key)
		if cached is not None:
			return cached
		pipelines = self._pipeline_service().find_by_topic_id(raw_topic.topicId)
		for pipeline in pipelines:
			if pipeline.enabled is False:
				continue
			for stage in (pipeline.stages or []):
				for unit in (stage.units or []):
					for action in (unit.do or []):
						# We only need to know that this pipeline targets ods_topic_id
						if getattr(action, 'topicId', None) == ods_topic_id:
							logger.info(
								f'Compiling pipeline {pipeline.pipelineId} for '
								f'raw_topic={raw_topic.name} ods_topic_id={ods_topic_id}')
							compiled = RuntimeCompiledPipeline(pipeline, self.principal_service)
							self._compiled_pipelines[cache_key] = compiled
							return compiled
		logger.warning(
			f'No enabled pipeline found for raw_topic={raw_topic.name} '
			f'ods_topic_id={ods_topic_id}')
		return None

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

		# Build ODS-side storage / entity helper / PK columns. These are the
		# the destination for batch writes when ODS topic is configured.
		ods_storage = ask_topic_storage(ods_schema, self.principal_service)
		ods_storage.register_topic(ods_topic, data_source)
		ods_entity_helper = ask_topic_data_entity_helper(ods_schema)
		ods_pk_columns = self._find_pk_columns(ods_topic, ods_schema)

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
			ods_storage=ods_storage,
			ods_entity_helper=ods_entity_helper,
			ods_pk_columns=ods_pk_columns,
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
		"""
		Resolve the target ODS topic and the merged field map.

		Walk every pipeline attached to the raw topic, and every stage/unit/action
		within each pipeline. A raw topic can fan out to multiple ODS topics;
		conversely, several pipelines (or several actions in one pipeline) can
		write to the same ODS topic with different MappingFactor subsets.

		Strategy:
		  1. Group write actions by `action.topicId` (the ODS target).
		  2. For each group, merge all MappingFactors from all actions into a
		     single list (a target ODS column may be supplied by more than one
		     action, and a raw column may be mapped in different actions).
		  3. Pick the target with the largest merged mapping as the batch-writer
		     destination. If there is a tie, pick the first one encountered so
		     behaviour stays deterministic across reloads.
		"""
		pipelines = self._pipeline_service().find_by_topic_id(raw_topic.topicId)
		mappings_by_target, _seen_order = self._collect_mappings_by_target(pipelines)
		if not mappings_by_target:
			return None, None, {}

		best_target_id = self._pick_best_target(mappings_by_target, _seen_order)
		ods_schema = self._topic_service().find_schema_by_id(best_target_id, tenant_id)
		if ods_schema is None:
			logger.warning(f'ODS TopicSchema not found for id={best_target_id}, tenant={tenant_id}')
			return None, None, {}

		ods_topic = ods_schema.get_topic()
		merged_mappings = mappings_by_target[best_target_id]
		if len(mappings_by_target) > 1:
			logger.info(
				f'Raw topic={raw_topic.name} fans out to {len(mappings_by_target)} ODS topics; '
				f'batch-writer selected {ods_topic.name} '
				f'(merged {len(merged_mappings)} MappingFactors)')
		field_map = self._build_field_map(raw_topic, ods_topic, merged_mappings)
		return ods_topic, ods_schema, field_map

	@staticmethod
	def _collect_mappings_by_target(pipelines) -> Tuple[Dict[str, List], Dict[str, int]]:
		"""
		Walk every pipeline -> stage -> unit -> write-action and group all
		MappingFactors by the ODS target topic id.

		Returns:
		  - {ods_topic_id: [MappingFactor, ...]}  (merged list per target)
		  - {ods_topic_id: first-seen-index}      (for deterministic tie-break)

		Skips:
		  - pipelines with `enabled = False`
		  - actions whose `topicId` is blank
		  - actions whose `mapping` is empty
		"""
		mappings_by_target: Dict[str, List] = {}
		seen_order: Dict[str, int] = {}
		order = 0
		for pipeline in pipelines:
			if pipeline.enabled is False:
				continue
			for stage in (pipeline.stages or []):
				for unit in (stage.units or []):
					for action in (unit.do or []):
						if not isinstance(action, (InsertRowAction, InsertOrMergeRowAction, MergeRowAction)):
							continue
						ods_topic_id = action.topicId
						if is_blank(ods_topic_id):
							continue
						if not action.mapping:
							continue
						bucket = mappings_by_target.setdefault(ods_topic_id, [])
						if ods_topic_id not in seen_order:
							seen_order[ods_topic_id] = order
							order += 1
						bucket.extend(action.mapping)
		return mappings_by_target, seen_order

	@staticmethod
	def _pick_best_target(mappings_by_target: Dict[str, List], seen_order: Dict[str, int]) -> str:
		"""
		Pick the target ODS topic with the largest merged mapping. On a tie,
		keep the first one seen.
		"""
		best_target_id, _ = max(
			mappings_by_target.items(),
			key=lambda kv: (len(kv[1]), -seen_order.get(kv[0], 0))
		)
		return best_target_id

	@staticmethod
	def _build_field_map(raw_topic: Topic, ods_topic: Topic, mapping_factors) -> Dict[str, str]:
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
