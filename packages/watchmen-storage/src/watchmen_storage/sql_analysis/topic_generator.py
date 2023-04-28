from typing import List

from watchmen_model.admin import Topic, TopicKind, TopicType, Factor, FactorType, FactorIndexGroup, Pipeline


def ask_query_performance_topics():
	return [
		Topic(
			name='query_performance_log',
			kind=TopicKind.SYSTEM,
			type=TopicType.RAW,
			factors=[
				Factor(factorId='rpml-f-1', name='uid', type=FactorType.TEXT),
				Factor(
					factorId='rpml-f-2', name='topic_dimensions', type=FactorType.TEXT,
					flatten=True, indexGroup=FactorIndexGroup.INDEX_1, precision='200'),
				Factor(
					factorId='rpml-f-3', name='column_dimensions', type=FactorType.TEXT,
					flatten=True, indexGroup=FactorIndexGroup.INDEX_2, precision='200'),
				Factor(
					factorId='rpml-f-4', name='execution_time', type=FactorType.NUMBER, precision='50'),
				Factor(
					factorId='rpml-f-5', name='data_volume', type=FactorType.NUMBER, precision='50'),
				Factor(
					factorId='rpml-f-6', name='join_dimensions', type=FactorType.TEXT,
					flatten=True, precision='200'),
				Factor(
					factorId='rpml-f-7', name='where_dimensions', type=FactorType.TEXT,
					flatten=True, precision='200'),
				Factor(
					factorId='rpml-f-8', name='group_by_dimensions', type=FactorType.TEXT,
					flatten=True,  precision='200'),

			],
			description='query performance log raw topic ',
		)
	]


def ask_query_performance_pipelines(topics: List[Topic]) -> List[Pipeline]:
	# TODO define all pipeline monitor pipelines
	return []