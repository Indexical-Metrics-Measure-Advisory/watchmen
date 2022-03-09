from unittest import TestCase

from watchmen_model.admin import Factor, FactorType, Topic, TopicKind, TopicType
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaOperator, \
	FreeAggregateArithmetic, FreeAggregateColumn, \
	FreeAggregator, \
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
					),
					FreeColumn(
						literal=ColumnNameLiteral(entityName='topic1', columnName='topic1_id'),
						alias='ANOTHER_ID'
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
					),
					FreeAggregateColumn(
						name='column_2',
						arithmetic=FreeAggregateArithmetic.NONE,
						alias='Id'
					)
				],
				criteria=[
					EntityCriteriaExpression(
						left=ColumnNameLiteral(entityName='topic1', columnName='topic1_id'),
						operator=EntityCriteriaOperator.NOT_EQUALS,
						right='0'
					)
				],
				highOrderCriteria=[
					EntityCriteriaExpression(
						left=ColumnNameLiteral(columnName='column_2'),
						operator=EntityCriteriaOperator.GREATER_THAN,
						right='1'
					)
				]
			))
			print(data)
		finally:
			self.storage.close()
