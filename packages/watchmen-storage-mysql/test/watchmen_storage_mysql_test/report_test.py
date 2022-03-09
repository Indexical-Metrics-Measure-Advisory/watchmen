from unittest import TestCase

from watchmen_model.admin import Factor, FactorType, Topic, TopicKind, TopicType
from watchmen_storage import ColumnNameLiteral, FreeAggregateArithmetic, FreeAggregateColumn, FreeAggregator, \
	FreeColumn, FreeJoin
from watchmen_storage_mysql import StorageMySQLConfiguration


class ReportTest(TestCase):
	def setUp(self) -> None:
		self.storage = StorageMySQLConfiguration.config() \
			.host('localhost', 3306).account('watchmen', 'watchmen').schema('watchmen') \
			.echo(True) \
			.build_topic_data()
		topic = Topic(
			topicId='1', name='topic1', type=TopicType.DISTINCT, kind=TopicKind.BUSINESS,
			factors=[
				Factor(factorId='1', name='topic1_id', type=FactorType.SEQUENCE)
			],
			tenantId='1'
		)
		self.storage.register_topic(topic)

	def test_query(self):
		try:
			self.storage.connect()
			data = self.storage.free_aggregate_find(FreeAggregator(
				columns=[
					FreeColumn(
						literal=ColumnNameLiteral(entityName='topic1', columnName='topic1_id'),
						alias='ID'
					)
				],
				joins=[
					FreeJoin(
						# column name is ignored, because there is no join
						primary=ColumnNameLiteral(entityName='1')
					)
				],
				aggregateColumns=[
					FreeAggregateColumn(
						name='column_1',
						arithmetic=FreeAggregateArithmetic.SUMMARY,
						alias='IdSum'
					)
				]
			))
			print(data)
		finally:
			self.storage.close()
