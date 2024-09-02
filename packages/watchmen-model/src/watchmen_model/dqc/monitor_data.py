from datetime import datetime
from typing import Optional

from watchmen_utilities import ExtendedBaseModel

from watchmen_model.common import DataModel, FactorId, TopicId
from .monitor_rule import MonitorRuleCode


class MonitorRuleLog(DataModel, ExtendedBaseModel):
	ruleCode: Optional[MonitorRuleCode] = None
	topicId: Optional[TopicId] = None
	factorId: Optional[FactorId] = None
	count: Optional[int] = None
	lastOccurredTime: Optional[datetime] = None


class MonitorRuleLogCriteria(DataModel, ExtendedBaseModel):
	startDate: Optional[str] = None
	endDate: Optional[str] = None
	ruleCode: Optional[MonitorRuleCode] = None
	topicId: Optional[TopicId] = None
	factorId: Optional[FactorId] = None
