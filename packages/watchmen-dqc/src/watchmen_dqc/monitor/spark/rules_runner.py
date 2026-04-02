import os

from watchmen_auth import PrincipalService
from watchmen_dqc.common import DqcException
from watchmen_dqc.monitor.rules_runner import MonitorRulesRunner


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
