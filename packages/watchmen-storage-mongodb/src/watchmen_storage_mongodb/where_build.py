from datetime import date, datetime, time
from decimal import Decimal
from re import findall
from typing import Any, Callable, Dict, List, Optional, Tuple, Union

from watchmen_storage import ColumnNameLiteral, ComputedLiteral, ComputedLiteralOperator, EntityCriteria, \
	EntityCriteriaExpression, EntityCriteriaJoint, EntityCriteriaJointConjunction, EntityCriteriaOperator, \
	EntityCriteriaStatement, Literal, NoCriteriaForUpdateException, UnexpectedStorageException, \
	UnsupportedComputationException, UnsupportedCriteriaException
from watchmen_utilities import ArrayHelper, DateTimeConstants, is_decimal, is_not_blank
from .document_mongo import MongoDocument


def to_decimal(value: Any) -> str:
	if isinstance(value, (int, float, Decimal)):
		return str(value)
	elif isinstance(value, str):
		parsed, decimal_value = is_decimal(value)
		if not parsed:
			raise UnexpectedStorageException(f'Given value[{value}] cannot be casted to a decimal.')
		else:
			return str(decimal_value)
	else:
		raise UnexpectedStorageException(f'Given value[{value}] cannot be casted to a decimal.')


def build_date_diff(documents: List[MongoDocument], literal: Literal, unit: str) -> Dict[str, Any]:
	return {
		'$let': {
			'vars': {
				'original_start_date': build_literal(documents, literal.elements[1]),
				'original_end_date': build_literal(documents, literal.elements[0])
			},
			'in': {
				'$let': {
					'vars': {
						'start_parts': {'$dateToParts': {'date': '$$original_start_date'}},
						'end_parts': {'$dateToParts': {'date': '$$original_end_date'}}
					},
					'in': {
						'$let': {
							'vars': {
								'start_date': {'$dateFromParts': {
									'year': '$$start_parts.year', 'month': '$$start_parts.month',
									'day': '$$start_parts.day'
								}},
								'end_date': {'$dateFromParts': {
									'year': '$$end_parts.year', 'month': '$$end_parts.month',
									'day': '$$end_parts.day'
								}}
							},
							'in': {
								'$dateDiff': {
									'startDate': '$$start_date',
									'endDate': '$$end_date',
									'unit': unit
								}
							}
						}
					}
				}
			}
		}
	}


# noinspection DuplicatedCode
def parse_move_date_pattern(pattern: str) -> List[Tuple[str, str, str]]:
	"""
	elements of tuple are
	1. flag: YMDhms
	2. operator: +- or empty
	3. number
	"""
	pattern = pattern.strip()
	segments = findall(r'([YMDhms])\s*([+-]?)\s*(\d+)', pattern)
	parsed = ArrayHelper(segments).map(lambda x: f'{x[0]}{x[1]}{x[2]}').join('')
	original = ArrayHelper([*pattern]).filter(lambda x: is_not_blank(x)).join('')
	if parsed != original:
		raise UnexpectedStorageException(f'Incorrect date move pattern[{pattern}].')
	return segments


def build_literal(
		documents: List[MongoDocument], literal: Literal, build_plain_value: Callable[[Any], str] = None
) -> Union[str, Dict[str, Any]]:
	if isinstance(literal, ColumnNameLiteral):
		# only one document is supported
		return f'${literal.columnName}'
	elif isinstance(literal, ComputedLiteral):
		operator = literal.operator
		if operator == ComputedLiteralOperator.ADD:
			return {
				'$add': ArrayHelper(literal.elements).map(lambda x: build_literal(documents, x, to_decimal)).to_list()
			}
		elif operator == ComputedLiteralOperator.SUBTRACT:
			first = build_literal(documents, literal.elements[0], to_decimal)
			return ArrayHelper(literal.elements[1:]) \
				.map(lambda x: build_literal(documents, x, to_decimal)) \
				.reduce(lambda prev, x: {'$subtract': [prev, x]}, first)
		elif operator == ComputedLiteralOperator.MULTIPLY:
			return {
				'$multiply': ArrayHelper(literal.elements).map(
					lambda x: build_literal(documents, x, to_decimal)).to_list()
			}
		elif operator == ComputedLiteralOperator.DIVIDE:
			first = build_literal(documents, literal.elements[0], to_decimal)
			return ArrayHelper(literal.elements[1:]) \
				.map(lambda x: build_literal(documents, x, to_decimal)) \
				.reduce(lambda prev, x: {'$divide': [prev, x]}, first)
		elif operator == ComputedLiteralOperator.MODULUS:
			first = build_literal(documents, literal.elements[0], to_decimal)
			return ArrayHelper(literal.elements[1:]) \
				.map(lambda x: build_literal(documents, x, to_decimal)) \
				.reduce(lambda prev, x: {'$mod': [prev, x]}, first)
		elif operator == ComputedLiteralOperator.YEAR_OF:
			return {'$year': build_literal(documents, literal.elements[0])}
		elif operator == ComputedLiteralOperator.HALF_YEAR_OF:
			return {
				'$cond': [
					{'$lte': [{'$month': build_literal(documents, literal.elements[0])}, 6]},
					DateTimeConstants.HALF_YEAR_FIRST.value, DateTimeConstants.HALF_YEAR_SECOND.value
				]
			}
		elif operator == ComputedLiteralOperator.QUARTER_OF:
			return {'$ceil': {'$divide': [{'$month': build_literal(documents, literal.elements[0])}, 3]}}
		elif operator == ComputedLiteralOperator.MONTH_OF:
			return {'$month': build_literal(documents, literal.elements[0])}
		elif operator == ComputedLiteralOperator.WEEK_OF_YEAR:
			# week of year in mongo is 0 - 53
			return {'$week': build_literal(documents, literal.elements[0])}
		elif operator == ComputedLiteralOperator.WEEK_OF_MONTH:
			return {
				'$let': {
					# built literal, which is a date
					'vars': {'current': build_literal(documents, literal.elements[0])},
					'in': {
						'$let': {
							# parse to parts
							'vars': {'parts': {'$dateToParts': {'date': '$$current'}}},
							'in': {
								'$let': {
									# get first day of current date
									'vars': {'first': {'$dateFromParts': {
										'year': '$$parts.year', 'month': '$$parts.month', 'day': 1
									}}},
									'in': {
										'$let': {
											'vars': {
												'current_week': {'$week': '$$current'},
												'first_week': {'$week': '$$first'},
												'first_weekday': {'$dayOfWeek': '$$first'}
											},
											'in': {
												'$cond': [
													{'$eq': ['$$first_weekday', 1]},
													{'$add': [{'$subtract': ['$$current_week', '$$first_week']}, 1]},
													{'$subtract': ['$$current_week', '$$first_week']}
												]
											}
										}
									}
								}
							}
						}
					}
				}
			}
		elif operator == ComputedLiteralOperator.DAY_OF_MONTH:
			return {'$dayOfMonth': build_literal(documents, literal.elements[0])}
		elif operator == ComputedLiteralOperator.DAY_OF_WEEK:
			# weekday in mongo is 1: Sunday - 7: Saturday
			return {'$dayOfWeek': build_literal(documents, literal.elements[0])}
		elif operator == ComputedLiteralOperator.CASE_THEN:
			elements = literal.elements
			cases = ArrayHelper(elements).filter(lambda x: isinstance(x, Tuple)) \
				.map(lambda x: (build_criteria_statement(documents, x[0]), build_literal(documents, x[1]))) \
				.map(lambda x: {'case': x[0], 'then': x[1]}) \
				.to_list()
			anyway = ArrayHelper(elements).find(lambda x: not isinstance(x, Tuple))
			if anyway is None:
				return {'$switch': {'branches': cases}}
			else:
				return {'$switch': {'branches': cases, 'default': build_literal(documents, anyway)}}
		elif operator == ComputedLiteralOperator.CONCAT:
			return {'$concat': ArrayHelper(literal.elements).map(lambda x: build_literal(documents, x)).to_list()}
		elif operator == ComputedLiteralOperator.YEAR_DIFF:
			return {
				'$let': {
					'vars': {
						'start_date': {'$dateToParts': {'date': build_literal(documents, literal.elements[1])}},
						'end_date': {'$dateToParts': {'date': build_literal(documents, literal.elements[0])}}
					},
					'in': {'$switch': {'branches': [
						{'case': {'$eq': ['$$end_date.year', '$$start_date.year']}, 'then': 0},
						{'case': {'$gt': ['$$end_date.year', '$$start_date.year']}, 'then': {
							'$switch': {'branches': [
								{'case': {'$eq': ['$$end_date.month', '$$start_date.month']}, 'then': {
									'$switch': {'branches': [
										{'case': {'$gt': ['$$end_date.day', '$$start_date.day']}, 'then': {
											'$subtract': ['$$end_date.year', '$$start_date.year']
										}},
										{'case': {'$eq': ['$$end_date.month', 2]}, 'then': {
											'$cond': [
												{'$and': [
													{'$eq': ['$$end_date.day', {'$cond': [
														{'$and': [
															{'$eq': [{'$mod': ['$$end_date.year', 4]}, 0]},
															{'$ne': [{'$mod': ['$$end_date.year', 100]}, 0]},
															{'$eq': [{'$mod': ['$$end_date.year', 400]}, 0]}
														]}, 29, 28
													]}]},
													{'&gt': ['$$start_date.day', '$$end_date.day']}]},
												{'$subtract': ['$$end_date.year', '$$start_date.year']},
												{'$subtract': [
													{'$subtract': ['$$end_date.year', '$$start_date.year']}, 1]}
											]
										}}
									], 'default': {
										'$subtract': [{'$subtract': ['$$end_date.year', '$$start_date.year']}, 1]}}
								}},
								{
									'case': {'$gt': ['$$end_date.month', '$$start_date.month']},
									'then': {'$subtract': ['$$end_date.year', '$$start_date.year']}
								}
							], 'default': {'$subtract': [{'$subtract': ['$$end_date.year', '$$start_date.year']}, 1]}}
						}}
					], 'default': {
						'$switch': {'branches': [
							{'case': {'$eq': ['$$end_date.month', '$$start_date.month']}, 'then': {
								'$cond': [
									{'$gt': ['$$start_date.day', '$$end_date.day']},
									{'$cond': [
										{'$gt': ['$$end_date.month', 2]},
										{'$cond': [
											{'$eq': ['$$start_date.day', {'$cond': [
												{'$and': [
													{'$eq': [{'$mod': ['$$start_date.year', 4]}, 0]},
													{'$ne': [{'$mod': ['$$start_date.year', 100]}, 0]},
													{'$eq': [{'$mod': ['$$start_date.year', 400]}, 0]}
												]}, 29, 28
											]}]},
											{'$subtract': ['$$end_date.year', '$$start_date.year']},
											{'$add': [{'$subtract': ['$$end_date.year', '$$start_date.year']}, 1]}
										]},
										{'$add': [{'$subtract': ['$$end_date.year', '$$start_date.year']}, 1]}
									]},
									{'$subtract': ['$$end_date.year', '$$start_date.year']}
								]
							}},
							{
								'case': {'$gt': ['$$end_date.month', '$$start_date.month']},
								'then': {'$add': [{'$subtract': ['$$end_date.year', '$$start_date.year']}, 1]}
							}
						], 'default': {'$subtract': ['$$end_date.year', '$$start_date.year']}}
					}}}
				}
			}
		elif operator == ComputedLiteralOperator.MONTH_DIFF:
			return build_date_diff(documents, literal, 'month')
		elif operator == ComputedLiteralOperator.DAY_DIFF:
			return build_date_diff(documents, literal, 'day')
		elif operator == ComputedLiteralOperator.MOVE_DATE:
			move_to_pattern = parse_move_date_pattern(literal.elements[1])
			literal = build_literal(documents, literal.elements[0])
			movements = ArrayHelper(move_to_pattern).map(lambda x: [x[0], x[1], int(x[2])]).to_list()

			def build_variables() -> dict:
				return {
					'l_year': {'$eq': [{'$arrayElemAt': ['$$this', 0]}, 'Y']},
					'l_month': {'$eq': [{'$arrayElemAt': ['$$this', 0]}, 'M']},
					'l_day': {'$eq': [{'$arrayElemAt': ['$$this', 0]}, 'D']},
					'l_hour': {'$eq': [{'$arrayElemAt': ['$$this', 0]}, 'h']},
					'l_minute': {'$eq': [{'$arrayElemAt': ['$$this', 0]}, 'm']},
					'l_second': {'$eq': [{'$arrayElemAt': ['$$this', 0]}, 's']},
					# command is empty, set value
					'c_set': {'$eq': [{'$arrayElemAt': ['$$this', 1]}, '']},
					# command is plus, add value
					'c_add': {'$eq': [{'$arrayElemAt': ['$$this', 1]}, '+']},
					# command is minus, subtract value
					'c_sub': {'$eq': [{'$arrayElemAt': ['$$this', 1]}, '-']},
					# value, integer
					'v': {'$arrayElemAt': ['$$this', 2]},
					'o_year': {'$year': '$$value'},
					'o_month': {'$month': '$$value'},
					'o_day': {'$dayOfMonth': '$$value'},
					'o_hour': {'$hour': '$$value'},
					'o_minute': {'$minute': '$$value'},
					'o_second': {'$second': '$$value'}
				}

			def parse_date(replaced: dict, is_set: bool = False) -> dict:
				if is_set:
					if replaced.get('year') is not None:
						# min of exactly date or last day of month
						return {
							'$min': [
								parse_date({
									'year': replaced.get('year'), 'month': {'$add': ['$$o_month', 1]},
									'day': 0, 'hour': '$$o_hour', 'minute': '$$o_minute', 'second': '$$o_second'
								}),
								parse_date(replaced)
							]
						}
					elif replaced.get('month') is not None:
						# min of exactly date or last day of month
						return {
							'$min': [
								parse_date({
									'year': '$$o_year',
									'month': {'$add': [{'$min': [12, {'$max': [1, replaced.get('month')]}]}, 1]},
									'day': 0, 'hour': '$$o_hour', 'minute': '$$o_minute', 'second': '$$o_second'
								}),
								parse_date({'month': {'$min': [12, {'$max': [1, replaced.get('month')]}]}})
							]
						}
					elif replaced.get('day') is not None:
						# min of exactly date or last day of month
						return {
							'$min': [
								parse_date({
									'year': '$$o_year', 'month': {'$add': ['$$o_month', 1]},
									'day': 0, 'hour': '$$o_hour', 'minute': '$$o_minute', 'second': '$$o_second'
								}),
								parse_date({'day': {'$min': [31, {'$max': [1, replaced.get('day')]}]}})
							]
						}
					elif replaced.get('hour') is not None:
						return parse_date({'hour': {'$min': [23, {'$max': [0, replaced.get('hour')]}]}})
					elif replaced.get('minute') is not None:
						return parse_date({'minute': {'$min': [59, {'$max': [0, replaced.get('minute')]}]}})
					elif replaced.get('second') is not None:
						return parse_date({'second': {'$min': [59, {'$max': [0, replaced.get('second')]}]}})
					else:
						raise UnexpectedStorageException(f'Move date to {replaced} is not supported.')
				else:
					# add or subtract, just do it
					return {
						'$dateFromParts': {
							'year': replaced.get('year') or '$$o_year',
							'month': replaced.get('month') or '$$o_month',
							'day': replaced.get('day') or '$$o_day',
							'hour': replaced.get('hour') or '$$o_hour',
							'minute': replaced.get('minute') or '$$o_minute',
							'second': replaced.get('second') or '$$o_second'
						}
					}

			def branch(loc: str) -> dict:
				return {
					'case': f'$$l_{loc}',
					'then': {
						'$switch': {
							'branches': [
								{'case': '$$c_set', 'then': parse_date({loc: '$$v'}, True)},
								{'case': '$$c_add', 'then': parse_date({loc: {'$add': [f'$$o_{loc}', '$$v']}})},
								{'case': '$$c_sub', 'then': parse_date({loc: {'$subtract': [f'$$o_{loc}', '$$v']}})}
							],
							'default': '$$value'
						}
					}
				}

			def branches() -> List[dict]:
				return ArrayHelper(['year', 'month', 'day', 'hour', 'minute', 'second']).map(branch).to_list()

			return {
				'$reduce': {
					'input': movements,
					'initialValue': literal,
					'in': {
						'$let': {
							'vars': build_variables(),
							'in': {'$switch': {'branches': branches(), 'default': '$$value'}}
						}
					}
				}
			}
		elif operator == ComputedLiteralOperator.FORMAT_DATE:
			# noinspection SpellCheckingInspection
			return {
				'$let': {
					'vars': {
						'date': build_literal(documents, literal.elements[0]),
						'format': build_literal(documents, literal.elements[1]),
						'day_of_week_names': [
							'', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
						'day_of_week_abbr_names': ['', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sun'],
						'month_names': [
							'', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September',
							'October', 'November', 'December'
						],
						'month_abbr_names': [
							'', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
					},
					'in': {
						'$let': {
							'vars': {
								'parts': {'$dateToParts': {'date': '$$date'}},
								'day_of_week': {'$dayOfWeek': '$$date'},
								'format_chars': {
									'$map': {
										'input': {'$range': [0, {'$strLenCP': '$$format'}]},
										'in': {'$substrCP': ['$$format', '$$this', 1]}
									}
								}
							},
							'in': {
								'$let': {
									'vars': {
										'formatted': [
											{'$toString': '$$parts.year'},  # Y, 4 digits year
											{'$substrCP': [{'$toString': '$$parts.year'}, 2, 2]},  # y, 2 digits year
											{'$cond': [  # M, 2 digits month
												{'$lt': ['$$parts.month', 10]},
												{'$concat': ['0', {'$toString': '$$parts.month'}]},
												{'$toString': '$$parts.month'}]},
											{'$cond': [  # D, 2 digits day of month
												{'$lt': ['$$parts.day', 10]},
												{'$concat': ['0', {'$toString': '$$parts.day'}]},
												{'$toString': '$$parts.day'}]},
											{'$cond': [  # h, 2 digits hour, 00 - 23
												{'$lt': ['$$parts.hour', 10]},
												{'$concat': ['0', {'$toString': '$$parts.hour'}]},
												{'$toString': '$$parts.hour'}]},
											{'$switch': {'branches': [  # H, 2 digits hour, 01 - 12
												{'case': {'$eq': ['$$parts.hour', 0]}, 'then': '12'},
												{
													'case': {'$lt': ['$$parts.hour', 10]},
													'then': {'$concat': ['0', {'$toString': '$$parts.hour'}]}
												},
												{'case': {'$eq': ['$$parts.hour', 0]}, 'then': '12'},
												{
													'case': {'$lt': ['$$parts.hour', 22]},
													'then': {'$concat': [
														'0',
														{'$toString': {'$subtract': ['$$parts.hour', 12]}}
													]}
												}
											], 'default': {'$toString': {'$subtract': ['$$parts.hour', 12]}}}},
											{'$cond': [  # m, 2 digits minute
												{'$lt': ['$$parts.minute', 10]},
												{'$concat': ['0', {'$toString': '$$parts.minute'}]},
												{'$toString': '$$parts.minute'}]},
											{'$cond': [  # s, 2 digits second
												{'$lt': ['$$parts.second', 10]},
												{'$concat': ['0', {'$toString': '$$parts.second'}]},
												{'$toString': '$$parts.second'}]},
											# W, Monday - Sunday
											{'$arrayElemAt': ['$$day_of_week_names', '$$day_of_week']},
											# w, Mon - Sun
											{'$arrayElemAt': ['$$day_of_week_abbr_names', '$$day_of_week']},
											# B, January - December
											{'$arrayElemAt': ['$$month_names', '$$parts.month']},
											# b, Jan - Dec
											{'$arrayElemAt': ['$$month_abbr_names', '$$parts.month']},
											# p, AM/PM
											{'$cond': [{'$lt': ['$$parts.hour', 12]}, 'AM', 'PM']}
										],
										'exchange_index': [
											'Y', 'y', 'M', 'D', 'h', 'H', 'm', 's', 'W', 'w', 'B', 'b', 'p']
									},
									'in': {
										'$reduce': {
											'input:': {
												'$map': {
													'input': '$$format_chars',
													'as': 'ch',
													'in': {
														'$let': {
															'vars': {'idx': {
																'$indexOfArray': ['$$exchange_index', '$$ch']
															}},
															'in': {'$cond': [
																{'$eq': ['$$idx', -1]},
																'$$ch',
																{'$arrayElemAt': ['$$formatted', '$$idx']}
															]}
														}
													}
												}
											},
											'initialValue': '',
											'in': {'$concat': ["$$value", "$$this"]}
										}
									}
								}
							}
						}
					}
				}
			}
		elif operator == ComputedLiteralOperator.CHAR_LENGTH:
			return {'$strLenCP': {'$ifNull': [build_literal(documents, literal.elements[0]), '']}}
		else:
			raise UnsupportedComputationException(f'Unsupported computation operator[{operator}].')
	elif isinstance(literal, datetime):
		# noinspection PyTypeChecker
		return literal
	elif isinstance(literal, date):
		# noinspection PyTypeChecker
		return literal
	elif isinstance(literal, time):
		# noinspection PyTypeChecker
		return literal
	elif build_plain_value is not None:
		return build_plain_value(literal)
	elif isinstance(literal, str):
		# a value, return itself
		return literal
	else:
		# noinspection PyTypeChecker
		return literal


# noinspection DuplicatedCode
def build_criteria_expression(documents: List[MongoDocument], expression: EntityCriteriaExpression) -> Dict[str, Any]:
	op = expression.operator
	if op == EntityCriteriaOperator.IS_EMPTY:
		return {'$eq': [{'$ifNull': [build_literal(documents, expression.left), 'not-exists']}, 'not-exists']}
	elif op == EntityCriteriaOperator.IS_NOT_EMPTY:
		return {'$ne': [{'$ifNull': [build_literal(documents, expression.left), 'not-exists']}, 'not-exists']}
	elif op == EntityCriteriaOperator.IS_BLANK:
		built = build_literal(documents, expression.left)
		return {'$or': [
			{'$eq': [{'$ifNull': [built, 'not-exists']}, 'not-exists']},
			{'$eq': [{'$strLenCP': {'$trim': {'input': built}}}, 0]}
		]}
	elif op == EntityCriteriaOperator.IS_NOT_BLANK:
		built = build_literal(documents, expression.left)
		return {'$and': [
			{'$ne': [{'$ifNull': [built, 'not-exists']}, 'not-exists']},
			{'$ne': [{'$strLenCP': {'$trim': {'input': built}}}, 0]}
		]}

	if op == EntityCriteriaOperator.IN or op == EntityCriteriaOperator.NOT_IN:
		if isinstance(expression.right, ColumnNameLiteral):
			raise UnsupportedCriteriaException('In or not-in criteria expression on another column is not supported.')
		elif isinstance(expression.right, ComputedLiteral):
			if expression.right.operator == ComputedLiteralOperator.CASE_THEN:
				# TODO cannot know whether the built literal will returns a list or a value, let it be now.
				built_right = build_literal(documents, expression.right)
			else:
				# any other computation will not lead a list
				built_right = [build_literal(documents, expression.right)]
		elif isinstance(expression.right, str):
			built_right = ArrayHelper(expression.right.strip().split(',')).filter(lambda x: is_not_blank(x)).to_list()
		else:
			built_right = build_literal(documents, expression.right)
			if not isinstance(built_right, list):
				built_right = [built_right]
		if op == EntityCriteriaOperator.IN:
			return {'$in': [build_literal(documents, expression.left), built_right]}
		elif op == EntityCriteriaOperator.NOT_IN:
			return {'$not': {'$in': [build_literal(documents, expression.left), built_right]}}

	built_left = build_literal(documents, expression.left)
	built_right = build_literal(documents, expression.right)
	if op == EntityCriteriaOperator.EQUALS:
		return {'$eq': [built_left, built_right]}
	elif op == EntityCriteriaOperator.NOT_EQUALS:
		return {'$ne': [built_left, built_right]}
	elif op == EntityCriteriaOperator.LESS_THAN:
		return {'$lt': [built_left, built_right]}
	elif op == EntityCriteriaOperator.LESS_THAN_OR_EQUALS:
		return {'$lte': [built_left, built_right]}
	elif op == EntityCriteriaOperator.GREATER_THAN:
		return {'$gt': [built_left, built_right]}
	elif op == EntityCriteriaOperator.GREATER_THAN_OR_EQUALS:
		return {'$gte': [built_left, built_right]}
	elif op == EntityCriteriaOperator.LIKE:
		return {'$regexMatch': {'input': built_left, 'regex': built_right}}
	elif op == EntityCriteriaOperator.NOT_LIKE:
		return {'$not': {'$regexMatch': {'input': built_left, 'regex': built_right}}}
	else:
		raise UnsupportedCriteriaException(f'Unsupported criteria expression operator[{op}].')


def build_criteria_joint(documents: List[MongoDocument], joint: EntityCriteriaJoint) -> Dict[str, any]:
	conjunction = joint.conjunction
	if conjunction == EntityCriteriaJointConjunction.AND:
		return {'$and': ArrayHelper(joint.children).map(lambda x: build_criteria_statement(documents, x)).to_list()}
	elif conjunction == EntityCriteriaJointConjunction.OR:
		return {'$or': ArrayHelper(joint.children).map(lambda x: build_criteria_statement(documents, x)).to_list()}
	else:
		raise UnsupportedCriteriaException(f'Unsupported criteria joint conjunction[{conjunction}].')


def build_criteria_statement(documents: List[MongoDocument], statement: EntityCriteriaStatement):
	if isinstance(statement, EntityCriteriaExpression):
		return build_criteria_expression(documents, statement)
	elif isinstance(statement, EntityCriteriaJoint):
		return build_criteria_joint(documents, statement)
	else:
		raise UnsupportedCriteriaException(f'Unsupported criteria[{statement}].')


def build_criteria(documents: List[MongoDocument], criteria: EntityCriteria) -> Optional[Dict[str, Any]]:
	if criteria is None or len(criteria) == 0:
		return None

	if len(criteria) == 1:
		return build_criteria_statement(documents, criteria[0])
	else:
		return build_criteria_statement(documents, EntityCriteriaJoint(children=criteria))


def build_criteria_for_statement(
		documents: List[MongoDocument], criteria: EntityCriteria,
		raise_exception_on_missed: bool = False
) -> Optional[Dict[str, Any]]:
	where = build_criteria(documents, criteria)
	if where is not None:
		return where
	elif raise_exception_on_missed:
		raise NoCriteriaForUpdateException(f'No criteria found from[{criteria}].')
	else:
		return None
