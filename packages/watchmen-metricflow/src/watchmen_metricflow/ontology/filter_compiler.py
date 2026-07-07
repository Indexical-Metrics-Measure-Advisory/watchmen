"""Filter 编译器：把 FilterCondition 编译为 SQLAlchemy 条件。

支持三种 filter 来源：
- 物理表级 filters（``PhysicalTableMapping.filters``）→ WHERE
- 虚拟链接级 filters（``VirtualLink.filters``）→ ON 子句
- 运行时 filters（``OntologyQueryRequest.filters``）→ WHERE

所有 operator 共用一份处理逻辑；只差作用的列。
"""

from typing import Any, Callable, Dict, List, Optional

from sqlalchemy import Table, and_

from watchmen_model.admin import FilterCondition, VirtualLink

from .errors import OntologySqlCompileError


class FilterCompiler:
	"""把 FilterCondition 列表编译为 SQLAlchemy 表达式。"""

	def __init__(self, find_table_for_filter: Callable[[FilterCondition], Optional[Table]]):
		# 通过回调拿到"按 mapping 找表"的能力，避免直接依赖 TableFactory。
		# 这样 FilterCompiler 与 TableFactory 解耦，可独立单测。
		self._find_table_for_filter = find_table_for_filter

	# ---- 物理表级 filters（→ WHERE） -----------------------------------------

	def compile_table_filters(self, virtual_object, tables_by_alias: Dict[str, Table]) -> List[Any]:
		clauses: List[Any] = []
		for mapping in virtual_object.physicalTables or []:
			if not mapping.filters:
				continue
			table = self._find_table_for_filter(mapping, tables_by_alias)
			if table is None:
				raise OntologySqlCompileError(
					f'Cannot resolve table for filters on [{mapping.topicName}] alias [{mapping.alias}].')
			for flt in mapping.filters:
				clause = self._compile_table_filter(flt, table, mapping)
				if clause is not None:
					clauses.append(clause)
		return clauses

	# ---- 虚拟链接级 filters（→ ON 子句） -------------------------------------

	def compile_link_filters(
			self, link: VirtualLink, source_table: Table, target_table: Table, derived_name: str
	) -> List[Any]:
		return [
			self.compile_link_filter(flt, link, source_table, target_table, derived_name)
			for flt in (link.filters or [])
		]

	def compile_link_filter(
			self, flt: FilterCondition, link: VirtualLink, source_table: Table,
			target_table: Table, derived_name: str,
	) -> Any:
		"""field 用前缀 ``source.`` / ``target.`` 标识作用于哪一侧；无前缀按 source。"""
		if not flt.field:
			raise OntologySqlCompileError(
				f'Filter on virtual link [{link.name}] is missing [field] for derived [{derived_name}].')
		side, _, column_name = flt.field.partition('.')
		side = side.strip().lower()
		if side == 'source':
			table, side_label = source_table, 'source'
		elif side == 'target':
			table, side_label = target_table, 'target'
		else:
			column_name = flt.field
			table, side_label = source_table, 'source'
		column = table.c.get(column_name)
		if column is None:
			available_fields = ', '.join(sorted(table.c.keys())) or '<none>'
			raise OntologySqlCompileError(
				f'Link filter field [{column_name}] not found on {side_label} side of link [{link.name}] '
				f'for derived [{derived_name}]. Available fields: [{available_fields}].')
		return self._apply_operator(flt, column, table_label=f'link [{link.name}].{flt.field}')

	# ---- 运行时 request filter 辅助 -------------------------------------------

	def compile_request_filters(
			self, virtual_object, filters: Dict[str, Any],
			resolve_attribute_column: Callable,
	):
		"""编译 ``OntologyQueryRequest.filters``。

		``resolve_attribute_column(attr)`` 返回 SQLAlchemy 列对象；
		解耦逻辑以便 caller 控制 attribute 列解析策略。
		"""
		criteria = []
		attributes = {attr.name: attr for attr in virtual_object.attributes or []}
		for field, value in (filters or {}).items():
			attr = attributes.get(field)
			if attr is None:
				raise OntologySqlCompileError(
					f'Filter field [{field}] is not defined in virtual object [{virtual_object.name}].')
			criteria.append(resolve_attribute_column(attr) == value)
		return and_(*criteria) if criteria else None

	# ---- 内部：单条 FilterCondition 处理 ---------------------------------------

	def _compile_table_filter(self, flt: FilterCondition, table: Table, mapping) -> Any:
		if not flt.field:
			raise OntologySqlCompileError(
				f'Filter on table [{mapping.topicName}] alias [{mapping.alias}] is missing [field].')
		column = table.c.get(flt.field)
		if column is None:
			available_fields = ', '.join(sorted(table.c.keys())) or '<none>'
			raise OntologySqlCompileError(
				f'Filter field [{flt.field}] not found on table [{mapping.topicName}] alias [{mapping.alias}]. '
				f'Available fields: [{available_fields}].')
		return self._apply_operator(
			flt, column, table_label=f'[{mapping.topicName}].{flt.field}')

	def _apply_operator(self, flt: FilterCondition, column, table_label: str) -> Any:
		operator = (flt.operator or 'eq').lower()
		value = self._normalize_value(flt)
		if operator == 'eq':
			return column == value
		if operator == 'ne':
			return column != value
		if operator == 'in':
			if not isinstance(value, list) or len(value) == 0:
				raise OntologySqlCompileError(
					f'Filter [in] on [{table_label}] requires a non-empty list value.')
			return column.in_(value)
		if operator == 'not_in':
			if not isinstance(value, list) or len(value) == 0:
				raise OntologySqlCompileError(
					f'Filter [not_in] on [{table_label}] requires a non-empty list value.')
			return ~column.in_(value)
		if operator == 'gt':
			return column > value
		if operator == 'gte':
			return column >= value
		if operator == 'lt':
			return column < value
		if operator == 'lte':
			return column <= value
		if operator == 'is_null':
			return column.is_(None)
		if operator == 'is_not_null':
			return column.isnot(None)
		raise OntologySqlCompileError(
			f'Unsupported filter operator [{flt.operator}] on [{table_label}].')

	@staticmethod
	def _normalize_value(flt: FilterCondition):
		value = flt.value
		if value is None:
			return None
		if isinstance(value, list):
			return [v for v in value]
		return value
