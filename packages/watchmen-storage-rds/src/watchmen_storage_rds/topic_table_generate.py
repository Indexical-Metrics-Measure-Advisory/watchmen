from typing import List  # noqa

from sqlalchemy import Column, Date, DateTime, DECIMAL, Integer, String, Table, Time

from watchmen_model.admin import Factor, FactorType, Topic, TopicKind
from watchmen_model.pipeline_kernel import TopicDataColumnNames
from watchmen_storage import as_table_name, UnexpectedStorageException
from watchmen_utilities import ArrayHelper, is_blank
from .table_defs_helper import create_bool, create_datetime, create_int, create_json, create_pk, \
	create_tuple_id_column, meta_data


def create_column(factor: Factor) -> Column:
	factor_name = '' if is_blank(factor.name) else factor.name.strip().lower()
	factor_type = factor.type
	if factor_type == FactorType.SEQUENCE:
		return Column(factor_name, Integer, nullable=True)
	elif factor_type == FactorType.NUMBER:
		return Column(factor_name, DECIMAL, nullable=True)
	elif factor_type == FactorType.UNSIGNED:
		return Column(factor_name, DECIMAL, nullable=True)
	elif factor_type == FactorType.TEXT:
		return Column(factor_name, String, nullable=True)
	elif factor_type == FactorType.ADDRESS:
		return Column(factor_name, String, nullable=True)
	elif factor_type == FactorType.CONTINENT:
		return Column(factor_name, String, nullable=True)
	elif factor_type == FactorType.REGION:
		return Column(factor_name, String, nullable=True)
	elif factor_type == FactorType.COUNTRY:
		return Column(factor_name, String, nullable=True)
	elif factor_type == FactorType.PROVINCE:
		return Column(factor_name, String, nullable=True)
	elif factor_type == FactorType.CITY:
		return Column(factor_name, String, nullable=True)
	elif factor_type == FactorType.DISTRICT:
		return Column(factor_name, String, nullable=True)
	elif factor_type == FactorType.ROAD:
		return Column(factor_name, String, nullable=True)
	elif factor_type == FactorType.COMMUNITY:
		return Column(factor_name, String, nullable=True)
	elif factor_type == FactorType.FLOOR:
		return Column(factor_name, DECIMAL, nullable=True)
	elif factor_type == FactorType.RESIDENCE_TYPE:
		return Column(factor_name, String, nullable=True)
	elif factor_type == FactorType.RESIDENTIAL_AREA:
		return Column(factor_name, DECIMAL, nullable=True)
	elif factor_type == FactorType.EMAIL:
		return Column(factor_name, String, nullable=True)
	elif factor_type == FactorType.PHONE:
		return Column(factor_name, String, nullable=True)
	elif factor_type == FactorType.MOBILE:
		return Column(factor_name, String, nullable=True)
	elif factor_type == FactorType.FAX:
		return Column(factor_name, String, nullable=True)
	elif factor_type == FactorType.DATETIME:
		return Column(factor_name, DateTime, nullable=True)
	elif factor_type == FactorType.FULL_DATETIME:
		return Column(factor_name, DateTime, nullable=True)
	elif factor_type == FactorType.DATE:
		return Column(factor_name, Date, nullable=True)
	elif factor_type == FactorType.TIME:
		return Column(factor_name, Time, nullable=True)
	elif factor_type == FactorType.YEAR:
		return Column(factor_name, Integer, nullable=True)
	elif factor_type == FactorType.HALF_YEAR:
		return Column(factor_name, Integer, nullable=True)
	elif factor_type == FactorType.QUARTER:
		return Column(factor_name, Integer, nullable=True)
	elif factor_type == FactorType.MONTH:
		return Column(factor_name, Integer, nullable=True)
	elif factor_type == FactorType.HALF_MONTH:
		return Column(factor_name, Integer, nullable=True)
	elif factor_type == FactorType.TEN_DAYS:
		return Column(factor_name, Integer, nullable=True)
	elif factor_type == FactorType.WEEK_OF_YEAR:
		return Column(factor_name, Integer, nullable=True)
	elif factor_type == FactorType.WEEK_OF_MONTH:
		return Column(factor_name, Integer, nullable=True)
	elif factor_type == FactorType.HALF_WEEK:
		return Column(factor_name, Integer, nullable=True)
	elif factor_type == FactorType.DAY_OF_MONTH:
		return Column(factor_name, Integer, nullable=True)
	elif factor_type == FactorType.DAY_OF_WEEK:
		return Column(factor_name, Integer, nullable=True)
	elif factor_type == FactorType.DAY_KIND:
		return Column(factor_name, Integer, nullable=True)
	elif factor_type == FactorType.HOUR:
		return Column(factor_name, Integer, nullable=True)
	elif factor_type == FactorType.HOUR_KIND:
		return Column(factor_name, Integer, nullable=True)
	elif factor_type == FactorType.MINUTE:
		return Column(factor_name, Integer, nullable=True)
	elif factor_type == FactorType.SECOND:
		return Column(factor_name, Integer, nullable=True)
	elif factor_type == FactorType.MILLISECOND:
		return Column(factor_name, Integer, nullable=True)
	elif factor_type == FactorType.AM_PM:
		return Column(factor_name, Integer, nullable=True)
	elif factor_type == FactorType.GENDER:
		return Column(factor_name, String, nullable=True)
	elif factor_type == FactorType.OCCUPATION:
		return Column(factor_name, String, nullable=True)
	elif factor_type == FactorType.DATE_OF_BIRTH:
		return Column(factor_name, DateTime, nullable=True)
	elif factor_type == FactorType.AGE:
		return Column(factor_name, Integer, nullable=True)
	elif factor_type == FactorType.ID_NO:
		return Column(factor_name, String, nullable=True)
	elif factor_type == FactorType.RELIGION:
		return Column(factor_name, String, nullable=True)
	elif factor_type == FactorType.NATIONALITY:
		return Column(factor_name, String, nullable=True)
	elif factor_type == FactorType.BIZ_TRADE:
		return Column(factor_name, String, nullable=True)
	elif factor_type == FactorType.BIZ_SCALE:
		return Column(factor_name, DECIMAL, nullable=True)
	elif factor_type == FactorType.BOOLEAN:
		return create_bool(factor_name)
	elif factor_type == FactorType.ENUM:
		return Column(factor_name, String, nullable=True)
	elif factor_type == FactorType.OBJECT or factor_type == FactorType.ARRAY:
		return create_json(factor_name)
	else:
		raise UnexpectedStorageException(f'Factor type[{factor_type}] is not supported.')


def create_columns(factors: List[Factor]) -> List[Column]:
	return ArrayHelper(factors).map(lambda x: create_column(x)).to_list()


def build_by_raw(topic: Topic) -> Table:
	if topic.kind == TopicKind.SYNONYM:
		# all factors at top level will be mapped to column
		columns = create_columns(ArrayHelper(topic.factors).filter(lambda x: '.' not in x.name).to_list())
	else:
		columns = [
			create_pk(TopicDataColumnNames.ID.value, Integer),
			*create_columns(ArrayHelper(topic.factors).filter(lambda x: x.flatten).to_list()),
			create_json(TopicDataColumnNames.RAW_TOPIC_DATA.value),
			create_tuple_id_column(TopicDataColumnNames.TENANT_ID.value, nullable=False),
			create_datetime(TopicDataColumnNames.INSERT_TIME.value, nullable=False),
			create_datetime(TopicDataColumnNames.UPDATE_TIME.value, nullable=False)
		]

	return Table(
		as_table_name(topic), meta_data,
		*columns,
		extend_existing=True, include_columns=ArrayHelper(columns).map(lambda x: x.name).to_list()
	)


def build_by_aggregation(topic: Topic) -> Table:
	if topic.kind == TopicKind.SYNONYM:
		columns = create_columns(topic.factors)
	else:
		columns = [
			create_pk(TopicDataColumnNames.ID.value, Integer),
			*create_columns(topic.factors),
			create_json(TopicDataColumnNames.AGGREGATE_ASSIST.value),
			create_tuple_id_column(TopicDataColumnNames.TENANT_ID.value, nullable=False),
			create_int(TopicDataColumnNames.VERSION.value),
			create_datetime(TopicDataColumnNames.INSERT_TIME.value, nullable=False),
			create_datetime(TopicDataColumnNames.UPDATE_TIME.value, nullable=False)
		]

	return Table(
		as_table_name(topic), meta_data,
		*columns,
		extend_existing=True, include_columns=ArrayHelper(columns).map(lambda x: x.name).to_list()
	)


def build_by_regular(topic: Topic) -> Table:
	if topic.kind == TopicKind.SYNONYM:
		columns = create_columns(topic.factors)
	else:
		columns = [
			create_pk(TopicDataColumnNames.ID.value, Integer),
			*create_columns(topic.factors),
			create_tuple_id_column(TopicDataColumnNames.TENANT_ID.value, nullable=False),
			create_datetime(TopicDataColumnNames.INSERT_TIME.value, nullable=False),
			create_datetime(TopicDataColumnNames.UPDATE_TIME.value, nullable=False)
		]

	return Table(
		as_table_name(topic), meta_data,
		*columns,
		extend_existing=True, include_columns=ArrayHelper(columns).map(lambda x: x.name).to_list()
	)
