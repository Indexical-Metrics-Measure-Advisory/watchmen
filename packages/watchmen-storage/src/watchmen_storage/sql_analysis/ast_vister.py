from pydantic import BaseModel
from sqlparse.sql import Case, Comparison, Function, Identifier, IdentifierList, Parenthesis, Token, Where


class SqlContext(BaseModel):
	status: str = None
	sub_status: str = None
	table: list = []
	group_by: list = []
	joins: list = []
	where: list = []
	columns: dict = {"level_0": [], "level_1": [], "level_2": []}
	function: list = []
	level: int = -1


class SqlColumn(BaseModel):
	"""
	Represents a column in a sql select statement
	"""
	name: str = None
	alias: str = None
	function: list = None
	table: str = None


class JoinColumn(BaseModel):
	"""
	Represents a column in a sql join statement
	"""
	left: str = None
	leftTable: str = None
	operator: str = None
	right: str = None
	rightTable: str = None


class JoinTable(BaseModel):
	name: str = None
	alias: str = None
	join_column: str = None


class GroupByColumn(BaseModel):
	name: str = None
	alias: str = None
	table: str = None


class WhereColumn(BaseModel):
	name: str = None
	alias: str = None
	table: str = None
	operator: str = None
	value: str = None


class QueryPerformance(BaseModel):
	topic_dimensions: str = None
	column_dimensions: str = None
	execution_time: int = None
	data_volume: int = None
	join_dimensions: str = None
	where_dimensions: str = None
	group_by_dimensions: str = None
	sql: str = None


def build_function(name):
	if value_is_function(name):
		return name
	else:
		return None


def find_visitor(visitor_list, ast):
	for v in visitor_list:
		if v.support(ast):
			return v


def value_is_function(name):
	return name == 'count' or name == 'sum' or name == 'avg' or name == 'max' or name == 'min' or name == 'distinct'


def add_column(context, value: str):
	column_dict = context.columns
	level = context.level
	key = "level_" + str(level)
	if context.sub_status == "column_topic":
		column = column_dict[key][-1]
		column.name = value
	else:
		column = SqlColumn(name=value)
		column_dict[key].append(column)


def add_column_as(context: SqlContext, value):
	if context.level == 0:
		column_dict = context.columns
		column = column_dict["level_0"][-1]
		column.alias = value
	elif context.level == 1:
		column_dict = context.columns
		column = column_dict["level_1"][-1]
		column.alias = value
	elif context.level == 2:
		column_dict = context.columns
		column = column_dict["level_2"][-1]
		column.alias = value


def find_operator(token: Token):
	"""
	:param token:
	:return:
	"""
	for sub_token in token.tokens:
		if isinstance(sub_token, Token):
			if sub_token.normalized == "=" \
					or sub_token.normalized == ">" \
					or sub_token.normalized == "<" \
					or sub_token.normalized == ">=" \
					or sub_token.normalized == "<=" \
					or sub_token.normalized == "!=":
				return sub_token.normalized


def add_column_topic(context, value):
	"""
	:param context:
	:param value:
	"""
	context.sub_status = "column_topic"
	if context.level == 0:
		column_dict = context.columns
		column = SqlColumn(table=value)
		column_dict["level_0"].append(column)
	elif context.level == 1:
		column_dict = context.columns
		column = SqlColumn(table=value)
		column_dict["level_1"].append(column)
	elif context.level == 2:
		column_dict = context.columns
		column = SqlColumn(table=value)
		column_dict["level_2"].append(column)


def set_status(context: SqlContext, token: Token):
	if token.is_keyword and token.value.upper() == 'SELECT':
		context.status = "select"
		context.level = context.level + 1
	elif token.is_keyword and token.value.upper() == 'FROM':
		context.status = "from"
	elif token.is_keyword and token.value.upper() == "AS":
		if context.status == "from":
			context.status = "table_as"
		else:
			context.status = "as"
	elif token.is_keyword and token.value.upper() == "GROUP BY":
		context.status = "group_by"
	elif token.is_keyword and token.value.upper() == "INNER JOIN":
		context.status = "join"
	elif token.is_keyword and token.value.upper() == "ON":
		context.status = "on"
	# elif token.value == "IN" or token.value == "NOT IN" or token.value == "EXISTS" or token.value == "NOT EXISTS":
	elif context.status == "case":
		context.sub_status = token.value
	elif token.is_keyword or value_is_function(token.value):
		function = build_function(token.value)
		context.function.append(function)


def get_current_column(context):
	column_dict = context.columns
	level = context.level
	key = "level_" + str(level)
	return column_dict[key][-1]


class TokenVisitor:
	# noinspection PyMethodMayBeStatic
	def support(self, ast):
		return isinstance(ast, Token)

	# noinspection PyUnusedLocal
	def process(self, token: Token, context, visitor_list, previous_token: Token = None, next_token: Token = None):
		if self.ignore_value(token):
			return None
		elif token.value == ")":
			if context.sub_status == "start_function":
				self.process_end_function(context)
			else:
				return None
		elif token.is_keyword or value_is_function(token.value):
			set_status(context, token)
		elif not token.is_keyword \
				and not token.is_group \
				and not token.is_whitespace \
				and not token.value.startswith("anon"):
			if token.value == ".":
				context.status = "dot"
			elif (
					context.sub_status == "IN"
					or context.sub_status == "THEN"
					or context.sub_status == "ELSE"
					or context.sub_status == "END") \
					and context.status == "case":
				return None
			elif token.value == "IN" and context.status == "case":
				context.sub_status = "IN"
			elif context.status == "from" or context.status == "join":
				context.table.append(token.value)
			elif context.status == "group_by":
				context.group_by.append(token.value)
			elif context.status == "as":
				add_column_as(context, token.value)
				context.status = None
			elif context.status == "case" and context.sub_status == "when":
				if token.value.startswith("topic_"):
					add_column_topic(context, token.value)
				else:
					add_column(context, token.value)
			else:
				if token.value.startswith("topic_") and not context.status == "where":
					add_column_topic(context, token.value)
				else:
					add_column(context, token.value)

	# noinspection PyMethodMayBeStatic
	def process_end_function(self, context):
		context.sub_status = "end_function"
		function_list = context.function
		column = get_current_column(context)
		column.function = function_list
		context.function = []

	# noinspection PyMethodMayBeStatic
	def ignore_value(self, token):
		return token.is_whitespace \
			or token.value == "(" \
			or token.value == "." \
			or token.value == "," \
			or token.value == ";" \
			or token.value == "##"


class IdentifierVisitor:
	# noinspection PyMethodMayBeStatic
	def support(self, ast):
		return isinstance(ast, Identifier)

	# noinspection PyMethodMayBeStatic
	def process(self, token: Identifier, context, visitor_list, previous_token: Token = None, next_token: Token = None):
		if token.is_group:
			for sub_token in token.tokens:
				visitor = find_visitor(visitor_list, sub_token)
				if visitor:
					visitor.process(sub_token, context, visitor_list, previous_token, next_token)


class ParenthesisVisitor:
	# noinspection PyMethodMayBeStatic
	def support(self, ast):
		return isinstance(ast, Parenthesis)

	# noinspection PyMethodMayBeStatic
	def process(
			self, token: Parenthesis, context, visitor_list, previous_token: Token = None,
			next_token: Token = None):
		if context.sub_status == "function":
			context.sub_status = "start_function"
		if (context.sub_status == "IN" or context.sub_status == "THEN") and context.status == "case":
			return None
		if token.M_OPEN and token.M_CLOSE:
			for sub_token in token.tokens:
				visitor = find_visitor(visitor_list, sub_token)
				if visitor:
					visitor.process(sub_token, context, visitor_list, previous_token, next_token)


class FunctionVisitor:
	# noinspection PyMethodMayBeStatic
	def support(self, ast):
		return isinstance(ast, Function)

	# noinspection PyMethodMayBeStatic
	def process(self, token: Function, context, visitor_list, previous_token: Token = None, next_token: Token = None):
		# if context.status == "select":
		context.sub_status = "function"
		if token.is_group:
			for sub_token in token.tokens:
				visitor = find_visitor(visitor_list, sub_token)
				if visitor:
					visitor.process(sub_token, context, visitor_list, previous_token, next_token)


class IdentifierListVisitor:
	# noinspection PyMethodMayBeStatic
	def support(self, ast):
		return isinstance(ast, IdentifierList)

	# noinspection PyMethodMayBeStatic
	def process(
			self, token: IdentifierList, context, visitor_list, previous_token: Token = None,
			next_token: Token = None):
		if token.is_group:
			for sub_token in token.tokens:
				visitor = find_visitor(visitor_list, sub_token)
				if visitor:
					visitor.process(sub_token, context, visitor_list, previous_token, next_token)


class WhereVisitor:
	# noinspection PyMethodMayBeStatic
	def support(self, ast):
		return isinstance(ast, Where)

	# noinspection PyMethodMayBeStatic
	def process(
			self, token: IdentifierList, context, visitor_list, previous_token: Token = None,
			next_token: Token = None):
		context.status = "where"
		if token.is_group:
			for sub_token in token.tokens:
				visitor = find_visitor(visitor_list, sub_token)
				if visitor:
					visitor.process(sub_token, context, visitor_list, previous_token, next_token)


class ComparisonVisitor:
	# noinspection PyMethodMayBeStatic
	def support(self, ast):
		return isinstance(ast, Comparison)

	# noinspection PyMethodMayBeStatic, PyUnusedLocal
	def process(
			self, token: Comparison, context: SqlContext, visitor_list, previous_token: Token = None,
			next_token: Token = None):
		if context.status == "case" and context.sub_status == "WHEN":
			left_table, left = token.left.normalized.split(".")
			add_column_topic(context, left_table)
			add_column(context, left)
		elif context.status == "where":
			if "." in token.left.normalized:
				left_table, left = token.left.normalized.split(".")
				operator = find_operator(token)
				value = token.right.value
				context.where.append(WhereColumn(table=left_table, name=left, operator=operator, value=value))


		elif token.is_group and token.left and token.right and not context.status == "case":
			left_table, left = token.left.normalized.split(".")
			right_table, right = token.right.normalized.split(".")
			operator = find_operator(token)
			context.joins.append(
				JoinColumn(leftTable=left_table, left=left, rightTable=right_table, right=right, operator=operator))


class CaseVisitor:
	# noinspection PyMethodMayBeStatic
	def support(self, ast):
		return isinstance(ast, Case)

	# noinspection PyMethodMayBeStatic
	def process(
			self, token: Case, context, visitor_list, previous_token: Token = None,
			next_token: Token = None):
		context.status = "case"
		if token.is_group:
			for sub_token in token.tokens:
				visitor = find_visitor(visitor_list, sub_token)
				if visitor:
					visitor.process(sub_token, context, visitor_list, previous_token, next_token)