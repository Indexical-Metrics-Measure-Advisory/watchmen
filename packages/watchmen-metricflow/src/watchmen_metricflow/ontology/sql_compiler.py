"""SQL 编译器入口：根据 VirtualOntology 查询请求生成 SQLAlchemy Select。

组装流水线：
1. TableFactory 构建/缓存 SQLAlchemy Table
2. 主表 + 必需附属表 join
3. attribute / filter / derived 各自编译
4. PathResolver 解析 derived.path
5. 拼装 Select，应用 WHERE / LIMIT / OFFSET

详细实现分散到：
- ``OntologyTableFactory``：表对象构造、复用、列类型推导
- ``PathResolver``：derived.path → [(link, target_vo), ...]
- ``FilterCompiler``：所有 FilterCondition → SQLAlchemy 表达式
- ``_JoinBuilder``：把 physicalTable 列表和 derived.join 列表挂到 from_clause 上
"""

from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import MetaData, Table, and_, asc, desc, func, select
from sqlalchemy.sql import Select

from watchmen_model.admin import (
	DerivedAttribute, PhysicalTableMapping, VirtualObject, VirtualObjectAttribute, VirtualOntology,
)

from .errors import OntologySqlCompileError
from .filter_compiler import FilterCompiler
from .path_resolver import PathResolver, safe_alias
from .schema import OntologyQueryRequest
from .table_factory import OntologyTableFactory


__all__ = ['OntologySqlCompiler', 'OntologySqlCompileError', 'CompiledOntologyQuery']


class CompiledOntologyQuery:
	"""编译后的查询产物。"""

	def __init__(self, statement: Select, labels: List[str], virtual_object: VirtualObject):
		self.statement = statement
		self.labels = labels
		self.virtual_object = virtual_object


class OntologySqlCompiler:
	"""将 VirtualOntology 查询请求编译为 SQLAlchemy Select。

	持有本实例的 ``MetaData``（每次 ``compile`` 会重置以避免表定义冲突），
	并把职责分派给 ``OntologyTableFactory`` / ``PathResolver`` / ``FilterCompiler``。
	"""

	def __init__(self) -> None:
		self.metadata = MetaData()
		self._table_factory = OntologyTableFactory(self.metadata)
		self._path_resolver = PathResolver()
		self._filter_compiler = FilterCompiler(self._table_factory.find_table_for_mapping)

	def compile(self, ontology: VirtualOntology, request: OntologyQueryRequest) -> CompiledOntologyQuery:
		# 每次编译使用新的 MetaData，避免同一个服务实例重复编译时表定义冲突。
		self.metadata = MetaData()
		self._table_factory = OntologyTableFactory(self.metadata)
		self._filter_compiler = FilterCompiler(self._table_factory.find_table_for_mapping)

		virtual_object = self._find_virtual_object(ontology, request.virtualObjectId)
		primary_mapping = self._find_primary_table(virtual_object)
		primary_table = self._table_factory.build_table(
			primary_mapping.topicName, primary_mapping.alias, primary_mapping.fields)

		join_builder = _JoinBuilder(self._table_factory)
		from_clause = primary_table
		tables_by_alias = self._table_factory.build_table_lookup(primary_mapping, primary_table)

		# 1) 必需附属表（被 attribute / filter 引用的非 primary 物理表）
		required_aliases = self._collect_required_aliases(virtual_object, request)
		for mapping in virtual_object.physicalTables or []:
			if mapping is primary_mapping or mapping.kind == 'primary':
				continue
			if not self._mapping_required(mapping, required_aliases):
				continue
			table = self._table_factory.build_table(mapping.topicName, mapping.alias, mapping.fields)
			from_clause = join_builder.join_physical_table(from_clause, primary_table, table, mapping)
			tables_by_alias.update(self._table_factory.build_table_lookup(mapping, table))

		# 2) attribute / filter / derived 各自编译
		attribute_columns, attribute_labels, attribute_group_keys = self._compile_attributes(
			virtual_object, request.fields, tables_by_alias)

		derived_compiler = _DerivedAttributeCompiler(
			ontology=ontology,
			primary_vo=virtual_object,
			primary_table=primary_table,
			tables_by_alias=tables_by_alias,
			table_factory=self._table_factory,
			path_resolver=self._path_resolver,
			filter_compiler=self._filter_compiler,
		)
		derived_columns, derived_labels, derived_join_list = derived_compiler.compile(
			virtual_object, request.includeDerived)

		select_columns = [*attribute_columns, *derived_columns]
		labels = [*attribute_labels, *derived_labels]
		if not select_columns:
			# 没有 attribute / derived 时退化：优先用 primary 表第一列；都没有用 count(*)
			first_col = next(iter(primary_table.c), None)
			if first_col is not None:
				select_columns = [first_col]
				labels = [first_col.name]
			else:
				select_columns = [func.count()]
				labels = ['cnt']

		# 3) 把 derived 的 join 链挂到 from_clause 上
		statement = select(*select_columns).select_from(from_clause)
		all_group_keys: List[Any] = []
		if derived_join_list:
			for join_table, on_clause, group_keys in derived_join_list:
				from_clause = from_clause.outerjoin(join_table, on_clause)
				for key in group_keys:
					if key not in all_group_keys:
						all_group_keys.append(key)
			# SELECT 中所有业务属性列都要进入 GROUP BY，满足 MySQL only_full_group_by。
			for col in attribute_group_keys:
				if col not in all_group_keys:
					all_group_keys.append(col)
			statement = statement.select_from(from_clause).group_by(*all_group_keys)

		# 4) WHERE
		where = self._filter_compiler.compile_request_filters(
			virtual_object, request.filters,
			resolve_attribute_column=lambda attr: self._resolve_attribute_column(attr, tables_by_alias),
		)
		table_filter_clauses = self._filter_compiler.compile_table_filters(virtual_object, tables_by_alias)
		all_where_clauses: List[Any] = []
		all_where_clauses.extend(table_filter_clauses)
		if where is not None:
			all_where_clauses.append(where)
		if all_where_clauses:
			statement = statement.where(and_(*all_where_clauses))

		# 5) ORDER BY
		statement = self._apply_order_by(virtual_object, request, tables_by_alias, statement)

		statement = statement.limit(request.limit).offset(request.offset)
		return CompiledOntologyQuery(statement=statement, labels=labels, virtual_object=virtual_object)

	# ---- 辅助 ---------------------------------------------------------------

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
		for entry in (getattr(request, 'orderBy', None) or []):
			attr = attributes.get(entry.field)
			if attr is not None:
				required_attrs.append(attr)
		return {attr.sourceTable for attr in required_attrs if attr.sourceTable}

	def _mapping_required(self, mapping: PhysicalTableMapping, required_aliases: set) -> bool:
		"""物理表是否需要 join：按 alias / topicName / topic_ 前缀三种写法都判断一次。"""
		keys = {
			mapping.alias,
			mapping.topicName,
			OntologyTableFactory.physical_table_name(mapping.topicName),
		}
		return any(k in required_aliases for k in keys if k)

	def _apply_order_by(
			self, virtual_object: VirtualObject, request: OntologyQueryRequest,
			tables_by_alias: Dict[str, Table], statement: Select
	) -> Select:
		order_by = getattr(request, 'orderBy', None) or []
		if not order_by:
			return statement
		attributes = {attr.name: attr for attr in virtual_object.attributes or []}
		# 仅 includeDerived 中实际被请求的衍生属性可排序
		derived_names = {
			derived.name for derived in virtual_object.derivedAttributes or []
			if derived.name in (request.includeDerived or [])
		}
		for entry in order_by:
			field = entry.field
			is_desc = (entry.direction or 'asc').lower() == 'desc'
			if field in attributes:
				column = self._resolve_attribute_column(attributes[field], tables_by_alias)
				statement = statement.order_by(column.desc() if is_desc else column.asc())
			elif field in derived_names:
				# 衍生列按 label 引用（SQLAlchemy 在同一 select 内按 label 文本解析）
				statement = statement.order_by(desc(field) if is_desc else asc(field))
			else:
				raise OntologySqlCompileError(
					f'Order by field [{field}] is not an attribute of virtual object [{virtual_object.name}] '
					f'and not a requested derived attribute.')
		return statement

	def _find_virtual_object(self, ontology: VirtualOntology, object_id: str) -> VirtualObject:
		for obj in ontology.virtualObjects or []:
			if obj.id == object_id:
				return obj
		raise OntologySqlCompileError(f'Virtual object [{object_id}] not found.')

	def _find_primary_table(self, virtual_object: VirtualObject) -> PhysicalTableMapping:
		for mapping in virtual_object.physicalTables or []:
			if mapping.kind == 'primary':
				return mapping
		raise OntologySqlCompileError(f'Virtual object [{virtual_object.name}] has no primary table.')

	def _compile_attributes(
			self, virtual_object: VirtualObject, requested_fields: List[str], tables_by_alias: Dict[str, Table]
	) -> Tuple[List[Any], List[str], List[Any]]:
		all_attrs = virtual_object.attributes or []
		if requested_fields:
			requested_set = set(requested_fields)
			all_attrs = [attr for attr in all_attrs if attr.name in requested_set]
		columns: List[Any] = []
		labels: List[str] = []
		group_keys: List[Any] = []
		for attr in all_attrs:
			column = self._resolve_attribute_column(attr, tables_by_alias)
			columns.append(column.label(attr.name))
			labels.append(attr.name)
			if column not in group_keys:
				group_keys.append(column)
		return columns, labels, group_keys

	def _resolve_attribute_column(
			self, attr: VirtualObjectAttribute, tables_by_alias: Dict[str, Table]
	):
		table = tables_by_alias.get(attr.sourceTable)
		if table is None:
			available = ', '.join(k if k else '(empty)' for k in sorted(tables_by_alias.keys())) or '<none>'
			raise OntologySqlCompileError(
				f'Source table alias [{attr.sourceTable}] not found for attribute [{attr.name}]. '
				f'Available aliases: [{available}].')
		column = table.c.get(attr.sourceField)
		if column is None:
			available_fields = ', '.join(sorted(table.c.keys())) or '<none>'
			raise OntologySqlCompileError(
				f'Source field [{attr.sourceField}] not found for attribute [{attr.name}] '
				f'on alias [{attr.sourceTable}]. Available fields: [{available_fields}].')
		return column


# =============================================================================
# 内部：把 physical table join 到 from_clause
# =============================================================================

class _JoinBuilder:
	"""负责物理表之间的 join 类型选择。"""

	def __init__(self, table_factory: OntologyTableFactory) -> None:
		self._tf = table_factory

	def join_physical_table(self, from_clause, primary_table: Table, table: Table, mapping: PhysicalTableMapping):
		if not mapping.joinConditions:
			raise OntologySqlCompileError(
				f'Join conditions are required for table [{mapping.topicName}] '
				f'alias [{self._tf.resolve_mapping_alias(mapping)}].')
		criteria = []
		for condition in mapping.joinConditions:
			source = primary_table.c.get(condition.sourceField)
			if source is None:
				available_fields = ', '.join(sorted(primary_table.c.keys())) or '<none>'
				raise OntologySqlCompileError(
					f'Join source field [{condition.sourceField}] not found on primary table. '
					f'Available fields: [{available_fields}].')
			target = table.c.get(condition.targetField)
			if target is None:
				available_fields = ', '.join(sorted(table.c.keys())) or '<none>'
				raise OntologySqlCompileError(
					f'Join target field [{condition.targetField}] not found on table [{mapping.topicName}]. '
					f'Available fields: [{available_fields}].')
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


# =============================================================================
# 内部：derived attribute 编译（含 path-aware join 链）
# =============================================================================

class _DerivedAttributeCompiler:
	"""编译 ``virtualObject.derivedAttributes`` 为聚合列 + 配套 join 列表。

	每个 derived 都把目标物理表 LEFT JOIN 到主表，主表 join 键列加入 GROUP BY。
	path-aware：支持多跳 VO 链。
	"""

	def __init__(
			self, ontology: VirtualOntology, primary_vo: VirtualObject, primary_table: Table,
			tables_by_alias: Dict[str, Table], table_factory: OntologyTableFactory,
			path_resolver: PathResolver, filter_compiler: FilterCompiler,
	) -> None:
		self._ontology = ontology
		self._primary_vo = primary_vo
		self._primary_table = primary_table
		self._tables_by_alias = tables_by_alias
		self._tf = table_factory
		self._path_resolver = path_resolver
		self._filter_compiler = filter_compiler

	def compile(
			self, virtual_object: VirtualObject, requested: List[str],
	) -> Tuple[List[Any], List[str], List[Tuple[Table, Any, Tuple]]]:
		"""返回 (聚合列 list, label list, [(join_table, on_clause, group_keys), ...])。"""
		requested_names = set(requested or [])
		if not requested_names:
			# includeDerived 未传时不生成 derived SQL
			return [], [], []
		columns: List[Any] = []
		labels: List[str] = []
		derived_joins: List[Tuple[Table, Any, Tuple]] = []
		for derived in virtual_object.derivedAttributes or []:
			if derived.name not in requested_names:
				continue
			agg_col, join_list, group_keys = self._compile_one(derived)
			columns.append(agg_col.label(derived.name))
			labels.append(derived.name)
			for join_table, on_clause in join_list:
				derived_joins.append((join_table, on_clause, group_keys))
		return columns, labels, derived_joins

	# ---- 单条 derived --------------------------------------------------------

	def _compile_one(self, derived: DerivedAttribute) -> Tuple[Any, List[Tuple[Table, Any]], Tuple]:
		aggregate = (derived.aggregate or 'count').lower()
		if not derived.path:
			raise OntologySqlCompileError(
				f'Derived attribute [{derived.name}] path is required.')

		path_segments = self._path_resolver.parse(self._ontology, derived.path, derived.name)
		final_vo = path_segments[-1][1]
		final_primary = self._resolve_primary(final_vo)
		final_alias = safe_alias(f'{final_vo.name or final_vo.id}_{derived.name}')
		target_table = self._tf.build_table(
			final_primary.topicName, final_alias, final_primary.fields)

		# 每段 vo 对应一张表（中间 hop 用 hop{idx} alias 区分）
		vo_table_for_segment: Dict[int, Table] = {}
		path_tables: Dict[str, Table] = {final_alias: target_table}
		for idx, (_, next_vo) in enumerate(path_segments):
			if next_vo is final_vo:
				vo_table_for_segment[idx] = target_table
			else:
				vo_primary = self._resolve_primary(next_vo)
				vo_alias = safe_alias(f'{next_vo.name or next_vo.id}_{derived.name}_hop{idx}')
				vo_table_for_segment[idx] = self._tf.build_table(
					vo_primary.topicName, vo_alias, vo_primary.fields)
				path_tables[vo_alias] = vo_table_for_segment[idx]

		# 依次累加每段 link 的 join 条件
		join_clauses: List[Tuple[Table, Any]] = []
		prev_table = self._primary_table
		prev_vo = self._primary_vo
		first_segment_keys: List[str] = []
		last_target_col: Optional[Any] = None
		for idx, (link, next_vo) in enumerate(path_segments):
			right_table = vo_table_for_segment[idx]
			if not link.joinConditions:
				raise OntologySqlCompileError(
					f'Virtual link [{link.name}] joinConditions is required for derived [{derived.name}].')
			# 判断 link 在 path 中是否被反向使用：当 link 定义方向（source→target）
			# 与 path 方向（prev_vo→next_vo）相反时，source/target 字段归属整体交换。
			reversed_dir = self._is_link_reversed(link, prev_vo, next_vo)
			src_table = right_table if reversed_dir else prev_table
			tgt_table = prev_table if reversed_dir else right_table
			segment_criteria = []
			for condition in link.joinConditions:
				source_col = self._resolve_join_source_column(
					condition.sourceField or '', src_table)
				if source_col is None:
					available_fields = ', '.join(sorted(src_table.c.keys())) or '<none>'
					direction = ' (reversed)' if reversed_dir else ''
					raise OntologySqlCompileError(
						f'Source field [{condition.sourceField}] not found for derived [{derived.name}]'
						f'{direction}. Available fields: [{available_fields}].')
				target_col = self._resolve_join_target_column(
					condition.targetField or '', tgt_table)
				if target_col is None:
					available_fields = ', '.join(sorted(tgt_table.c.keys())) or '<none>'
					direction = ' (reversed)' if reversed_dir else ''
					raise OntologySqlCompileError(
						f'Target field [{condition.targetField}] not found on [{next_vo.name}] '
						f'for derived [{derived.name}]{direction}. Available fields: [{available_fields}].')
				# ON 左侧固定为 prev_table 侧列，保证 GROUP BY 键来自 primary；
				# 反向时 target_col 属于 prev_table，故置于左侧。
				segment_criteria.append(
					target_col == source_col if reversed_dir else source_col == target_col)
			# 记录最后一段 right_table（path 右侧）侧列，给 count 聚合用
			# （LEFT JOIN 不命中时为 NULL，符合“只数命中行”语义）
			right_ref_col = source_col if reversed_dir else target_col
			if idx == len(path_segments) - 1 and last_target_col is None:
				last_target_col = right_ref_col
			# GROUP BY 键必须在合并 link filters 之前提取：
			# 过滤器表达式的 .left.name 可能恰与主表列同名，混进来会污染聚合粒度
			if idx == 0:
				first_segment_keys = [
					c.left.name for c in segment_criteria
					if hasattr(c, 'left') and hasattr(c.left, 'name')
				]
			# 追加 link 级 filters（追加到 ON 子句）；反向时 source/target 侧也交换，
			# 使 filter 的 source./target. 前缀仍对应 link 定义的 source/target VO。
			flt_src_table = right_table if reversed_dir else prev_table
			flt_tgt_table = prev_table if reversed_dir else right_table
			segment_criteria.extend(
				self._filter_compiler.compile_link_filters(link, flt_src_table, flt_tgt_table, derived.name))
			join_clauses.append((right_table, and_(*segment_criteria)))
			prev_table = right_table
			prev_vo = next_vo

		# GROUP BY 取第一段 join 键列（primary_table.sourceField）
		group_key_names = sorted(set(first_segment_keys), key=lambda n: n)
		group_keys = tuple(self._primary_table.c[name] for name in group_key_names if name in self._primary_table.c)

		agg_col = self._build_aggregate(aggregate, derived, target_table, path_tables, last_target_col)
		return agg_col, join_clauses, group_keys

	def _build_aggregate(
			self, aggregate: str, derived: DerivedAttribute, target_table: Table,
			path_tables: Dict[str, Table], count_ref_col: Optional[Any],
	) -> Any:
		if aggregate == 'count':
			# 优先用 join 的 target 列（保证列存在且 LEFT JOIN 不命中时为 NULL，
			# 正好符合"只数命中行"的语义）；找不到时退化为 count(*)。
			if count_ref_col is not None:
				return func.count(count_ref_col)
			fallback = target_table.c.get('id')
			if fallback is not None:
				return func.count(fallback)
			return func.count()
		if aggregate == 'count_distinct':
			target_col = self._resolve_aggregate_target_column(
				derived.targetField, target_table, path_tables, derived.name)
			return func.count(func.distinct(target_col))
		if aggregate in ('sum', 'avg', 'min', 'max'):
			target_field = derived.targetField
			if not target_field:
				raise OntologySqlCompileError(
					f'targetField is required for aggregate [{aggregate}] on derived [{derived.name}].')
			target_col = self._resolve_aggregate_target_column(
				target_field, target_table, path_tables, derived.name)
			sql_func = getattr(func, aggregate)
			return func.coalesce(sql_func(target_col), 0)
		raise OntologySqlCompileError(f'Derived aggregate [{derived.aggregate}] is not supported yet.')

	# ---- 列解析 --------------------------------------------------------------

	def _resolve_join_source_column(self, raw_field: str, primary_table: Table):
		"""解析 join source 字段，支持 ``alias.column`` 跨表。"""
		if '.' in raw_field:
			alias_key, _, column_name = raw_field.partition('.')
			alias_key = alias_key.strip()
			column_name = column_name.strip()
			table = self._tables_by_alias.get(alias_key)
			if table is not None:
				col = table.c.get(column_name)
				if col is not None:
					return col
		return primary_table.c.get(raw_field)

	def _resolve_join_target_column(self, raw_field: str, target_table: Table):
		"""解析 join target 字段，支持 ``alias.column`` 跨表。"""
		if '.' in raw_field:
			alias_key, _, column_name = raw_field.partition('.')
			alias_key = alias_key.strip()
			column_name = column_name.strip()
			table = self._tables_by_alias.get(alias_key)
			if table is not None:
				col = table.c.get(column_name)
				if col is not None:
					return col
		return target_table.c.get(raw_field)

	def _resolve_aggregate_target_column(
			self, raw_field: Optional[str], default_target_table: Table,
			path_tables: Dict[str, Table], derived_name: str,
	):
		"""解析 derived aggregate 的 targetField（path-aware）。

		查找顺序：
		1. ``alias.column`` → 优先在 path 链所有表里查
		2. 纯列名 → 在默认 target_table 上查
		3. 找不到 → 在 path 链所有表里查同名列
		4. 都找不到 → 抛出包含 path 链全部可用表和字段的错误
		"""
		all_tables = {default_target_table, *path_tables.values()}
		if raw_field and '.' in raw_field:
			alias_key, _, column_name = raw_field.partition('.')
			alias_key = alias_key.strip()
			column_name = column_name.strip()
			for tbl in all_tables:
				if alias_key == getattr(tbl, 'name', None):
					col = tbl.c.get(column_name)
					if col is not None:
						return col
			tbl = path_tables.get(alias_key)
			if tbl is not None:
				col = tbl.c.get(column_name)
				if col is not None:
					return col
		if raw_field:
			col = default_target_table.c.get(raw_field)
			if col is not None:
				return col
			for tbl in all_tables:
				col = tbl.c.get(raw_field)
				if col is not None:
					return col
		# 错误信息：path 链上所有表 + 可用字段
		detail_lines = []
		for tbl in all_tables:
			alias = getattr(tbl, 'name', None) or getattr(tbl, 'key', None) or '<unknown>'
			fields = ', '.join(sorted(tbl.c.keys())) or '<none>'
			detail_lines.append(f'  - {alias}: [{fields}]')
		raise OntologySqlCompileError(
			f'Aggregate target field [{raw_field or "<empty>"}] not found for derived [{derived_name}]. '
			f'Available columns along path: [\n' + '\n'.join(detail_lines) + '\n]')

	@staticmethod
	def _is_link_reversed(link, prev_vo: Optional[VirtualObject], next_vo: VirtualObject) -> bool:
		"""判断 link 在 path 中是否被反向使用。

		依据 ``link.sourceObjectId/targetObjectId`` 与 path 上一跳/下一跳 VO 的 id 匹配：
		- source==next 且 target==prev → 反向
		- 其余（含 id 缺失、无法判定）→ 按正向（宽容，向后兼容）。
		"""
		src_id = (link.sourceObjectId or '').strip()
		tgt_id = (link.targetObjectId or '').strip()
		prev_id = (prev_vo.id if prev_vo and prev_vo.id else '').strip()
		next_id = (next_vo.id or '').strip()
		if src_id and tgt_id and prev_id and next_id:
			return src_id == next_id and tgt_id == prev_id
		return False

	def _resolve_primary(self, virtual_object: VirtualObject) -> PhysicalTableMapping:
		for mapping in virtual_object.physicalTables or []:
			if mapping.kind == 'primary':
				return mapping
		raise OntologySqlCompileError(f'Virtual object [{virtual_object.name}] has no primary table.')
