import os
from datetime import datetime
from typing import List, Tuple

from watchmen_auth import PrincipalService
from watchmen_data_kernel.spark import SparkTopicDataService
from watchmen_dqc.common import DqcException
from watchmen_dqc.monitor.rule.data_service_utils import wrap_with_tenant_criteria
from watchmen_dqc.monitor.rules_runner import MonitorRulesRunner
from watchmen_model.dqc import MonitorRule
from .rule import run_all_rules


class SparkMonitorRulesRunner(MonitorRulesRunner):
	"""
	runs monitor rules on a spark session.

	counting, criteria assertions and aggregations are pushed down to the topic storage as the
	storage engine does, only full-distribution rules (median / quantile / stdev) are computed
	on spark, see SparkTopicDataService.find_distribution_frame.
	"""

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

	def run_all_rules(
			self, rules: List[MonitorRule], data_service,
			date_range: Tuple[datetime, datetime],
			total_rows_count: int) -> None:
		changed_rows_count_in_range = self.run_rows_count_mismatch_with_another(rules, data_service, date_range, True)
		run_all_rules(data_service, rules, date_range, changed_rows_count_in_range, total_rows_count)

	def get_topic_data_service(self, topic_id, rules_count: int):
		success, data_service = super().get_topic_data_service(topic_id, rules_count)
		if not success or data_service is None:
			return success, data_service
		return True, SparkTopicDataService(
			delegate=data_service, spark=self.spark,
			# exchanged data services must be tenant wrapped as well,
			# monitor rules must never touch data of other tenants
			decorate_delegate=wrap_with_tenant_criteria)
