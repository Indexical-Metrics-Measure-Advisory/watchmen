from datetime import date
from typing import List, Optional

from watchmen_model.admin import Factor, FactorIndexGroup, FactorType, Topic, TopicKind, TopicType
from watchmen_model.common import DataModel, FactorId, TopicId
from .monitor_rule import MonitorRuleCode, MonitorRuleSeverity


class MonitorRuleDetected(DataModel):
	ruleCode: MonitorRuleCode
	topicId: TopicId
	topicName: str
	factorId: Optional[FactorId] = None
	factorName: Optional[str]
	detected: bool  # issue detected
	severity: MonitorRuleSeverity
	processDate: date


def ask_dqc_topics() -> List[Topic]:
	# TODO define all dqc topics
	return [
		Topic(
			name='dqc_raw_rule_result',
			kind=TopicKind.SYSTEM,
			type=TopicType.RAW,
			factors=[
				Factor(
					factorId='dra-f-1', name='ruleCode', type=FactorType.TEXT,
					flatten=True, indexGroup=FactorIndexGroup.INDEX_1, precision='50'),
				Factor(
					factorId='dra-f-2', name='topicId', type=FactorType.TEXT,
					flatten=True, indexGroup=FactorIndexGroup.INDEX_2, precision='50'),
				Factor(
					factorId='dra-f-3', name='topicName', type=FactorType.TEXT),
				Factor(
					factorId='dra-f-4', name='factorId', type=FactorType.TEXT,
					flatten=True, indexGroup=FactorIndexGroup.INDEX_3, precision='50'),
				Factor(
					factorId='dra-f-5', name='factorName', type=FactorType.TEXT),
				Factor(factorId='dra-f-6', name='detected', type=FactorType.BOOLEAN, flatten=True),
				Factor(factorId='dra-f-7', name='severity', type=FactorType.TEXT),
				# the start day of date range
				# sunday of weekly; 1st of monthly.
				Factor(
					factorId='dra-f-8', name='processDate', type=FactorType.DATE,
					flatten=True, indexGroup=FactorIndexGroup.INDEX_4)
			],
			description='Topic data monitor by rules, raw topic.'
		),
		Topic(
			name='dqc_rule_daily',
			kind=TopicKind.SYSTEM,
			type=TopicType.DISTINCT,
			factors=[
				Factor(factorId='dra-f-1', name='ruleCode', type=FactorType.TEXT, indexGroup=FactorIndexGroup.INDEX_1),
				Factor(factorId='dra-f-2', name='topicId', type=FactorType.TEXT, indexGroup=FactorIndexGroup.INDEX_2),
				Factor(factorId='dra-f-3', name='factorId', type=FactorType.TEXT, indexGroup=FactorIndexGroup.INDEX_3),
				Factor(factorId='dra-f-4', name='year', type=FactorType.YEAR, indexGroup=FactorIndexGroup.INDEX_4),
				Factor(factorId='dra-f-5', name='month', type=FactorType.MONTH, indexGroup=FactorIndexGroup.INDEX_5),
				Factor(
					factorId='dra-f-6', name='day', type=FactorType.DAY_OF_MONTH, indexGroup=FactorIndexGroup.INDEX_6),
				Factor(
					factorId='dra-f-7', name='processDate', type=FactorType.DATE, indexGroup=FactorIndexGroup.INDEX_7),
				Factor(factorId='dra-f-8', name='count', type=FactorType.UNSIGNED, precision='10')
			],
			description='Topic data monitor by rules, distinct topic.'
		)
	]
