from datetime import datetime, timedelta
from typing import List, Optional

from watchmen_auth import PrincipalService
from watchmen_dqc.monitor.monitor_data_service import MonitorDataService
from watchmen_dqc.topic_profile.topic_profile_service import TopicProfileService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.dqc import MonitorRuleService
from watchmen_model.common import TenantId, TopicId
from watchmen_model.dqc import MonitorRule, MonitorRuleGrade, MonitorRuleLog, MonitorRuleLogCriteria, TopicProfile


class DqcAdapter:
	"""Read-only access to DQC rules, rule logs and topic profiles.

	DQC already implements data-quality / schema / freshness detection (section 9).
	This adapter turns those results into sensor inputs rather than reimplementing
	them. All calls degrade to empty results when the underlying DQC topics are not
	provisioned.
	"""

	def __init__(self, principal_service: PrincipalService):
		self.principalService = principal_service
		self.ruleService = MonitorRuleService(
			ask_meta_storage(), ask_snowflake_generator(), principal_service)
		self.dataService = MonitorDataService(principal_service)
		self.profileService = TopicProfileService(principal_service)

	def list_rules_by_topic(self, topic_id: TopicId, tenant_id: TenantId) -> List[MonitorRule]:
		return self.ruleService.find_by_topic_id(topic_id, tenant_id)

	def list_global_rules(self, tenant_id: TenantId) -> List[MonitorRule]:
		return self.ruleService.find_by_grade_or_topic_id(MonitorRuleGrade.GLOBAL, None, tenant_id)

	def find_recent_rule_logs(
			self, topic_id: Optional[TopicId] = None, days: int = 1
	) -> List[MonitorRuleLog]:
		end = datetime.now()
		start = end - timedelta(days=days)
		criteria = MonitorRuleLogCriteria(
			startDate=start.strftime('%Y-%m-%d'),
			endDate=end.strftime('%Y-%m-%d'),
			topicId=topic_id
		)
		try:
			return self.dataService.find(criteria)
		except Exception:
			# dqc_rule_daily topic may not be provisioned; treat as no data.
			return []

	def find_topic_profile(
			self, topic_id: TopicId, days: int = 1
	) -> Optional[TopicProfile]:
		end = datetime.now()
		start = end - timedelta(days=days)
		try:
			return self.profileService.find(topic_id, start, end)
		except Exception:
			return None
