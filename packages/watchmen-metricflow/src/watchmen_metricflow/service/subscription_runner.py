from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Tuple
from logging import getLogger

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_metricflow.meta.bi_analysis_meta_service import BIAnalysisService
from watchmen_metricflow.meta.metric_subscription_meta_service import SubscriptionService
from watchmen_metricflow.meta.metrics_meta_service import MetricService
from watchmen_metricflow.metricflow.main_api import query
from watchmen_metricflow.model.bi_analysis_board import BIAnalysis, BIChartCard
from watchmen_metricflow.model.metric_subscription import Subscription, SubscriptionFrequency, SchedulerRunResponse, SubscriptionTriggerResult
from watchmen_metricflow.router.metric_router import build_metric_config
from watchmen_metricflow.model.alert_rule import GlobalAlertRule, AlertAction, AlertStatus
from watchmen_metricflow.service.alert_trigger_servcie import AlertTriggerService
from watchmen_metricflow.service.alert_email_body_builder import (
    build_alert_detail_html,
    build_data_table_html,
    build_header_html,
    build_metric_card_html,
    build_footer_html,
    build_report_html,
    format_frequency_desc,
    format_time_range_label,
)
from watchmen_metricflow.service.hooks import build_alert_hook_dispatcher
from watchmen_metricflow.settings import ask_analysis_web_base_url, mf_settings
from watchmen_metricflow.util import trans_readonly
from watchmen_rest import create_jwt_token

logger = getLogger(__name__)


class SubscriptionRunner:
	def __init__(self, principal_service: PrincipalService):
		self.principal_service = principal_service
		self.subscription_service = SubscriptionService(ask_meta_storage(), ask_snowflake_generator(),
		                                                principal_service)
		self.analysis_service = BIAnalysisService(ask_meta_storage(), ask_snowflake_generator(), principal_service)
		self.metric_service = MetricService(ask_meta_storage(), ask_snowflake_generator(), principal_service)
		self.alert_trigger_service = AlertTriggerService(principal_service)
		self.hook_dispatcher = build_alert_hook_dispatcher()

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

	async def run_scheduler(self, execution_time: datetime = None) -> SchedulerRunResponse:
		if execution_time is None:
			execution_time = datetime.now()

		def load_subscriptions():
			tenant_id = self.principal_service.get_tenant_id()
			return self.subscription_service.find_by_tenant_id(tenant_id)

		subscriptions = trans_readonly(self.subscription_service, load_subscriptions)

		triggered = []
		total_triggered = 0
		total_skipped = 0

		for subscription in subscriptions:
			if not self._is_due(subscription, execution_time):
				continue

			if subscription.onlyOnAlertTriggered:
				def load_analysis() -> BIAnalysis:
					return self.analysis_service.find_by_id(subscription.analysisId)
				analysis = trans_readonly(self.analysis_service, load_analysis)

				if not analysis:
					triggered.append(SubscriptionTriggerResult(
						subscriptionId=subscription.id,
						analysisId=subscription.analysisId,
						status='skipped',
						message='Analysis not found'
					))
					total_skipped += 1
					continue

				share_link = self._build_share_link(analysis.id)
				report_data = []
				has_triggered = False
				for card in analysis.cards or []:
					result = await self._process_card(card)
					if result:
						report_data.append(result)

				for card in analysis.cards or []:
					if card.alert is None:
						continue

					rule = GlobalAlertRule.model_validate(card.alert)
					rule.id = f"{analysis.id}_{card.id}"
					rule.name = f"{analysis.name} / {card.title}"
					alert_status = await self.alert_trigger_service.run_alert_rule(rule, report_data, share_link)
					if alert_status.triggered:
						has_triggered = True
						break

				if not has_triggered:
					triggered.append(SubscriptionTriggerResult(
						subscriptionId=subscription.id,
						analysisId=subscription.analysisId,
						status='skipped',
						message='Alert not triggered, onlyOnAlertTriggered=true'
					))
					total_skipped += 1
					continue

			try:
				await self._execute_subscription(subscription)
				triggered.append(SubscriptionTriggerResult(
					subscriptionId=subscription.id,
					analysisId=subscription.analysisId,
					status='success',
					message=None
				))
				total_triggered += 1
			except Exception as e:
				triggered.append(SubscriptionTriggerResult(
					subscriptionId=subscription.id,
					analysisId=subscription.analysisId,
					status='error',
					message=str(e)
				))
				total_skipped += 1

		return SchedulerRunResponse(
			triggered=triggered,
			totalTriggered=total_triggered,
			totalSkipped=total_skipped,
			executionTime=execution_time
		)

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

		def load_analysis() -> BIAnalysis:
			return self.analysis_service.find_by_id(subscription.analysisId)

		analysis = trans_readonly(self.analysis_service, load_analysis)

		if not analysis:
			print(f"Analysis {subscription.analysisId} not found")
			return

		report_data = []
		alert_statuses = []
		share_link = self._build_share_link(analysis.id)

		for card in analysis.cards:
			print(f"Processing card {card.id}")
			result = await self._process_card(card)
			if result:
				report_data.append(result)

		for card in analysis.cards:
			if subscription.onlyOnAlertTriggered and card.alert is not None:
				rule = GlobalAlertRule.model_validate(card.alert)
				rule.id = f"{analysis.id}_{card.id}"
				rule.name = f"{analysis.name} / {card.title}"
				alert_status = await self.alert_trigger_service.run_alert_rule(rule, report_data, share_link)
				alert_statuses.append(alert_status)
				if alert_status.triggered:
					print(f"Alert triggered for card {card.id}: {alert_status.message}")

		if subscription.onlyOnAlertTriggered:
			any_triggered = any(s.triggered for s in alert_statuses)
			if not any_triggered:
				print("No alerts triggered, skipping report production")
				return

		await self._produce_report(subscription, analysis, report_data, alert_statuses)

	async def _process_card(self, card: BIChartCard) -> Optional[Dict[str, Any]]:
		if not card.metricId:
			return None

		# Load metric metadata for friendly name
		metric_name = card.metricId
		def load_metric():
			return self.metric_service.find_by_name(metric_name)
		metric = trans_readonly(self.metric_service, load_metric)

		metric_label = None
		metric_description = None
		if metric:
			metric_label = metric.label or metric.name
			metric_description = metric.description

		# Calculate Metric
		query_result = await self._calculate_metric(card)

		# Extract timeRange for display
		time_range = None
		if card.selection:
			time_range = card.selection.get("timeRange")

		return {
			"cardId": card.id,
			"title": card.title,
			"metricId": card.metricId,
			"metricLabel": metric_label,
			"metricDescription": metric_description,
			"timeRange": time_range,
			"result": query_result,
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
			print(f"Error calculating metric {metric_name}: {e}")
			return None



	def _format_frequency_desc(self, subscription: Subscription) -> str:
		return format_frequency_desc(subscription)

	_TIME_RANGE_LABELS = {
		'Past 7 days': 'Past 7 Days',
		'Past 30 days': 'Past 30 Days',
		'Past 90 days': 'Past 90 Days',
		'Past year': 'Past Year',
	}

	def _format_time_range_label(self, time_range: Optional[str]) -> str:
		return format_time_range_label(time_range)


	@staticmethod
	def _build_data_table_html(columns: List, data: List, max_rows: int = 20) -> str:
		return build_data_table_html(columns, data, max_rows)

	# ── Alert Detail ───────────────────────────────────────────────────────

	@staticmethod
	def _build_alert_detail_html(alert_statuses: List[AlertStatus]) -> str:
		return build_alert_detail_html(alert_statuses)

	# ── Report Sections ────────────────────────────────────────────────────

	def _build_share_link(self, analysis_id: str) -> str:
		"""Generate a share link for the analysis board with an embedded JWT token."""
		base_url = ask_analysis_web_base_url().rstrip('/')
		subject = self.principal_service.get_user_name()
		secret_key = mf_settings.JWT_SECRET_KEY
		algorithm = mf_settings.JWT_ALGORITHM
		expires_minutes = mf_settings.ACCESS_TOKEN_EXPIRE_MINUTES
		token = create_jwt_token(
			subject=subject,
			expires_delta=timedelta(minutes=expires_minutes),
			secret_key=secret_key,
			algorithm=algorithm
		)
		return f'{base_url}/share/analysis/{analysis_id}?token={token}'

	@staticmethod
	def _build_header_html(analysis_name: str, frequency_desc: str, generated_at: str, share_link: str = '') -> str:
		return build_header_html(analysis_name, frequency_desc, generated_at, share_link)

	def _build_metric_card_html(self, item: Dict) -> str:
		return build_metric_card_html(item)

	@staticmethod
	def _build_footer_html(share_link: str = '') -> str:
		return build_footer_html(share_link)

	# ── Main HTML Builder ──────────────────────────────────────────────────

	def _build_report_html(self, subscription: Subscription, analysis: BIAnalysis, report_data: List[Dict],
	                       alert_statuses: List[AlertStatus], share_link: str = '') -> str:
		return build_report_html(subscription, analysis, report_data, alert_statuses, share_link)

	def _extract_email_parameters(self, analysis: BIAnalysis, alert_statuses: List[AlertStatus]) -> Dict[str, Any]:
		for status in alert_statuses or []:
			for action in status.actions or []:
				params = action.parameters or {}
				if params.get('host') or params.get('server'):
					return dict(params)
		for card in analysis.cards or []:
			if card.alert is None:
				continue
			for action in card.alert.actions or []:
				params = action.parameters or {}
				if params.get('host') or params.get('server'):
					return dict(params)
		return {}

	async def _produce_report(self, subscription: Subscription, analysis: BIAnalysis, report_data: List[Dict],
	                          alert_statuses: List[AlertStatus] = None):
		recipients = [x for x in (subscription.recipients or []) if isinstance(x, str) and len(x.strip()) > 0]
		if len(recipients) == 0:
			logger.warning(f'no recipients on subscription {subscription.id}, skip report email')
			return
		email_parameters = self._extract_email_parameters(analysis, alert_statuses or [])
		if len(email_parameters) == 0:
			logger.warning(f'no smtp parameters found on analysis {analysis.id}, skip report email')
			return
		share_link = self._build_share_link(analysis.id)
		html_body = self._build_report_html(subscription, analysis, report_data, alert_statuses or [], share_link)
		subject = f"[Metric Subscription] {analysis.name} - {datetime.now().strftime('%Y-%m-%d %H:%M')}"
		rule = GlobalAlertRule(
			id=str(subscription.id),
			tenantId=subscription.tenantId,
			userId=subscription.userId,
			name=f"Subscription {subscription.id}",
			priority='medium',
			enabled=True
		)
		actions = [
			AlertAction(
				type='notification',
				actionType={'category': 'notification'},
				parameters={**email_parameters, 'to': recipient, 'subject': subject, 'content': html_body}
			)
			for recipient in recipients
		]
		await self.hook_dispatcher.execute_actions(rule, f"Subscription report for {analysis.name}", actions)
