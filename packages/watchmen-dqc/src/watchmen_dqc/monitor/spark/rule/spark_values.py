from typing import Any, List


def ask_spark_session():
	from pyspark.sql import SparkSession
	session = SparkSession.getActiveSession()
	if session is not None:
		return session
	return SparkSession.builder.getOrCreate()


def to_spark_frame(data: List[List[Any]]):
	spark = ask_spark_session()
	rows = [[x[0]] for x in data if isinstance(x, list) and len(x) != 0]
	return spark.createDataFrame(rows, ['value'])
