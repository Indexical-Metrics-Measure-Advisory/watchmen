import os
from datetime import date, datetime
from typing import List, Tuple

from watchmen_auth import PrincipalService
from watchmen_dqc.common import DqcException
from watchmen_dqc.monitor.rules_runner import MonitorRulesRunner
from watchmen_data_kernel.storage import TopicDataService
from watchmen_model.common import TopicId
from watchmen_model.dqc import MonitorRule, MonitorRuleCode, MonitorRuleStatisticalInterval
from watchmen_dqc.monitor.rules_runner import find_rule
from .rule import compute_date_range, rows_count_mismatch_with_another, rows_not_exists, run_all_rules
from .topic_data_service import SparkTopicDataService


class SparkMonitorRulesRunner(MonitorRulesRunner):
	def __init__(self, principal_service: PrincipalService):
		self.spark = self._create_spark_session()
		super().__init__(principal_service)

	@staticmethod
	def _create_spark_session():
		try:
			from pyspark.sql import SparkSession
		except Exception as e:
			raise DqcException(f'PySpark is required for spark monitor runner. Root cause: {e}')
		app_name = os.getenv('WATCHMEN_DQC_SPARK_APP_NAME', 'watchmen-dqc-monitor')
		master = os.getenv('WATCHMEN_DQC_SPARK_MASTER')
		builder = SparkSession.builder.appName(app_name)
		if master is not None and len(master.strip()) != 0:
			builder = builder.master(master.strip())
		return builder.getOrCreate()

	def run_on_topic_and_frequency(
			self, data_service: TopicDataService, process_date: date,
			rules: List[MonitorRule], frequency: MonitorRuleStatisticalInterval) -> None:
		date_range = compute_date_range(process_date, frequency)
		rows_not_exists_rule = find_rule(rules, MonitorRuleCode.ROWS_NOT_EXISTS)
		total_rows_count = rows_not_exists(data_service, rows_not_exists_rule, date_range)
		if total_rows_count == 0:
			self.run_rows_count_mismatch_with_another(rules, data_service, date_range, False)
		else:
			self.run_all_rules(rules, data_service, date_range, total_rows_count)

	def run_rows_count_mismatch_with_another(
			self, rules: List[MonitorRule], data_service: TopicDataService,
			date_range: Tuple[datetime, datetime], has_data: bool) -> int:
		rule = find_rule(rules, MonitorRuleCode.ROWS_COUNT_MISMATCH_AND_ANOTHER)
		return rows_count_mismatch_with_another(data_service, rule, date_range, has_data)

	def run_all_rules(
			self, rules: List[MonitorRule], data_service: TopicDataService,
			date_range: Tuple[datetime, datetime],
			total_rows_count: int) -> None:
		changed_rows_count_in_range = self.run_rows_count_mismatch_with_another(rules, data_service, date_range, True)
		run_all_rules(data_service, rules, date_range, changed_rows_count_in_range, total_rows_count)

	def get_topic_data_service(self, topic_id: TopicId, rules_count: int):
		success, data_service = super().get_topic_data_service(topic_id, rules_count)
		if not success or data_service is None:
			return success, data_service
		return True, SparkTopicDataService(data_service, self.spark)
