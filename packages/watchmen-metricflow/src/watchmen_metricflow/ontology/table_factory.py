"""物理表构建器：负责按 topicName + fields 构造 SQLAlchemy Table。

包含列类型启发式推导、metadata 复用、alias/topicName 索引构造。
"""

from typing import Dict, List, Optional

from sqlalchemy import Column, DateTime, MetaData, Numeric, String, Table

from watchmen_model.admin import PhysicalTableMapping

from .errors import OntologySqlCompileError


_NUMERIC_SUFFIXES = (
	'_amount', '_num', '_count', '_id', '_price', '_qty', '_value',
	'_score', '_rate', '_fee', '_premium', '_age',
)
_DATETIME_SUFFIXES = ('_at', '_date', '_time', '_ts')


class OntologyTableFactory:
	"""构造并缓存虚拟本体里物理表对应的 SQLAlchemy Table 对象。

	同一个 ``MetaData`` 实例上重复声明同名 Table 会抛 ``InvalidRequestError``，
	因此 ``build_table`` 在表已存在时复用现有 Table 再 ``alias`` 出去。
	"""

	def __init__(self, metadata: MetaData) -> None:
		self.metadata = metadata

	@staticmethod
	def physical_table_name(topic_name: str) -> str:
		"""``dm_policy_contract`` → ``topic_dm_policy_contract``。"""
		if not topic_name:
			raise OntologySqlCompileError('Physical table topicName is required.')
		return topic_name if topic_name.startswith('topic_') else f'topic_{topic_name}'

	@staticmethod
	def resolve_mapping_alias(mapping: PhysicalTableMapping) -> str:
		"""优先用显式 alias；否则用 physical_table_name。"""
		return mapping.alias or OntologyTableFactory.physical_table_name(mapping.topicName)

	def build_table(self, table_name: str, alias: Optional[str], fields: Optional[List[str]]) -> Table:
		# 只在 fields 为空时用 ['id'] 兜底；不要往真实存在的字段列表里塞 id，
		# 否则 SQL 会引用一个数据库里不存在的列（旧 bug）。
		columns = list(fields) if fields else ['id']
		physical_name = self.physical_table_name(table_name)
		# 同一张表可能在主查询和 derived join 中都被引用；metadata 中已存在则复用。
		existing = self.metadata.tables.get(physical_name)
		if existing is not None:
			return existing.alias(alias) if alias else existing
		table = Table(physical_name, self.metadata, *[self._build_column(name) for name in columns])
		return table.alias(alias) if alias else table

	def build_table_lookup(self, mapping: PhysicalTableMapping, table: Table) -> Dict[str, Table]:
		"""构造 alias / topicName / physical_name 三个 key 都指向同一张表的查找字典。"""
		physical_name = self.physical_table_name(mapping.topicName)
		lookup = {physical_name: table}
		if mapping.alias:
			lookup[mapping.alias] = table
		if mapping.topicName:
			lookup[mapping.topicName] = table
		return lookup

	def find_table_for_mapping(
			self, mapping: PhysicalTableMapping, tables_by_alias: Dict[str, Table]
	) -> Optional[Table]:
		physical_name = self.physical_table_name(mapping.topicName or '')
		for key in (mapping.alias, mapping.topicName, physical_name):
			if key and key in tables_by_alias:
				return tables_by_alias[key]
		return None

	@classmethod
	def _build_column(cls, name: str):
		lower = name.lower()
		if lower == 'id' or lower.endswith(_NUMERIC_SUFFIXES):
			return Column(name, Numeric)
		if lower.endswith(_DATETIME_SUFFIXES):
			return Column(name, DateTime)
		return Column(name, String)
