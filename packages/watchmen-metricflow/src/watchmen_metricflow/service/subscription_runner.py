from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Tuple

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_metricflow.meta.bi_analysis_meta_service import BIAnalysisService
from watchmen_metricflow.meta.metric_subscription_meta_service import SubscriptionService
from watchmen_metricflow.meta.metrics_meta_service import MetricService
from watchmen_metricflow.metricflow.main_api import query
from watchmen_metricflow.model.bi_analysis_board import BIAnalysis, BIChartCard
from watchmen_metricflow.model.metric_subscription import Subscription, SubscriptionFrequency
from watchmen_metricflow.router.metric_router import build_metric_config
from watchmen_metricflow.util import trans_readonly


class SubscriptionRunner:
	def __init__(self, principal_service: PrincipalService):
		self.principal_service = principal_service
		self.subscription_service = SubscriptionService(ask_meta_storage(), ask_snowflake_generator(),
		                                                principal_service)
		self.analysis_service = BIAnalysisService(ask_meta_storage(), ask_snowflake_generator(), principal_service)
		self.metric_service = MetricService(ask_meta_storage(), ask_snowflake_generator(), principal_service)

	async def run(self, execution_time: datetime = None):
		if execution_time is None:
			execution_time = datetime.now()

		def load_subscriptions():
			tenant_id = self.principal_service.get_tenant_id()
			return self.subscription_service.find_by_tenant_id(tenant_id)

		subscriptions = trans_readonly(self.subscription_service, load_subscriptions)

		for subscription in subscriptions:
			if self._is_due(subscription, execution_time):
				await self._execute_subscription(subscription)

	async def run_by_id(self, subscription_id: str):
		def load_subscription():
			return self.subscription_service.find_by_id(subscription_id)

		subscription = trans_readonly(self.subscription_service, load_subscription)
		
		if not subscription:
			return

		if subscription.tenantId != self.principal_service.get_tenant_id():
			return

		await self._execute_subscription(subscription)

	def _is_due(self, subscription: Subscription, execution_time: datetime) -> bool:
		if not subscription.enabled:
			return False

		# Simple check: time matches
		# Assume execution_time is in the same timezone as subscription time (or subscription time is local/UTC)
		# For now, just compare string HH:MM
		if not subscription.time:
			return False

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

		return False

	async def _execute_subscription(self, subscription: Subscription):
		print(f"Executing subscription {subscription.id} for analysis {subscription.analysisId}")
		
		# Load Analysis
		def load_analysis()->BIAnalysis:
			return self.analysis_service.find_by_id(subscription.analysisId)

		analysis = trans_readonly(self.analysis_service, load_analysis)

		if not analysis:
			print(f"Analysis {subscription.analysisId} not found")
			return

		report_data = []

		for card in analysis.cards:
			print(f"Analysis {card.id}")
			result = await self._process_card(card)
			print(result)
			if result:
				report_data.append(result)

		# Produce report (e.g., send email)
		self._produce_report(subscription, analysis, report_data)

	async def _process_card(self, card: BIChartCard) -> Optional[Dict[str, Any]]:
		if not card.metricId:
			return None

		# Calculate Metric
		query_result = await self._calculate_metric(card)
		
		# Check Alert
		alert_triggered = False
		# if card.alert:
			# Reuse alert checking logic or implement simplified version
			# For now, placeholder
			# pass

		return {
			"cardId": card.id,
			"title": card.title,
			"metricId": card.metricId,
			"result": query_result,
			"alertTriggered": alert_triggered
		}

	def _parse_time_range(self, time_range: Optional[str]) -> Tuple[Optional[datetime], Optional[datetime]]:
		if not time_range:
			return None, None
		
		end_time = datetime.now()
		start_time = None
		
		if time_range == 'Past 7 days':
			start_time = end_time - timedelta(days=7)
		elif time_range == 'Past 30 days':
			start_time = end_time - timedelta(days=30)
		elif time_range == 'Past 90 days':
			start_time = end_time - timedelta(days=90)
		elif time_range == 'Past year':
			start_time = end_time - timedelta(days=365)
		elif time_range.startswith('Custom:'):
			parts = time_range.split(':')
			if len(parts) == 3:
				try:
					start_time = datetime.strptime(parts[1], '%Y-%m-%d')
					end_time = datetime.strptime(parts[2], '%Y-%m-%d').replace(hour=23, minute=59, second=59)
				except ValueError:
					pass
		
		return start_time, end_time

	async def _calculate_metric(self, card: BIChartCard) -> Optional[Dict[str, Any]]:
		metric_name = card.metricId
		def load_metric():
			return self.metric_service.find_by_name(metric_name)

		metric = trans_readonly(self.metric_service, load_metric)
		print("metric",metric)

		if not metric:
			return None

		config = await build_metric_config(self.principal_service)
		
		group_by = []
		start_time = None
		end_time = None
		
		if card.selection:
			if card.selection["dimensions"]:
				group_by = card.selection["dimensions"]
			start_time, end_time = self._parse_time_range(card.selection["timeRange"])

		try:
			query_result = query(
				cfg=config,
				metrics=[metric.name],
				group_by=group_by,
				start_time=start_time,
				end_time=end_time
			)
			
			return {
				"columns": query_result.result_df.column_names,
				"data": query_result.result_df.rows
			}
		except Exception as e:
			print(f"Error calculating metric {metric_id}: {e}")
			return None

	def _produce_report(self, subscription: Subscription, analysis: BIAnalysis, report_data: List[Dict]):
		# Placeholder for report generation/sending
		# In a real implementation, this would format the data (e.g. HTML/PDF) and send via Email/Slack
		print(f"Report for subscription {subscription.id}: {report_data}")
