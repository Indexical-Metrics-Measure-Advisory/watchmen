from __future__ import annotations

from typing import TYPE_CHECKING, Any, Callable, Dict, List, Optional

from watchmen_auth import PrincipalService
from watchmen_data_kernel.common import DataKernelException
from watchmen_data_kernel.meta import TopicService
from watchmen_data_kernel.service import ask_topic_data_service, ask_topic_storage
from watchmen_data_kernel.storage import TopicDataService
from watchmen_model.common import TopicId
from watchmen_storage import EntityCriteria

if TYPE_CHECKING:
	from pyspark.sql import DataFrame, SparkSession


class SparkTopicDataService:
	"""
	a spark accelerated decorator of a topic data service.

	ordinary reads (count, count_by_criteria, find_distinct_values, find_straight_values, and
	anything else via __getattr__) are pushed down to the underlying storage service unchanged,
	so aggregations and criteria based counting keep the exact semantics of the storage engine.

	spark is engaged only through find_distribution_frame, which loads the requested columns
	within a criteria (typically a date range) into a spark data frame, for computations that
	need the full value distribution, such as median, quantile and standard deviation.

	pyspark is imported lazily, the module itself can be imported without pyspark installed.
	the spark session is owned by the caller and shared by all instances derived from it
	(exchange_to_topic), stop it when the whole run finishes.

	``decorate_delegate`` is applied to every underlying data service, including the ones
	created by exchange_to_topic. use it to enforce cross-cutting criteria, e.g. wrapping
	with tenant criteria so that a tenant scoped principal never reads data of other tenants.
	"""

	def __init__(
			self, delegate: TopicDataService, spark: SparkSession,
			decorate_delegate: Optional[Callable[[TopicDataService], TopicDataService]] = None):
		self.delegate = delegate
		self.spark = spark
		self.decorate_delegate = decorate_delegate

	def get_principal_service(self) -> PrincipalService:
		return self.delegate.get_principal_service()

	def get_topic(self):
		return self.delegate.get_topic()

	def get_data_entity_helper(self):
		return self.delegate.get_data_entity_helper()

	def get_delegate(self) -> TopicDataService:
		return self.delegate

	def __getattr__(self, name: str) -> Any:
		# any method not overridden here (writes, limited finders, ...) falls back to
		# the delegate storage service
		return getattr(self.delegate, name)

	def exchange_to_topic(self, topic_id: TopicId) -> SparkTopicDataService:
		principal_service = self.get_principal_service()
		topic_service = TopicService(principal_service)
		topic = topic_service.find_by_id(topic_id)
		if topic is None:
			raise DataKernelException(f'Topic[id={topic_id}] not found.')
		schema = topic_service.find_schema_by_name(topic.name, principal_service.get_tenant_id())
		if schema is None:
			raise DataKernelException(f'Topic[name={topic.name}] not found.')
		storage = ask_topic_storage(schema, principal_service)
		delegate = ask_topic_data_service(schema, storage, principal_service)
		if self.decorate_delegate is not None:
			delegate = self.decorate_delegate(delegate)
		return SparkTopicDataService(delegate, self.spark, self.decorate_delegate)

	def count(self) -> int:
		return self.delegate.count()

	def count_by_criteria(self, criteria: EntityCriteria) -> int:
		return self.delegate.count_by_criteria(criteria)

	def find_distinct_values(
			self, criteria: Optional[EntityCriteria], column_names: List[str],
			distinct_value_on_single_column: bool = False) -> List[Dict[str, Any]]:
		# the flag is honored as-is: when False, all rows (not distinct values) are returned,
		# which is required by full-distribution rules
		return self.delegate.find_distinct_values(
			criteria=criteria, column_names=column_names,
			distinct_value_on_single_column=distinct_value_on_single_column)

	def find_straight_values(
			self, criteria: EntityCriteria, columns: List[Any]) -> List[Dict[str, Any]]:
		return self.delegate.find_straight_values(criteria, columns)

	def find_distribution_frame(
			self, criteria: Optional[EntityCriteria], column_names: List[str]) -> DataFrame:
		"""
		load the given columns within the criteria (usually a date range) into a spark data frame.

		values are normalized to strings and the frame is created with an explicit string typed
		schema, so that type inference differences among storage implementations never break the
		frame creation; consumers cast to the expected type by themselves.
		"""
		rows = self.delegate.find_distinct_values(
			criteria=criteria, column_names=column_names,
			# full distribution is required, distinct values would lose weights
			distinct_value_on_single_column=False)
		schema = ','.join([f'{column_name} string' for column_name in column_names])
		data = [
			[(self._to_string(row.get(column_name)) if row.get(column_name) is not None else None)
			 for column_name in column_names]
			for row in rows
		]
		return self.spark.createDataFrame(data, schema)

	# noinspection PyMethodMayBeStatic
	def _to_string(self, value: Any) -> str:
		# bool is an int subclass, normalize it to 0/1 so that a numeric cast keeps it
		if isinstance(value, bool):
			return str(int(value))
		return str(value)
