import sqlparse

from watchmen_storage.sql_analysis.ast_visitor import CaseVisitor, ComparisonVisitor, FunctionVisitor, \
	IdentifierListVisitor, IdentifierVisitor, ParenthesisVisitor, QueryPerformance, SqlColumn, SqlContext, TokenVisitor, \
	WhereVisitor


class SqlParser:
	def __init__(self):
		self.visitors = [
			IdentifierListVisitor(), FunctionVisitor(), IdentifierVisitor(), ParenthesisVisitor(),
			ComparisonVisitor(), WhereVisitor(), CaseVisitor(), TokenVisitor()
		]

	def find_visitor(self, ast):
		for v in self.visitors:
			if v.support(ast):
				return v

	def start(self):
		pass

	def parse(self, sql: str) -> QueryPerformance:
		context = SqlContext()
		statements = sqlparse.split(sql)
		for statement in statements:
			tokens = sqlparse.parse(statement)[0].tokens
			for index, token in enumerate(tokens):
				visitor = self.find_visitor(token)
				if visitor:
					previous_one = self.get_previous(index, tokens)
					next_one = self.get_next(index, tokens)
					visitor.process(token, context, self.visitors, previous_one, next_one)

		qp = self.process_context_result(context)
		qp.sql = sql
		return qp

	# noinspection PyMethodMayBeStatic
	def remove_duplicate(self, current_column_list):
		result = []
		last_name = None
		for column in current_column_list:
			if last_name != column.name:
				result.append(column)
				last_name = column.name
		return result

	def process_context_result(self, context: SqlContext):
		query_performance = QueryPerformance()
		column_dimensions = self.build_column_dimension(context)
		query_performance.column_dimensions = column_dimensions
		query_performance.topic_dimensions = self.build_table_dimension(context)
		return query_performance

	# noinspection PyMethodMayBeStatic
	def build_table_dimension(self, context: SqlContext):
		tables = context.table
		tables_value = ""
		for table in tables:
			if tables_value == "":
				tables_value = table
			else:
				tables_value = tables_value + "_" + table
		return tables_value

	def build_column_dimension(self, context: SqlContext):
		column_dict = context.columns
		level = context.level
		current_column_list = column_dict["level_" + str(level)]
		dimension_value = ""
		sort_current_column_list = self.remove_duplicate(
			sorted(current_column_list, key=lambda a_column: a_column.name))
		for column in sort_current_column_list:
			column: SqlColumn = column
			if dimension_value == "":
				dimension_value = column.name
			else:
				dimension_value = dimension_value + "_" + column.name
		return dimension_value

	# noinspection PyMethodMayBeStatic
	def get_previous(self, index, tokens):
		if index > 0:
			return tokens[index - 1]
		else:
			return None

	# noinspection PyMethodMayBeStatic
	def get_next(self, index, tokens):
		if index < len(tokens) - 1:
			return tokens[index + 1]
		else:
			return None
