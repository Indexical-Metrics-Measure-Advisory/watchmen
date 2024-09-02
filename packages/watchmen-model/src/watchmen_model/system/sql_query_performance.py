
from datetime import datetime
from decimal import Decimal
from typing import Optional

from watchmen_utilities import ExtendedBaseModel
from watchmen_model.common import Storable


class SQLQueryPerformance(Storable, ExtendedBaseModel):
	id: Optional[str] = None
	queryText: Optional[str] = None
	querySpent: Optional[Decimal] = None
	queryDate: Optional[datetime] = None
	resultCount: Optional[int] = None
	queryParse: Optional[dict] = None

#
# import sqlparse
#
#
# def parse_sql(query):
# 	parsed = sqlparse.parse(query)[0]
# 	select = []
# 	where = ['WHERE']
# 	condition = None
# 	group_by = ['GROUP BY']
#
# 	# Get SELECT fields
# 	for token in parsed.tokens:
# 		if token.ttype is sqlparse.tokens.Wildcard:
# 			select.append(token.value)
# 		elif token.is_keyword and token.value.upper() == 'FROM':
# 			break
# 		else:
# 			select.append(token.value)
#
# 	# Get WHERE condition
# 	for token in parsed.tokens:
# 		if token.is_keyword and token.value.upper() == 'WHERE':
# 			i = parsed.tokens.index(token) + 1
# 			while parsed.tokens[i].value.upper() != 'GROUP' and parsed.tokens[i].value.upper() != 'ORDER':
# 				where.append(parsed.tokens[i].value)
#
# 				# Set condition
# 				if token.ttype in [sqlparse.tokens.Comparison, sqlparse.tokens.Operator]:
# 					condition = token.value
#
# 				i += 1
#
# 			# Get GROUP BY names
# 	for token in parsed.tokens:
# 		if token.is_keyword and token.value.upper() == 'GROUP':
# 			i = parsed.tokens.index(token) + 2
# 			while parsed.tokens[i].ttype is not sqlparse.tokens.Whitespace:
# 				group_by.append(parsed.tokens[i].value)
# 				i += 1
#
# 	return {
# 		'select': select,
# 		'where': where,
# 		'condition': condition,
# 		'group_by': group_by
# 	}
#
#
# query = "SELECT id, name, age FROM users WHERE age > 30 AND gender = 'M' GROUP BY department, status;"
# result = parse_sql(query)
# print(result)

