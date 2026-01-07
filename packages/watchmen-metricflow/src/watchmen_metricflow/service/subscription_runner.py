from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_metricflow.meta.bi_analysis_meta_service import BIAnalysisService
from watchmen_metricflow.meta.metric_subscription_meta_service import SubscriptionService
from watchmen_metricflow.meta.metrics_meta_service import MetricService
from watchmen_metricflow.metricflow.main_api import query
from watchmen_metricflow.model.bi_analysis_board import BIAnalysis, BIChartCard
from watchmen_metricflow.model.metric_subscription import Subscription, SubscriptionFrequency, SubscriptionWeekday, \
	SubscriptionMonth
from watchmen_metricflow.model.metrics import Metric
from watchmen_metricflow.router.metric_router import build_metric_config
from watchmen_metricflow.util import trans_readonly


class SubscriptionRunner:
	def __init__(self, principal_service: PrincipalService):
		self.principal_service = principal_service
		self.subscription_service = SubscriptionService(ask_meta_storage(), ask_snowflake_generator(),
		                                                principal_service)
		self.analysis_service = BIAnalysisService(ask_meta_storage(), ask_snowflake_generator(), principal_service)
		self.metric_service = MetricService(ask_meta_storage(), ask_snowflake_generator(), principal_service)

	def run(self, execution_time: datetime = None):
		if execution_time is None:
			execution_time = datetime.now()

		tenant_id = self.principal_service.get_tenant_id()
		subscriptions = self.subscription_service.find_by_tenant_id(tenant_id)

		for subscription in subscriptions:
			if self._is_due(subscription, execution_time):
				self._execute_subscription(subscription)

	def _is_due(self, subscription: Subscription, execution_time: datetime) -> bool:
		if not subscription.enabled:
			return False

		# Simple check: time matches
		# Assume execution_time is in the same timezone as subscription time (or subscription time is local/UTC)
		# For now, just compare string HH:MM
		current_time_str = execution_time.strftime('%H:%M')
		if subscription.time != current_time_str:
			return False

		if subscription.frequency == SubscriptionFrequency.ONCE:
			if subscription.date == execution_time.strftime('%Y-%m-%d'):
				return True
		elif subscription.frequency == SubscriptionFrequency.DAY:
			return True
		elif subscription.frequency == SubscriptionFrequency.WEEK:
			# subscription.weekday is 'mon', 'tue', etc.
			# execution_time.weekday() returns 0 for Monday
			current_weekday = execution_time.strftime('%a').lower()
			if subscription.weekday == current_weekday:
				return True
			# Also handle full names if necessary, but Enum uses 3 letters
		elif subscription.frequency == SubscriptionFrequency.MONTH:
			if subscription.dayOfMonth == execution_time.day:
				return True
		elif subscription.frequency == SubscriptionFrequency.YEAR:
			if subscription.dayOfMonth == execution_time.day:
				current_month = execution_time.strftime('%b').lower()
				if subscription.month == current_month:
					return True

		# BIWEEKLY and others can be more complex, skipping for now as per requirement focus on structure
		return False

	def _execute_subscription(self, subscription: Subscription):
		print(f"Executing subscription {subscription.id} for analysis {subscription.analysisId}")
		
		# Load Analysis
		analysis = self.analysis_service.find_by_id(subscription.analysisId)
		if not analysis:
			print(f"Analysis {subscription.analysisId} not found")
			return

		report_data = []

		for card in analysis.cards:
			result = self._process_card(card)
			if result:
				report_data.append(result)

		# Produce report (e.g., send email)
		self._produce_report(subscription, analysis, report_data)

	def _process_card(self, card: BIChartCard) -> Optional[Dict[str, Any]]:
		if not card.metricId:
			return None

		# Calculate Metric
		metric_value = self._calculate_metric(card.metricId)
		
		# Check Alert
		alert_triggered = False
		if card.alert:
			# Reuse alert checking logic or implement simplified version
			# For now, placeholder
			pass

		return {
			"cardId": card.id,
			"title": card.title,
			"metricId": card.metricId,
			"value": metric_value,
			"alertTriggered": alert_triggered
		}

	def _calculate_metric(self, metric_id: str) -> float:
		# Need to run async query in sync method?
		# Or make run() async.
		# FastAPI router calls are async, so we can make run() async.
		# But for now, let's keep it sync structure and use async_to_sync or just make methods async.
		# I will change methods to async.
		return 0.0

	def _produce_report(self, subscription: Subscription, analysis: BIAnalysis, report_data: List[Dict]):
		# Placeholder for report generation/sending
		print(f"Report for subscription {subscription.id}: {report_data}")

