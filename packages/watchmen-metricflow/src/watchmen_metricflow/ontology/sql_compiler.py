"""SQL 编译器：将 VirtualOntology 查询请求编译为 SQLAlchemy Select。"""

from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import Column, DateTime, MetaData, Numeric, String, Table, and_, func, select
from sqlalchemy.sql import Select

from watchmen_model.admin import DerivedAttribute, PhysicalTableMapping, VirtualObject, VirtualObjectAttribute, VirtualOntology

from .schema import OntologyQueryRequest



class OntologySqlCompileError(Exception):
	"""SQL 编译失败。"""


class CompiledOntologyQuery:
	"""编译后的查询产物。"""

	def __init__(self, statement: Select, labels: List[str], virtual_object: VirtualObject):
		self.statement = statement
		self.labels = labels
		self.virtual_object = virtual_object


class OntologySqlCompiler:
	"""根据 VirtualOntology 元数据生成 SQLAlchemy 查询。"""

	def __init__(self) -> None:
		self.metadata = MetaData()

	def compile(self, ontology: VirtualOntology, request: OntologyQueryRequest) -> CompiledOntologyQuery:
		# 每次编译使用新的 MetaData，避免同一个服务实例重复编译时表定义冲突。
		self.metadata = MetaData()
		virtual_object = self._find_virtual_object(ontology, request.virtualObjectId)
		primary_mapping = self._find_primary_table(virtual_object)
		primary_alias = self._resolve_mapping_alias(primary_mapping)
		primary_table = self._build_table(primary_mapping.topicName, primary_mapping.alias, primary_mapping.fields)

		from_clause = primary_table
		tables_by_alias = self._build_table_lookup(primary_mapping, primary_table)
		primary_key = primary_table.c.get('id')
		if primary_key is None:
			raise OntologySqlCompileError(f'Primary table [{primary_mapping.topicName}] must expose field [id].')

		required_aliases = self._collect_required_aliases(virtual_object, request)
		for mapping in virtual_object.physicalTables or []:
			if mapping is primary_mapping or mapping.kind == 'primary':
				continue
			if not self._mapping_required(mapping, required_aliases):
				continue
			table = self._build_table(mapping.topicName, mapping.alias, mapping.fields)
			from_clause = self._join_table(from_clause, primary_table, table, mapping)
			tables_by_alias.update(self._build_table_lookup(mapping, table))

		select_columns, labels, attribute_group_keys = self._compile_attributes(
			virtual_object, request.fields, tables_by_alias)
		derived_columns, derived_labels, derived_joins = self._compile_derived_attributes(
			virtual_object, request.includeDerived, ontology, primary_table)
		select_columns.extend(derived_columns)
		labels.extend(derived_labels)

		if not select_columns:
			select_columns = [primary_key.label('id')]
			labels = ['id']

		# derived 关联的物理表挂到主查询上，使用 LEFT JOIN + GROUP BY 的等价语义。
		# 只有存在 derived 聚合时才 GROUP BY，避免普通查询被错误去重。
		statement = select(*select_columns).select_from(from_clause)
		if derived_joins:
			all_group_keys: List[Any] = []
			for derived_table, on_clause, group_keys in derived_joins:
				from_clause = from_clause.outerjoin(derived_table, on_clause)
				for key in group_keys:
					if key not in all_group_keys:
						all_group_keys.append(key)
			# SELECT 中所有业务属性列都要进入 GROUP BY，满足 MySQL only_full_group_by。
			for col in attribute_group_keys:
				if col not in all_group_keys:
					all_group_keys.append(col)
			statement = statement.select_from(from_clause).group_by(*all_group_keys)
		where = self._compile_filters(virtual_object, request.filters, tables_by_alias)
		if where is not None:
			statement = statement.where(where)
		statement = statement.limit(request.limit).offset(request.offset)
		return CompiledOntologyQuery(statement=statement, labels=labels, virtual_object=virtual_object)

	def _collect_required_aliases(self, virtual_object: VirtualObject, request: OntologyQueryRequest) -> set:
		attributes = {attr.name: attr for attr in virtual_object.attributes or []}
		# fields 为空时按"返回全部 attribute"处理，需要 join 全部被引用的表。
		if request.fields:
			required_attrs = [attributes[field] for field in request.fields if field in attributes]
		else:
			required_attrs = list(attributes.values())
		for field in (request.filters or {}).keys():
			attr = attributes.get(field)
			if attr is not None:
				required_attrs.append(attr)
		return {attr.sourceTable for attr in required_attrs if attr.sourceTable}

	def _mapping_required(self, mapping: PhysicalTableMapping, required_aliases: set) -> bool:
		"""物理表是否需要 join：按 alias / topicName / topic_ 前缀三种写法都判断一次。"""
		keys = {mapping.alias, mapping.topicName, self._physical_table_name(mapping.topicName)}
		return any(k in required_aliases for k in keys if k)

	def _resolve_mapping_alias(self, mapping: PhysicalTableMapping) -> str:
		return mapping.alias or self._physical_table_name(mapping.topicName)

	def _build_table_lookup(self, mapping: PhysicalTableMapping, table: Table) -> Dict[str, Table]:
		physical_name = self._physical_table_name(mapping.topicName)
		lookup = {physical_name: table}
		if mapping.alias:
			lookup[mapping.alias] = table
		if mapping.topicName:
			lookup[mapping.topicName] = table
		return lookup

	@staticmethod
	def _physical_table_name(topic_name: str) -> str:
		if not topic_name:
			raise OntologySqlCompileError('Physical table topicName is required.')
		return topic_name if topic_name.startswith('topic_') else f'topic_{topic_name}'

	def _join_table(self, from_clause, primary_table: Table, table: Table, mapping: PhysicalTableMapping):
		if not mapping.joinConditions:
			raise OntologySqlCompileError(
				f'Join conditions are required for table [{mapping.topicName}] alias [{self._resolve_mapping_alias(mapping)}].'
			)
		criteria = []
		for condition in mapping.joinConditions:
			source = primary_table.c.get(condition.sourceField)
			if source is None:
				available_fields = ', '.join(sorted(primary_table.c.keys())) or '<none>'
				raise OntologySqlCompileError(
					f'Join source field [{condition.sourceField}] not found on primary table. '
					f'Available fields: [{available_fields}].'
				)
			target = table.c.get(condition.targetField)
			if target is None:
				available_fields = ', '.join(sorted(table.c.keys())) or '<none>'
				raise OntologySqlCompileError(
					f'Join target field [{condition.targetField}] not found on table [{mapping.topicName}]. '
					f'Available fields: [{available_fields}].'
				)
			criteria.append(source == target)
		join_type = self._resolve_join_type(mapping)
		if join_type == 'inner':
			return from_clause.join(table, and_(*criteria))
		if join_type == 'right':
			return table.outerjoin(from_clause, and_(*criteria))
		if join_type == 'full':
			return from_clause.full_outerjoin(table, and_(*criteria))
		return from_clause.outerjoin(table, and_(*criteria))

	@staticmethod
	def _resolve_join_type(mapping: PhysicalTableMapping) -> str:
		join_type = (mapping.joinType or '').lower()
		if join_type in ('inner', 'left', 'right', 'full'):
			return join_type
		# 没显式指定 joinType 时，按 kind 推导默认 join 类型。
		kind = (mapping.kind or '').lower()
		if kind == 'lookup':
			return 'inner'
		return 'left'

	def _find_virtual_object(self, ontology: VirtualOntology, object_id: str) -> VirtualObject:
		for obj in ontology.virtualObjects or []:
			if obj.id == object_id:
				return obj
		raise OntologySqlCompileError(f'Virtual object [{object_id}] not found.')

	def _find_primary_table(self, virtual_object: VirtualObject):
		for mapping in virtual_object.physicalTables or []:
			if mapping.kind == 'primary':
				return mapping
		raise OntologySqlCompileError(f'Virtual object [{virtual_object.name}] has no primary table.')

	def _build_table(self, table_name: str, alias: Optional[str], fields: Optional[List[str]]) -> Table:
		columns = fields or ['id']
		if 'id' not in columns:
			columns = ['id', *columns]
		physical_name = self._physical_table_name(table_name)
		# autoload 不适合这里，因为编译阶段不持有 engine；按元数据构造轻量 Table。
		# 列类型靠启发式推导：数字 / 时间字段要选正确 SQLAlchemy 类型，否则 filter / 聚合 SQL 报错。
		table = Table(physical_name, self.metadata, *[self._build_column(name) for name in columns])
		return table.alias(alias) if alias else table

	_NUMERIC_SUFFIXES = (
		'_amount', '_num', '_count', '_id', '_price', '_qty', '_value',
		'_score', '_rate', '_fee', '_premium', '_age',
	)
	_DATETIME_SUFFIXES = ('_at', '_date', '_time', '_ts')

	@classmethod
	def _build_column(cls, name: str):
		lower = name.lower()
		if lower == 'id' or lower.endswith(cls._NUMERIC_SUFFIXES):
			return Column(name, Numeric)
		if lower.endswith(cls._DATETIME_SUFFIXES):
			return Column(name, DateTime)
		return Column(name, String)

	def _compile_attributes(
			self, virtual_object: VirtualObject, requested_fields: List[str], tables_by_alias: Dict[str, Table]
	) -> Tuple[List[Any], List[str], List[Any]]:
		# 没指定 fields 时返回全部 attribute，与 _collect_required_aliases 的行为对齐。
		all_attrs = virtual_object.attributes or []
		if requested_fields:
			requested_set = set(requested_fields)
			all_attrs = [attr for attr in all_attrs if attr.name in requested_set]
		columns = []
		labels = []
		group_keys = []
		for attr in all_attrs:
			column = self._resolve_attribute_column(attr, tables_by_alias)
			columns.append(column.label(attr.name))
			labels.append(attr.name)
			if column not in group_keys:
				group_keys.append(column)
		return columns, labels, group_keys

	def _compile_filters(
			self, virtual_object: VirtualObject, filters: Dict[str, Any], tables_by_alias: Dict[str, Table]
	):
		criteria = []
		attributes = {attr.name: attr for attr in virtual_object.attributes or []}
		for field, value in (filters or {}).items():
			attr = attributes.get(field)
			if attr is None:
				raise OntologySqlCompileError(f'Filter field [{field}] is not defined in virtual object [{virtual_object.name}].')
			criteria.append(self._resolve_attribute_column(attr, tables_by_alias) == value)
		return and_(*criteria) if criteria else None

	def _compile_derived_attributes(
			self, virtual_object: VirtualObject, requested: List[str], ontology: VirtualOntology, primary_table: Table
	) -> Tuple[List[Any], List[str], List[Tuple[Table, Any, Tuple]]]:
		"""返回 (聚合列, label, [(target_table, on_clause, group_keys)...])。

		每个 derived 都把目标物理表 LEFT JOIN 到主表，主表非聚合列加入 GROUP BY。
		"""
		requested_names = set(requested or [])
		columns = []
		labels = []
		derived_joins: List[Tuple[Table, Any, Tuple]] = []
		for derived in virtual_object.derivedAttributes or []:
			if requested_names and derived.name not in requested_names:
				continue
			aggregate_col, target_table, on_clause, group_keys = self._compile_aggregate_derived(
				derived, ontology, primary_table)
			columns.append(aggregate_col.label(derived.name))
			labels.append(derived.name)
			derived_joins.append((target_table, on_clause, group_keys))
		return columns, labels, derived_joins

	def _compile_aggregate_derived(
			self, derived: DerivedAttribute, ontology: VirtualOntology, primary_table: Table
	) -> Tuple[Any, Table, Any, Tuple]:
		"""返回 (聚合列, target_table, on_clause, group_keys)。"""
		aggregate = (derived.aggregate or 'count').lower()
		if not derived.path:
			raise OntologySqlCompileError(f'Derived attribute [{derived.name}] path is required.')
		link = self._find_virtual_link(ontology, derived.path, derived.name)
		target = next((obj for obj in ontology.virtualObjects or [] if obj.id == link.targetObjectId), None)
		if target is None:
			raise OntologySqlCompileError(f'Target object [{link.targetObjectId}] not found for link [{link.name}].')
		target_primary = self._find_primary_table(target)
		# 别名 = link.name + derived.name，保证多条 derived 不会冲突。
		target_alias = self._safe_alias(f'{link.name or link.id}_{derived.name}')
		target_table = self._build_table(target_primary.topicName, target_alias, target_primary.fields)
		if not link.joinConditions:
			raise OntologySqlCompileError(
				f'Virtual link [{link.name}] joinConditions is required for derived [{derived.name}].')
		criteria = []
		for condition in link.joinConditions:
			source_col = primary_table.c.get(condition.sourceField)
			if source_col is None:
				available_fields = ', '.join(sorted(primary_table.c.keys())) or '<none>'
				raise OntologySqlCompileError(
					f'Source field [{condition.sourceField}] not found for derived [{derived.name}]. '
					f'Available fields: [{available_fields}].')
			target_col = target_table.c.get(condition.targetField)
			if target_col is None:
				available_fields = ', '.join(sorted(target_table.c.keys())) or '<none>'
				raise OntologySqlCompileError(
					f'Target field [{condition.targetField}] not found on [{target_primary.topicName}] '
					f'for derived [{derived.name}]. Available fields: [{available_fields}].')
			criteria.append(source_col == target_col)
		on_clause = and_(*criteria)
		# GROUP BY 取主表 join 键列（sourceField）。
		group_key_names = sorted(set(c.left.name for c in criteria), key=lambda n: n)
		group_keys = tuple(primary_table.c[name] for name in group_key_names)
		if aggregate == 'count':
			ref_col = next(iter(c.right for c in criteria), target_table.c.get('id'))
			agg_col = func.count(ref_col)
		elif aggregate in ('sum', 'avg', 'min', 'max'):
			target_field = derived.targetField
			if not target_field:
				raise OntologySqlCompileError(
					f'targetField is required for aggregate [{aggregate}] on derived [{derived.name}].')
			target_col = target_table.c.get(target_field)
			if target_col is None:
				available_fields = ', '.join(sorted(target_table.c.keys())) or '<none>'
				raise OntologySqlCompileError(
					f'Aggregate target field [{target_field}] not found on [{target_primary.topicName}] '
					f'for derived [{derived.name}]. Available fields: [{available_fields}].')
			sql_func = getattr(func, aggregate)
			agg_col = func.coalesce(sql_func(target_col), 0)
		else:
			raise OntologySqlCompileError(f'Derived aggregate [{derived.aggregate}] is not supported yet.')
		return agg_col, target_table, on_clause, group_keys

	@staticmethod
	def _safe_alias(name: str) -> str:
		# 替换 SQL 别名里非法的字符，避免 SQLAlchemy / 不同方言报错。
		import re
		return re.sub(r'[^a-zA-Z0-9_]', '_', name)

	def _find_virtual_link(self, ontology: VirtualOntology, path: List[str], derived_name: str):
		for link_key in path:
			link = next((item for item in ontology.virtualLinks or [] if item.id == link_key or item.name == link_key), None)
			if link is not None:
				return link
		path_text = ' -> '.join(path) or '<empty>'
		raise OntologySqlCompileError(f'Virtual link in path [{path_text}] not found for derived [{derived_name}].')

	def _resolve_attribute_column(self, attr: VirtualObjectAttribute, tables_by_alias: Dict[str, Table]):
		table = tables_by_alias.get(attr.sourceTable)
		if table is None:
			available = ', '.join(k if k else '(empty)' for k in sorted(tables_by_alias.keys())) or '<none>'
			raise OntologySqlCompileError(
				f'Source table alias [{attr.sourceTable}] not found for attribute [{attr.name}]. '
				f'Available aliases: [{available}].'
			)
		column = table.c.get(attr.sourceField)
		if column is None:
			available_fields = ', '.join(sorted(table.c.keys())) or '<none>'
			raise OntologySqlCompileError(
				f'Source field [{attr.sourceField}] not found for attribute [{attr.name}] '
				f'on alias [{attr.sourceTable}]. Available fields: [{available_fields}].'
			)
		return column

