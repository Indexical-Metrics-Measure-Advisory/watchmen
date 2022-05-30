from typing import List

from watchmen_model.admin import Factor, FactorIndexGroup, FactorType, Topic, TopicKind, TopicType


def ask_topic_snapshot_topics() -> List[Topic]:
	# TODO define all topic snapshot topics
	return [
		Topic(
			name='raw_topic_snapshot_tasks',
			kind=TopicKind.SYSTEM,
			type=TopicType.DISTINCT,
			factors=[
				Factor(factorId='rtst-f-1', name='uid', type=FactorType.TEXT, precision='50'),
				Factor(
					factorId='rtst-f-2', name='sourceTopicName', type=FactorType.TEXT,
					indexGroup=FactorIndexGroup.INDEX_1, precision='50'),
				Factor(
					factorId='rtst-f-3', name='dataId', type=FactorType.TEXT,
					indexGroup=FactorIndexGroup.INDEX_2, precision='20'),
				Factor(
					factorId='rtst-f-4', name='targetTopicName', type=FactorType.TEXT,
					indexGroup=FactorIndexGroup.INDEX_3, precision='50'),
				Factor(
					factorId='rtst-f-5', name='scheduleYear', type=FactorType.UNSIGNED,
					indexGroup=FactorIndexGroup.INDEX_4, precision='4'),
				Factor(
					factorId='rtst-f-6', name='scheduleMonth', type=FactorType.UNSIGNED,
					indexGroup=FactorIndexGroup.INDEX_5, precision='2'),
				Factor(
					factorId='rtst-f-7', name='scheduleDay', type=FactorType.UNSIGNED,
					indexGroup=FactorIndexGroup.INDEX_6, precision='2'),
			],
			description='Topic snapshot tasks raw topic.'
		)
	]
