from typing import List

from watchmen_model.admin import Factor, FactorType, Topic, TopicKind, TopicType


def ask_topic_monitor_rule_topics() -> List[Topic]:
	# TODO define all topic monitor rule topics
	return [
		Topic(
			name='dqc_rule_aggregate',
			kind=TopicKind.SYSTEM,
			type=TopicType.AGGREGATE,
			factors=[
				Factor(factorId='dra-f-1', name='ruleCode', type=FactorType.TEXT),
				Factor(factorId='dra-f-2', name='topicId', type=FactorType.TEXT),
				Factor(factorId='dra-f-3', name='factorId', type=FactorType.TEXT),
			],
			description='Topic data monitor by rule aggregation topic.'
		)
	]
