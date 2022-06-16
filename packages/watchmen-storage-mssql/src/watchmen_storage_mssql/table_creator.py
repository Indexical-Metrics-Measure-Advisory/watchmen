from typing import Callable, Dict, List, Optional, Tuple, Union

from watchmen_model.admin import Factor, FactorType, is_aggregation_topic, is_raw_topic, Topic
from watchmen_storage import as_table_name
from watchmen_utilities import ArrayHelper, is_blank, is_not_blank


# noinspection DuplicatedCode
def ask_column_name(factor: Factor) -> str:
	return factor.name.strip().lower().replace('.', '_').replace('-', '_').replace(' ', '_')


def varchar_column(precision: str) -> str:
	return f'NVARCHAR({precision})'


def varchar_10(precision: Optional[str] = '10') -> str:
	return varchar_column('10' if is_blank(precision) else precision)


def varchar_20(precision: Optional[str] = '20') -> str:
	return varchar_column('20' if is_blank(precision) else precision)


def varchar_50(precision: Optional[str] = '50') -> str:
	return varchar_column('50' if is_blank(precision) else precision)


def varchar_100(precision: Optional[str] = '100') -> str:
	return varchar_column('100' if is_blank(precision) else precision)


def varchar_255(precision: Optional[str] = '255') -> str:
	return varchar_column('255' if is_blank(precision) else precision)


def decimal_column(precision: str) -> str:
	return f'DECIMAL({precision})'


def decimal_10_2(precision: Optional[str] = '10,2') -> str:
	return decimal_column('10,2' if is_blank(precision) else precision)


def decimal_32_6(precision: Optional[str] = '32,6') -> str:
	return decimal_column('32,6' if is_blank(precision) else precision)


FactorTypeMap: Dict[FactorType, Union[str, Callable[[Optional[str]], str]]] = {
	FactorType.SEQUENCE: 'DECIMAL(20)',

	FactorType.NUMBER: decimal_32_6,
	FactorType.UNSIGNED: decimal_32_6,

	FactorType.TEXT: varchar_255,

	# address
	FactorType.ADDRESS: 'NVARCHAR(1024)',
	FactorType.CONTINENT: varchar_10,
	FactorType.REGION: varchar_10,
	FactorType.COUNTRY: varchar_10,
	FactorType.PROVINCE: varchar_10,
	FactorType.CITY: varchar_10,
	FactorType.DISTRICT: varchar_255,
	FactorType.ROAD: varchar_255,
	FactorType.COMMUNITY: varchar_100,
	FactorType.FLOOR: 'DECIMAL(5)',
	FactorType.RESIDENCE_TYPE: varchar_10,
	FactorType.RESIDENTIAL_AREA: decimal_10_2,

	# contact electronic
	FactorType.EMAIL: varchar_100,
	FactorType.PHONE: varchar_50,
	FactorType.MOBILE: varchar_50,
	FactorType.FAX: varchar_50,

	# date time related
	FactorType.DATETIME: 'DATETIME',
	FactorType.FULL_DATETIME: 'DATETIME',
	FactorType.DATE: 'DATE',
	FactorType.TIME: 'TIME',
	FactorType.YEAR: 'DECIMAL(5)',
	FactorType.HALF_YEAR: 'DECIMAL(3)',
	FactorType.QUARTER: 'DECIMAL(3)',
	FactorType.MONTH: 'DECIMAL(3)',
	FactorType.HALF_MONTH: 'DECIMAL(3)',
	FactorType.TEN_DAYS: 'DECIMAL(3)',
	FactorType.WEEK_OF_YEAR: 'DECIMAL(3)',
	FactorType.WEEK_OF_MONTH: 'DECIMAL(3)',
	FactorType.HALF_WEEK: 'DECIMAL(3)',
	FactorType.DAY_OF_MONTH: 'DECIMAL(3)',
	FactorType.DAY_OF_WEEK: 'DECIMAL(3)',
	FactorType.DAY_KIND: 'DECIMAL(3)',
	FactorType.HOUR: 'DECIMAL(3)',
	FactorType.HOUR_KIND: 'DECIMAL(3)',
	FactorType.MINUTE: 'DECIMAL(3)',
	FactorType.SECOND: 'DECIMAL(3)',
	FactorType.MILLISECOND: 'DECIMAL(3)',
	FactorType.AM_PM: 'DECIMAL(3)',

	# individual
	FactorType.GENDER: varchar_10,
	FactorType.OCCUPATION: varchar_10,
	FactorType.DATE_OF_BIRTH: 'DATE',
	FactorType.AGE: 'DECIMAL(5)',
	FactorType.ID_NO: varchar_50,
	FactorType.RELIGION: varchar_10,
	FactorType.NATIONALITY: varchar_10,

	# organization
	FactorType.BIZ_TRADE: varchar_10,
	FactorType.BIZ_SCALE: 'DECIMAL(9)',

	FactorType.BOOLEAN: 'TINYINT',

	FactorType.ENUM: varchar_20,

	FactorType.OBJECT: 'NVARCHAR(MAX)',
	FactorType.ARRAY: 'NVARCHAR(MAX)'
}


# noinspection DuplicatedCode
def ask_column_type(factor: Factor) -> str:
	column_type = FactorTypeMap.get(factor.type)
	if isinstance(column_type, str):
		return column_type
	elif is_blank(factor.precision):
		return column_type()
	else:
		return column_type(factor.precision.strip())


def build_columns(topic: Topic) -> str:
	if is_raw_topic(topic):
		flatten_factors = ArrayHelper(topic.factors) \
			.filter(lambda x: x.flatten) \
			.map(lambda x: f'\t{ask_column_name(x)} {ask_column_type(x)},') \
			.to_list()
		if len(flatten_factors) == 0:
			return '\tdata_ NVARCHAR(MAX),'
		else:
			return '\n'.join(flatten_factors) + '\n\tdata_ NVARCHAR(MAX),'
	else:
		return ArrayHelper(topic.factors) \
			.filter(lambda x: '.' not in x.name) \
			.map(lambda x: f'\t{ask_column_name(x)} {ask_column_type(x)},') \
			.join('\n')


# noinspection DuplicatedCode
def build_aggregate_assist_column(topic: Topic) -> str:
	return f'\taggregate_assist_ NVARCHAR(1024),' if is_aggregation_topic(topic) else ''


def build_version_column(topic: Topic) -> str:
	return f'\tversion_ DECIMAL(8),' if is_aggregation_topic(topic) else ''


# noinspection SqlResolve,DuplicatedCode
def build_columns_script(topic: Topic, original_topic: Topic) -> List[str]:
	entity_name = as_table_name(topic)
	original_factors: Dict[str, Factor] = ArrayHelper(original_topic.factors) \
		.to_map(lambda x: x.name.strip().lower(), lambda x: x)

	# noinspection SqlResolve
	def build_column_script(factor: Tuple[Factor, Optional[Factor]]) -> str:
		current_factor, original_factor = factor
		if original_factor is None:
			return f'ALTER TABLE {entity_name} ADD COLUMN {ask_column_name(factor[0])} {ask_column_type(factor[0])}'
		elif current_factor.flatten and not original_factor.flatten:
			return f'ALTER TABLE {entity_name} ADD COLUMN {ask_column_name(factor[0])} {ask_column_type(factor[0])}'
		else:
			return f'ALTER TABLE {entity_name} ALTER COLUMN {ask_column_name(factor[0])} {ask_column_type(factor[0])}'

	if is_raw_topic(topic):
		factors = ArrayHelper(topic.factors) \
			.filter(lambda x: x.flatten) \
			.to_list()
	else:
		factors = topic.factors

	columns = ArrayHelper(factors) \
		.map(lambda x: (x, original_factors.get(x.name.strip().lower()))) \
		.map(build_column_script) \
		.to_list()

	if is_raw_topic(topic) and not is_raw_topic(original_topic):
		columns.append(f'ALTER TABLE {entity_name} ADD COLUMN data_ NVARCHAR(MAX)')

	if is_aggregation_topic(topic) and not is_aggregation_topic(original_topic):
		columns.append(f'ALTER TABLE {entity_name} ADD COLUMN aggregate_assist_ NVARCHAR(1024)')
		columns.append(f'ALTER TABLE {entity_name} ADD COLUMN version_ DECIMAL(8)')

	return columns


# noinspection DuplicatedCode
def build_unique_indexes_script(topic: Topic) -> List[str]:
	index_groups: Dict[str, List[Factor]] = ArrayHelper(topic.factors) \
		.filter(lambda x: is_not_blank(x.indexGroup) and x.indexGroup.startswith('u-')) \
		.group_by(lambda x: x.indexGroup)

	# noinspection SqlResolve
	def build_unique_index(factors: List[Factor], index: int) -> str:
		return \
			f'CREATE UNIQUE INDEX u_{as_table_name(topic)}_{index + 1} ON {as_table_name(topic)} ' \
			f'({ArrayHelper(factors).map(lambda x: ask_column_name(x)).join(",")})'

	return ArrayHelper(list(index_groups.values())) \
		.map_with_index(lambda x, index: build_unique_index(x, index)).to_list()


def build_indexes_script(topic: Topic) -> List[str]:
	index_groups: Dict[str, List[Factor]] = ArrayHelper(topic.factors) \
		.filter(lambda x: is_not_blank(x.indexGroup) and x.indexGroup.startswith('i-')) \
		.group_by(lambda x: x.indexGroup)

	# noinspection SqlResolve
	def build_index(factors: List[Factor], index: int) -> str:
		return \
			f'CREATE INDEX i_{as_table_name(topic)}_{index + 1} ON {as_table_name(topic)} ' \
			f'({ArrayHelper(factors).map(lambda x: ask_column_name(x)).join(",")})'

	return ArrayHelper(list(index_groups.values())) \
		.map_with_index(lambda x, index: build_index(x, index)).to_list()
