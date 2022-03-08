from typing import Any, Dict, List

from pandas import DataFrame

from watchmen_model.admin import Factor, FactorType, Topic
from watchmen_model.pipeline_kernel import TopicDataColumnNames
from watchmen_utilities import ArrayHelper


def build_data_frame(rows: List[List[Any]], columns: List[str]) -> DataFrame:
	import pandas
	return pandas.DataFrame(rows, columns=columns)


def convert_to_pandas_type(factor_type: FactorType) -> str:
	if factor_type in [FactorType.NUMBER, FactorType.UNSIGNED, FactorType.SEQUENCE]:
		return 'float64'
	elif factor_type in [
		FactorType.YEAR, FactorType.HALF_YEAR, FactorType.QUARTER,
		FactorType.MONTH, FactorType.HALF_MONTH, FactorType.TEN_DAYS,
		FactorType.WEEK_OF_YEAR, FactorType.WEEK_OF_MONTH, FactorType.HALF_WEEK,
		FactorType.DAY_OF_MONTH, FactorType.DAY_OF_WEEK, FactorType.DAY_KIND,
		FactorType.HOUR, FactorType.HOUR_KIND, FactorType.MINUTE, FactorType.SECOND,
		FactorType.MILLISECOND, FactorType.AM_PM]:
		return 'float64'
	elif factor_type in [FactorType.FULL_DATETIME, FactorType.DATETIME, FactorType.DATE, FactorType.DATE_OF_BIRTH]:
		return 'datetime64'
	elif factor_type == FactorType.BOOLEAN:
		return 'bool'
	else:
		return 'object'


def convert_data_frame_type_by_types(data_frame: DataFrame, types: Dict[str, FactorType]) -> DataFrame:
	type_dict = {}
	for column in data_frame.columns:
		factor_type = types.get(column)
		if factor_type is not None:
			type_dict[column] = convert_to_pandas_type(factor_type)
		else:
			type_dict[column] = 'object'
	return data_frame.astype(type_dict)


def convert_data_frame_type_by_topic(data_frame: DataFrame, topic: Topic) -> DataFrame:
	type_dict = {}
	factor_map: Dict[str, Factor] = ArrayHelper(topic.factors).to_map(lambda x: x.name, lambda x: x)
	for column in data_frame.columns:
		if column in factor_map:
			factor = factor_map.get(column)
			type_dict[column] = convert_to_pandas_type(factor.type)
		elif column == TopicDataColumnNames.ID.value:
			type_dict[column] = convert_to_pandas_type(FactorType.SEQUENCE)
		elif column == TopicDataColumnNames.TENANT_ID.value:
			type_dict[column] = convert_to_pandas_type(FactorType.SEQUENCE)
		elif column == TopicDataColumnNames.INSERT_TIME.value:
			type_dict[column] = convert_to_pandas_type(FactorType.FULL_DATETIME)
		elif column == TopicDataColumnNames.UPDATE_TIME.value:
			type_dict[column] = convert_to_pandas_type(FactorType.FULL_DATETIME)
		else:
			type_dict[column] = 'object'
	return data_frame.astype(type_dict)
