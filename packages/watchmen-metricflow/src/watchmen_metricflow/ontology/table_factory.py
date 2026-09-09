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

	# topicName 以此前缀开头时按显式物理表名处理（如 DB_DIRECT 语义模型的
	# relation_name），不再套用 topic_ 前缀约定。
	EXPLICIT_TABLE_PREFIX = 'raw:'

	@staticmethod
	def physical_table_name(topic_name: str) -> str:
		"""``dm_policy_contract`` → ``topic_dm_policy_contract``。

		``schema.table`` / ``raw:schema.table`` 中的 schema 保留原样，
		topic_ 前缀约定只作用于表名部分。
		"""
		if not topic_name:
			raise OntologySqlCompileError('Physical table topicName is required.')
		explicit = topic_name.startswith(OntologyTableFactory.EXPLICIT_TABLE_PREFIX)
		name = topic_name[len(OntologyTableFactory.EXPLICIT_TABLE_PREFIX):] if explicit else topic_name
		schema = None
		if '.' in name:
			schema, _, name = name.rpartition('.')
		elif explicit:
			# keep name untouched below
			pass
		if not explicit and not name.startswith('topic_'):
			name = f'topic_{name}'
		return f'{schema}.{name}' if schema else name

	@staticmethod
	def split_physical_name(physical_name: str) -> tuple:
		"""``schema.table`` → ``(schema, table)``；无 schema 时 schema 为 ``None``。"""
		schema, _, table = physical_name.rpartition('.')
		return (schema or None), table

	@staticmethod
	def resolve_mapping_alias(mapping: PhysicalTableMapping) -> str:
		"""优先用显式 alias；否则用 physical_table_name。"""
		return mapping.alias or OntologyTableFactory.physical_table_name(mapping.topicName)

	def build_table(self, table_name: str, alias: Optional[str], fields: Optional[List[str]]) -> Table:
		# 只在 fields 为空时用 ['id'] 兜底；不要往真实存在的字段列表里塞 id，
		# 否则 SQL 会引用一个数据库里不存在的列（旧 bug）。
		columns = list(fields) if fields else ['id']
		physical_name = self.physical_table_name(table_name)
		schema, bare_name = self.split_physical_name(physical_name)
		# 同一张表可能在主查询和 derived join 中都被引用；metadata 中已存在则复用。
		existing = self.metadata.tables.get(physical_name)
		if existing is not None:
			return existing.alias(alias) if alias else existing
		table = Table(
			bare_name, self.metadata, schema=schema,
			*[self._build_column(name) for name in columns])
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
	def guess_column_kind(cls, name: str) -> str:
		"""Column kind guessed by name suffix: 'numeric' / 'datetime' / 'string'.

		Used both to declare SQLAlchemy column types and to coerce filter values
		into a type the column accepts (strict dialects such as postgresql reject
		``varchar = integer`` comparisons).
		"""
		lower = (name or '').lower()
		if lower == 'id' or lower.endswith(_NUMERIC_SUFFIXES):
			return 'numeric'
		if lower.endswith(_DATETIME_SUFFIXES):
			return 'datetime'
		return 'string'

	@classmethod
	def _build_column(cls, name: str):
		kind = cls.guess_column_kind(name)
		if kind == 'numeric':
			return Column(name, Numeric)
		if kind == 'datetime':
			return Column(name, DateTime)
		return Column(name, String)
