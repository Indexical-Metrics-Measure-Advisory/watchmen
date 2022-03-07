from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from watchmen_model.common import DataModel, FactorId, TopicId
from .monitor_rule import MonitorRuleCode


class MonitorRuleLog(DataModel, BaseModel):
	ruleCode: MonitorRuleCode = None
	topicId: Optional[TopicId] = None
	factorId: Optional[FactorId] = None
	count: int = None
	lastOccurredTime: datetime = None


class MonitorRuleLogCriteria(DataModel, BaseModel):
	startDate: str = None
	endDate: str = None
	ruleCode: MonitorRuleCode = None
	topicId: TopicId = None
	factorId: FactorId = None
