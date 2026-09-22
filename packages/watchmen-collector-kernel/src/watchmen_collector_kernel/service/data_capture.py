from logging import getLogger
from typing import Optional, Dict, Any, Tuple, List

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.model import CollectorTableConfig, Condition
from .criteria_builder import CriteriaBuilder
from .table_config_service import get_table_config_service
from .extract_source import ask_source_extractor
from watchmen_collector_kernel.storage import get_collector_table_config_service
from watchmen_storage import TransactionalStorageSPI, SnowflakeGenerator, EntityCriteria, \
	EntityCriteriaExpression, ColumnNameLiteral, EntityCriteriaOperator
from watchmen_utilities import ArrayHelper
from .extract_utils import build_criteria_by_join_key

logger = getLogger(__name__)

# max keys per IN query issued by the batched child fetch; keeps parameter lists sane
BATCH_BUILD_IN_CHUNK_SIZE = 500


def chunks_of(values: List[Any], size: int) -> List[List[Any]]:
	return [values[i:i + size] for i in range(0, len(values), size)]


def row_value(row: Dict[str, Any], key: str) -> Any:
	"""Read a row value tolerating lowercased keys from the source extractor."""
	value = row.get(key)
	if value is None and key != key.lower():
		value = row.get(key.lower())
	return value


class DataCaptureService:

	def __init__(self, storage: TransactionalStorageSPI,
	             snowflake_generator: SnowflakeGenerator,
	             principal_service: PrincipalService):
		self.meta_storage = storage
		self.snowflake_generator = snowflake_generator
		self.principal_service = principal_service
		self.collector_table_config_service = get_collector_table_config_service(self.meta_storage,
		                                                                         self.snowflake_generator,
		                                                                         self.principal_service)
		self.table_config_service = get_table_config_service(self.principal_service)

	# noinspection PyMethodMayBeStatic
	def find_data_by_data_id(self, config: CollectorTableConfig, data_id: Dict) -> Optional[Dict[str, Any]]:
		return ask_source_extractor(config).find_one_by_primary_keys(data_id)

	def find_parent_node(self, config: CollectorTableConfig,
	                     data_: Dict) -> Tuple[CollectorTableConfig, Optional[Dict[str, Any]]]:
		if config.parentName:
			parent_config = self.table_config_service.find_by_name(config.parentName, config.tenantId)
			parent_data = ask_source_extractor(parent_config).find_records_by_criteria(
				ArrayHelper(config.joinKeys).map(lambda join_key: build_criteria_by_join_key(join_key.parentKey, data_)).to_list()
			)
			if len(parent_data) != 1:
				raise RuntimeError(f'The data : {data_}, config_name: {config.name}, '
				                   f'parent_config_name: {parent_config.name}, size: {len(parent_data)}')
			return self.find_parent_node(parent_config, parent_data[0])
		else:
			return config, data_

	def build_json(self,
	               config: CollectorTableConfig,
	               data: Dict):
		child_configs = self.table_config_service.find_by_parent_name(config.name, config.tenantId)
		if child_configs:
			ArrayHelper(child_configs).map(lambda child_config: self.get_child_data(child_config, data))

	def get_child_data(self, child_config: CollectorTableConfig, data_: Dict):
		child_data = ask_source_extractor(child_config).find_records_by_criteria(
			ArrayHelper(child_config.joinKeys).map(lambda join_key: build_criteria_by_join_key(join_key.childKey, data_)).to_list()
		)
		if child_data:
			if child_config.isList:
				data_[child_config.label] = child_data
			else:
				data_[child_config.label] = child_data[0]
			ArrayHelper(child_data).each(lambda child: self.build_json(child_config, child))

	def build_jsons(self, config: CollectorTableConfig, data_list: List[Dict[str, Any]]) -> None:
		"""Batched equivalent of build_json for a list of rows of the same table.

		Children are fetched level by level with one IN query per child table per
		level (O(levels x child-tables) source queries instead of O(rows)), then
		mounted with exactly the same semantics as get_child_data: rows without
		matching children simply do not get the label key, isList mounts the whole
		list, otherwise the first row. Grandchildren are handled by recursing on
		the fetched child rows. Shapes unsuitable for batching (multi-join keys,
		non-template join values) fall back to the row-by-row path.
		"""
		child_configs = self.table_config_service.find_by_parent_name(config.name, config.tenantId)
		if not child_configs:
			return
		for child_config in child_configs:
			self.mount_child_batch(child_config, data_list)

	def mount_child_batch(self, child_config: CollectorTableConfig, data_list: List[Dict[str, Any]]) -> None:
		join_keys = child_config.joinKeys or []
		if len(join_keys) != 1 or join_keys[0].childKey is None:
			# multi-join or missing join definition: keep the proven row-by-row path
			ArrayHelper(data_list).each(lambda data: self.get_child_data(child_config, data))
			return
		child_key = join_keys[0].childKey
		column_value = child_key.columnValue
		variable_name = None
		if isinstance(column_value, str) and column_value.startswith('{') and column_value.endswith('}'):
			variable_name = column_value[1:-1]

		if variable_name is not None:
			# one distinct key value per parent row (order preserved)
			key_values: List[Any] = []
			seen = set()
			for row in data_list:
				value = row_value(row, variable_name)
				if value is not None and value not in seen:
					seen.add(value)
					key_values.append(value)
		else:
			# constant (or null) join value: identical criteria for every row
			key_values = [column_value] if column_value is not None else []

		child_rows: List[Dict[str, Any]] = []
		for chunk in chunks_of(key_values, BATCH_BUILD_IN_CHUNK_SIZE):
			criteria = [EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName=child_key.columnName),
				operator=EntityCriteriaOperator.IN,
				right=chunk
			)]
			child_rows.extend(ask_source_extractor(child_config).find_records_by_criteria(criteria))

		if not child_rows:
			return
		grouped: Dict[Any, List[Dict[str, Any]]] = {}
		missing_join_keys = 0
		for child_row in child_rows:
			child_value = row_value(child_row, child_key.columnName)
			if child_value is None:
				missing_join_keys += 1
				continue
			grouped.setdefault(child_value, []).append(child_row)
		if missing_join_keys:
			logger.warning(
				'mount_child_batch skipped %s child rows without join column %s (table %s)',
				missing_join_keys, child_key.columnName, child_config.tableName)
		for parent_row in data_list:
			key = row_value(parent_row, variable_name) if variable_name is not None else column_value
			if key is None:
				continue
			children = grouped.get(key)
			if children:
				parent_row[child_config.label] = children if child_config.isList else children[0]
		# recurse for grandchildren with the same batching
		self.build_jsons(child_config, child_rows)

	def build_json_template(self, config: CollectorTableConfig, data_: Dict = None) -> Dict:
		variables = {}
		def prepare_query_criteria(variables_: Dict, conditions: List[Condition]) -> EntityCriteria:
			return CriteriaBuilder(variables_).build_criteria(conditions)
		if config.conditions:
			record = ask_source_extractor(config).find_records_by_criteria(prepare_query_criteria(variables, config.conditions))
		else:
			record = ask_source_extractor(config).find_one_record_of_table()
		if data_:
			if config.isList:
				data_[config.label] = record
			else:
				data_[config.label] = record[0]
		else:
			data_ = record[0]
		child_configs = self.table_config_service.find_by_parent_name(config.name, config.tenantId)
		ArrayHelper(child_configs).map(lambda child_config: self.build_json_template(child_config, record[0]))
		return data_
