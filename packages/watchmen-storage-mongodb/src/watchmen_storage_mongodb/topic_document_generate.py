from typing import List  # noqa

from watchmen_model.admin import Factor, FactorType, is_aggregation_topic, is_raw_topic, Topic, TopicKind
from watchmen_model.common import DataModel
from watchmen_model.pipeline_kernel import TopicDataColumnNames
from watchmen_storage import as_table_name, ask_decimal_fraction_digits, ask_decimal_integral_digits, \
	UnexpectedStorageException
from watchmen_utilities import ArrayHelper, is_blank
from .document_defs_helper import create_bool, create_datetime, create_int, create_json, create_pk, \
	create_tuple_id_column
from .document_mongo import MongoDocument, MongoDocumentColumn, MongoDocumentColumnType


def create_column(factor: Factor) -> MongoDocumentColumn:
	factor_name = '' if is_blank(factor.name) else factor.name.strip().lower()
	factor_type = factor.type
	if factor_type == FactorType.SEQUENCE:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.NUMBER, nullable=True)
	elif factor_type == FactorType.NUMBER:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.NUMBER, nullable=True)
	elif factor_type == FactorType.UNSIGNED:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.NUMBER, nullable=True)
	elif factor_type == FactorType.TEXT:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.STRING, nullable=True)
	elif factor_type == FactorType.ADDRESS:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.STRING, nullable=True)
	elif factor_type == FactorType.CONTINENT:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.STRING, nullable=True)
	elif factor_type == FactorType.REGION:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.STRING, nullable=True)
	elif factor_type == FactorType.COUNTRY:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.STRING, nullable=True)
	elif factor_type == FactorType.PROVINCE:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.STRING, nullable=True)
	elif factor_type == FactorType.CITY:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.STRING, nullable=True)
	elif factor_type == FactorType.DISTRICT:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.STRING, nullable=True)
	elif factor_type == FactorType.ROAD:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.STRING, nullable=True)
	elif factor_type == FactorType.COMMUNITY:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.STRING, nullable=True)
	elif factor_type == FactorType.FLOOR:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.NUMBER, nullable=True)
	elif factor_type == FactorType.RESIDENCE_TYPE:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.STRING, nullable=True)
	elif factor_type == FactorType.RESIDENTIAL_AREA:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.NUMBER, nullable=True)
	elif factor_type == FactorType.EMAIL:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.STRING, nullable=True)
	elif factor_type == FactorType.PHONE:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.STRING, nullable=True)
	elif factor_type == FactorType.MOBILE:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.STRING, nullable=True)
	elif factor_type == FactorType.FAX:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.STRING, nullable=True)
	elif factor_type == FactorType.DATETIME:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.DATETIME, nullable=True)
	elif factor_type == FactorType.FULL_DATETIME:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.DATETIME, nullable=True)
	elif factor_type == FactorType.DATE:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.DATE, nullable=True)
	elif factor_type == FactorType.TIME:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.TIME, nullable=True)
	elif factor_type == FactorType.YEAR:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.NUMBER, nullable=True)
	elif factor_type == FactorType.HALF_YEAR:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.NUMBER, nullable=True)
	elif factor_type == FactorType.QUARTER:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.NUMBER, nullable=True)
	elif factor_type == FactorType.MONTH:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.NUMBER, nullable=True)
	elif factor_type == FactorType.HALF_MONTH:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.NUMBER, nullable=True)
	elif factor_type == FactorType.TEN_DAYS:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.NUMBER, nullable=True)
	elif factor_type == FactorType.WEEK_OF_YEAR:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.NUMBER, nullable=True)
	elif factor_type == FactorType.WEEK_OF_MONTH:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.NUMBER, nullable=True)
	elif factor_type == FactorType.HALF_WEEK:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.NUMBER, nullable=True)
	elif factor_type == FactorType.DAY_OF_MONTH:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.NUMBER, nullable=True)
	elif factor_type == FactorType.DAY_OF_WEEK:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.NUMBER, nullable=True)
	elif factor_type == FactorType.DAY_KIND:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.NUMBER, nullable=True)
	elif factor_type == FactorType.HOUR:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.NUMBER, nullable=True)
	elif factor_type == FactorType.HOUR_KIND:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.NUMBER, nullable=True)
	elif factor_type == FactorType.MINUTE:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.NUMBER, nullable=True)
	elif factor_type == FactorType.SECOND:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.NUMBER, nullable=True)
	elif factor_type == FactorType.MILLISECOND:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.NUMBER, nullable=True)
	elif factor_type == FactorType.AM_PM:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.NUMBER, nullable=True)
	elif factor_type == FactorType.GENDER:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.STRING, nullable=True)
	elif factor_type == FactorType.OCCUPATION:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.STRING, nullable=True)
	elif factor_type == FactorType.DATE_OF_BIRTH:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.DATETIME, nullable=True)
	elif factor_type == FactorType.AGE:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.NUMBER, nullable=True)
	elif factor_type == FactorType.ID_NO:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.STRING, nullable=True)
	elif factor_type == FactorType.RELIGION:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.STRING, nullable=True)
	elif factor_type == FactorType.NATIONALITY:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.STRING, nullable=True)
	elif factor_type == FactorType.BIZ_TRADE:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.STRING, nullable=True)
	elif factor_type == FactorType.BIZ_SCALE:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.NUMBER, nullable=True)
	elif factor_type == FactorType.BOOLEAN:
		return create_bool(factor_name)
	elif factor_type == FactorType.ENUM:
		return MongoDocumentColumn(factor_name, MongoDocumentColumnType.STRING, nullable=True)
	elif factor_type == FactorType.OBJECT or factor_type == FactorType.ARRAY:
		return create_json(factor_name)
	else:
		raise UnexpectedStorageException(f'Factor type[{factor_type}] is not supported.')


def create_columns(factors: List[Factor]) -> List[MongoDocumentColumn]:
	return ArrayHelper(factors).map(lambda x: create_column(x)).to_list()


def build_by_raw(topic: Topic) -> MongoDocument:
	if topic.kind == TopicKind.SYNONYM:
		return MongoDocument(
			name=as_table_name(topic),
			columns=create_columns(ArrayHelper(topic.factors).filter(lambda x: '.' not in x.name).to_list())
		)
	else:
		return MongoDocument(
			name=as_table_name(topic),
			columns=[
				create_pk(TopicDataColumnNames.ID.value),
				*create_columns(ArrayHelper(topic.factors).filter(lambda x: x.flatten).to_list()),
				create_json(TopicDataColumnNames.RAW_TOPIC_DATA.value),
				create_tuple_id_column(TopicDataColumnNames.TENANT_ID.value, nullable=False),
				create_datetime(TopicDataColumnNames.INSERT_TIME.value, nullable=False),
				create_datetime(TopicDataColumnNames.UPDATE_TIME.value, nullable=False),
			]
		)


def build_by_aggregation(topic: Topic) -> MongoDocument:
	if topic.kind == TopicKind.SYNONYM:
		return MongoDocument(
			name=as_table_name(topic),
			columns=create_columns(topic.factors)
		)
	else:
		return MongoDocument(
			name=as_table_name(topic),
			columns=[
				create_pk(TopicDataColumnNames.ID.value),
				*create_columns(topic.factors),
				create_json(TopicDataColumnNames.AGGREGATE_ASSIST.value),
				create_tuple_id_column(TopicDataColumnNames.TENANT_ID.value, nullable=False),
				create_int(TopicDataColumnNames.VERSION.value),
				create_datetime(TopicDataColumnNames.INSERT_TIME.value, nullable=False),
				create_datetime(TopicDataColumnNames.UPDATE_TIME.value, nullable=False)
			]
		)


def build_by_regular(topic: Topic) -> MongoDocument:
	if topic.kind == TopicKind.SYNONYM:
		return MongoDocument(
			name=as_table_name(topic),
			columns=create_columns(topic.factors)
		)
	else:
		return MongoDocument(
			name=as_table_name(topic),
			columns=[
				create_pk(TopicDataColumnNames.ID.value),
				*create_columns(topic.factors),
				create_tuple_id_column(TopicDataColumnNames.TENANT_ID.value, nullable=False),
				create_datetime(TopicDataColumnNames.INSERT_TIME.value, nullable=False),
				create_datetime(TopicDataColumnNames.UPDATE_TIME.value, nullable=False)
			]
		)


def build_to_document(topic: Topic) -> MongoDocument:
	if is_raw_topic(topic):
		return build_by_raw(topic)
	elif is_aggregation_topic(topic):
		return build_by_aggregation(topic)
	else:
		return build_by_regular(topic)


class TrinoField(DataModel):
	name: str
	type: str
	hidden: bool = False


def to_trino_type(column_type: MongoDocumentColumnType) -> str:
	if column_type == MongoDocumentColumnType.ID:
		return 'ObjectId'
	elif column_type == MongoDocumentColumnType.STRING:
		return 'varchar'
	elif column_type == MongoDocumentColumnType.NUMBER:
		decimal_integral_digits = ask_decimal_integral_digits()
		decimal_fraction_digits = ask_decimal_fraction_digits()
		return f'decimal({decimal_integral_digits}, {decimal_fraction_digits})'
	elif column_type == MongoDocumentColumnType.BOOLEAN:
		return 'boolean'
	elif column_type == MongoDocumentColumnType.DATE:
		return 'date'
	elif column_type == MongoDocumentColumnType.TIME:
		return 'time'
	elif column_type == MongoDocumentColumnType.DATETIME:
		return 'timestamp'
	elif column_type == MongoDocumentColumnType.OBJECT:
		return 'json'
	else:
		raise UnexpectedStorageException(f'Column type[{column_type}] is not supported in trino.')


def to_trino_field(column: MongoDocumentColumn) -> TrinoField:
	return TrinoField(
		name=column.name,
		type=to_trino_type(column.columnType),
		hidden=True if column.name == '_id' else False
	)


def build_to_trino_fields(topic: Topic) -> List[TrinoField]:
	document = build_to_document(topic)
	return ArrayHelper(document.columns).map(lambda x: to_trino_field(x)).to_list()
