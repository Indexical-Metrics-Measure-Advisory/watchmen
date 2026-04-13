from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Tuple
from logging import getLogger
from html import escape

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_metricflow.meta.bi_analysis_meta_service import BIAnalysisService
from watchmen_metricflow.meta.metric_subscription_meta_service import SubscriptionService
from watchmen_metricflow.meta.metrics_meta_service import MetricService
from watchmen_metricflow.metricflow.main_api import query
from watchmen_metricflow.model.bi_analysis_board import BIAnalysis, BIChartCard
from watchmen_metricflow.model.metric_subscription import Subscription, SubscriptionFrequency
from watchmen_metricflow.router.metric_router import build_metric_config
from watchmen_metricflow.model.alert_rule import GlobalAlertRule, AlertAction, AlertStatus
from watchmen_metricflow.service.alert_trigger_servcie import AlertTriggerService
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

		for card in analysis.cards:
			print(f"Processing card {card.id}")
			result = await self._process_card(card)
			if result:
				report_data.append(result)

			if subscription.onlyOnAlertTriggered and card.alert is not None:
				rule = GlobalAlertRule.model_validate(card.alert)
				rule.id = f"{analysis.id}_{card.id}"
				rule.name = f"{analysis.name} / {card.title}"
				alert_status = await self.alert_trigger_service.run_alert_rule(rule)
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

	# ── Frequency Description ──────────────────────────────────────────────

	_WEEKDAY_LABELS = {'mon': 'Monday', 'tue': 'Tuesday', 'wed': 'Wednesday', 'thu': 'Thursday',
	                   'fri': 'Friday', 'sat': 'Saturday', 'sun': 'Sunday'}
	_MONTH_LABELS = {'jan': 'Jan', 'feb': 'Feb', 'mar': 'Mar', 'apr': 'Apr',
	                 'may': 'May', 'jun': 'Jun', 'jul': 'Jul', 'aug': 'Aug',
	                 'sep': 'Sep', 'oct': 'Oct', 'nov': 'Nov', 'dec': 'Dec'}

	def _format_frequency_desc(self, subscription: Subscription) -> str:
		freq = subscription.frequency
		t = subscription.time or ''
		if freq == SubscriptionFrequency.ONCE:
			date_str = subscription.date or ''
			return f'Once ({date_str} {t})'.strip()
		elif freq == SubscriptionFrequency.DAY:
			return f'Daily at {t}'.strip() if t else 'Daily'
		elif freq == SubscriptionFrequency.WEEK:
			wd = self._WEEKDAY_LABELS.get(subscription.weekday, subscription.weekday or '')
			return f'Every {wd} at {t}'.strip()
		elif freq == SubscriptionFrequency.BIWEEKLY:
			wd = self._WEEKDAY_LABELS.get(subscription.weekday, subscription.weekday or '')
			return f'Bi-weekly on {wd} at {t}'.strip()
		elif freq == SubscriptionFrequency.MONTH:
			d = subscription.dayOfMonth or ''
			return f'Monthly on day {d} at {t}'.strip()
		elif freq == SubscriptionFrequency.YEAR:
			m = self._MONTH_LABELS.get(subscription.month, subscription.month or '')
			d = subscription.dayOfMonth or ''
			return f'Yearly on {m} {d} at {t}'.strip()
		return str(freq)

	_TIME_RANGE_LABELS = {
		'Past 7 days': 'Past 7 Days',
		'Past 30 days': 'Past 30 Days',
		'Past 90 days': 'Past 90 Days',
		'Past year': 'Past Year',
	}

	def _format_time_range_label(self, time_range: Optional[str]) -> str:
		if not time_range:
			return ''
		if time_range in self._TIME_RANGE_LABELS:
			return self._TIME_RANGE_LABELS[time_range]
		if time_range.startswith('Custom:'):
			parts = time_range.split(':')
			if len(parts) == 3:
				return f'{parts[1]} to {parts[2]}'
		return time_range

	# ── Styled Data Table ──────────────────────────────────────────────────

	@staticmethod
	def _build_data_table_html(columns: List, data: List, max_rows: int = 20) -> str:
		if not columns:
			return '<p style="color:#5f6368;font-style:italic;">No data columns available</p>'

		header_cells = ''.join(
			f'<th style="background:#1a73e8;color:#ffffff;padding:10px 14px;text-align:left;'
			f'font-weight:600;font-size:13px;white-space:nowrap;">{escape(str(c))}</th>'
			for c in columns
		)
		header_row = f'<tr>{header_cells}</tr>'

		total_rows = len(data)
		display_rows = data[:max_rows]
		body_rows = []
		for idx, row in enumerate(display_rows):
			bg = '#f8f9fa' if idx % 2 == 1 else '#ffffff'
			cells = ''.join(
				f'<td style="padding:9px 14px;border-bottom:1px solid #e0e0e0;font-size:13px;'
				f'background:{bg};color:#202124;">{escape(str(v))}</td>'
				for v in row
			)
			body_rows.append(f'<tr>{cells}</tr>')

		if not body_rows:
			body_rows.append(
				'<tr><td colspan="%d" style="padding:16px;text-align:center;color:#5f6368;'
				'font-style:italic;">No data available</td></tr>' % len(columns)
			)

		truncation_note = ''
		if total_rows > max_rows:
			truncation_note = (
				f'<p style="margin:6px 0 0 0;font-size:12px;color:#5f6368;">'
				f'Showing first {max_rows} of {total_rows} rows</p>'
			)

		return (
			f'<table style="border-collapse:collapse;width:100%;border-radius:8px;'
			f'overflow:hidden;border:1px solid #e0e0e0;">'
			f'<thead>{header_row}</thead>'
			f'<tbody>{"".join(body_rows)}</tbody>'
			f'</table>'
			f'{truncation_note}'
		)

	# ── Alert Detail ───────────────────────────────────────────────────────

	@staticmethod
	def _build_alert_detail_html(alert_statuses: List[AlertStatus]) -> str:
		if not alert_statuses:
			return ''

		triggered_count = sum(1 for s in alert_statuses if s.triggered)
		normal_count = len(alert_statuses) - triggered_count

		# Summary banner
		if triggered_count > 0:
			banner_bg = '#fce8e6'
			banner_border = '#d93025'
			banner_icon = '⚠️'
			banner_text = f'{triggered_count} alert(s) triggered'
		else:
			banner_bg = '#e6f4ea'
			banner_border = '#1e8e3e'
			banner_icon = '✅'
			banner_text = f'All {normal_count} alert rule(s) are normal'

		banner = (
			f'<div style="background:{banner_bg};border-left:4px solid {banner_border};'
			f'border-radius:6px;padding:14px 18px;margin:0 0 20px 0;">'
			f'<span style="font-size:16px;">{banner_icon}</span>'
			f'<span style="font-weight:600;color:#202124;margin-left:8px;">{banner_text}</span>'
			f'</div>'
		)

		# Per-alert cards
		alert_cards = []
		for status in alert_statuses:
			if status.triggered:
				status_bg = '#fce8e6'
				status_border = '#d93025'
				status_label = 'Triggered'
				status_badge_bg = '#d93025'
			else:
				status_bg = '#e6f4ea'
				status_border = '#1e8e3e'
				status_label = 'Normal'
				status_badge_bg = '#1e8e3e'

			condition_details = ''
			if status.conditionResults:
				cond_lines = []
				for cr in status.conditionResults:
					metric_name = escape(str(cr.metricName or cr.metricId or ''))
					op = escape(str(cr.operator or ''))
					threshold = escape(str(cr.value if cr.value is not None else ''))
					current = escape(str(cr.currentValue if cr.currentValue is not None else 'N/A'))
					cond_lines.append(
						f'<div style="margin:4px 0;padding:4px 0;font-size:13px;color:#202124;">'
						f'· {metric_name}: current value <strong>{current}</strong> '
						f'{op} threshold <strong>{threshold}</strong>'
						f'</div>'
					)
				condition_details = f'<div style="margin-top:8px;padding-top:8px;border-top:1px solid #e0e0e0;">{"".join(cond_lines)}</div>'

			alert_cards.append(
				f'<div style="background:{status_bg};border:1px solid {status_border};'
				f'border-radius:8px;padding:14px 16px;margin:0 0 10px 0;">'
				f'<div style="display:flex;align-items:center;justify-content:space-between;">'
				f'<span style="font-weight:600;color:#202124;font-size:14px;">{escape(status.ruleName)}</span>'
				f'<span style="background:{status_badge_bg};color:#ffffff;padding:2px 10px;'
				f'border-radius:12px;font-size:12px;font-weight:600;">{status_label}</span>'
				f'</div>'
				f'<p style="margin:6px 0 0 0;color:#5f6368;font-size:13px;">{escape(status.message)}</p>'
				f'{condition_details}'
				f'</div>'
			)

		return (
			f'<div style="margin:0 0 28px 0;">'
			f'<h2 style="margin:0 0 14px 0;color:#1a73e8;font-size:18px;font-weight:700;">Alert Status</h2>'
			f'{banner}'
			f'{"".join(alert_cards)}'
			f'</div>'
		)

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
		view_button = ''
		if share_link:
			view_button = (
				f'<div style="margin-top:16px;">'
				f'<a href="{share_link}" target="_blank" style="display:inline-block;background:#1a73e8;'
				f'color:#ffffff;padding:10px 24px;border-radius:6px;font-size:14px;font-weight:600;'
				f'text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;">'
				f'View Dashboard</a>'
				f'</div>'
			)
		return (
			f'<div style="background:#ffffff;border-left:4px solid #1a73e8;'
			f'border-radius:0 10px 10px 0;padding:28px 32px;margin:0 0 24px 0;">'
			f'<h1 style="margin:0 0 8px 0;color:#1a202c;font-size:24px;font-weight:700;'
			f'font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;">'
			f'Metric Subscription Report</h1>'
			f'<p style="margin:0 0 4px 0;color:#2d3748;font-size:15px;">'
			f'Dashboard: {escape(analysis_name)}</p>'
			f'<p style="margin:0 0 4px 0;color:#4a5568;font-size:13px;">'
			f'Frequency: {escape(frequency_desc)}</p>'
			f'<p style="margin:0;color:#4a5568;font-size:13px;">'
			f'Generated: {escape(generated_at)}</p>'
			f'{view_button}'
			f'</div>'
		)

	def _build_metric_card_html(self, item: Dict) -> str:
		title = escape(str(item.get('title') or 'Untitled Metric'))
		metric_label = escape(str(item.get('metricLabel') or item.get('metricId') or ''))
		metric_desc = item.get('metricDescription')
		time_range = item.get('timeRange')
		result = item.get('result')

		# Subtitle line: metric label + time range
		subtitle_parts = []
		if metric_label:
			subtitle_parts.append(f'Metric: {metric_label}')
		if time_range:
			subtitle_parts.append(f'Time Range: {self._format_time_range_label(time_range)}')
		subtitle = '<span style="margin:0 8px;color:#dadce0;">|</span>'.join(subtitle_parts)

		desc_html = ''
		if metric_desc:
			desc_html = (
				f'<p style="margin:4px 0 0 0;color:#5f6368;font-size:12px;font-style:italic;">'
				f'{escape(str(metric_desc))}</p>'
			)

		data_html = self._build_data_table_html(
			result.get('columns', []), result.get('data', [])
		) if result else '<p style="color:#5f6368;font-style:italic;">Query failed, no data available</p>'

		return (
			f'<div style="background:#ffffff;border:1px solid #e0e0e0;border-radius:10px;'
			f'padding:20px 24px;margin:0 0 16px 0;">'
			f'<h3 style="margin:0 0 4px 0;color:#202124;font-size:16px;font-weight:700;">{title}</h3>'
			f'<p style="margin:0 0 2px 0;color:#5f6368;font-size:13px;">{subtitle}</p>'
			f'{desc_html}'
			f'<div style="margin-top:14px;">{data_html}</div>'
			f'</div>'
		)

	@staticmethod
	def _build_footer_html(share_link: str = '') -> str:
		view_link_html = ''
		if share_link:
			view_link_html = (
				f'<p style="margin:0 0 4px 0;color:#80868b;font-size:12px;">'
				f'<a href="{share_link}" target="_blank" style="color:#1a73e8;text-decoration:underline;">'
				f'Click here to view the full dashboard</a></p>'
			)
		return (
			f'<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e0e0e0;">'
			f'{view_link_html}'
			f'<p style="margin:0 0 4px 0;color:#80868b;font-size:12px;">'
			f'This report was auto-generated by Watchmen. Please do not reply to this email.</p>'
			f'<p style="margin:0;color:#80868b;font-size:12px;">'
			f'To manage your subscription settings, please visit the Watchmen platform.</p>'
			f'</div>'
		)

	# ── Main HTML Builder ──────────────────────────────────────────────────

	def _build_report_html(self, subscription: Subscription, analysis: BIAnalysis, report_data: List[Dict],
	                       alert_statuses: List[AlertStatus], share_link: str = '') -> str:
		generated_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
		frequency_desc = self._format_frequency_desc(subscription)

		header = self._build_header_html(analysis.name, frequency_desc, generated_at, share_link)

		alert_section = self._build_alert_detail_html(alert_statuses) if alert_statuses else ''

		metric_cards = ''.join(self._build_metric_card_html(item) for item in report_data)

		metrics_section = ''
		if metric_cards:
			metrics_section = (
				f'<div style="margin:0 0 24px 0;">'
				f'<h2 style="margin:0 0 14px 0;color:#1a73e8;font-size:18px;font-weight:700;">Metric Data</h2>'
				f'{metric_cards}'
				f'</div>'
			)
		else:
			metrics_section = (
				f'<div style="margin:0 0 24px 0;">'
				f'<h2 style="margin:0 0 14px 0;color:#1a73e8;font-size:18px;font-weight:700;">Metric Data</h2>'
				f'<p style="color:#5f6368;font-style:italic;">No valid metric data found in the current dashboard</p>'
				f'</div>'
			)

		footer = self._build_footer_html(share_link)

		return (
			f'<html><body style="margin:0;padding:0;background:#f4f6f9;'
			f'font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif;">'
			f'<div style="max-width:720px;margin:0 auto;padding:24px 16px;">'
			f'{header}'
			f'{alert_section}'
			f'{metrics_section}'
			f'{footer}'
			f'</div>'
			f'</body></html>'
		)

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
