from datetime import datetime
from html import escape
from typing import List, Optional, Dict, Any

from watchmen_metricflow.model.alert_rule import (
    AlertConditionResult,
    AlertStatus,
    GlobalAlertRule
)
from watchmen_metricflow.model.bi_analysis_board import BIAnalysis
from watchmen_metricflow.model.metric_subscription import Subscription


def _pick_value(item: Any, *keys: str, default: Any = None) -> Any:
    if item is None:
        return default
    for key in keys:
        if isinstance(item, dict):
            value = item.get(key)
        else:
            value = getattr(item, key, None)
        if value is not None:
            return value
    return default


def build_alert_detail_html(alert_statuses: List[AlertStatus]) -> str:
    if not alert_statuses:
        return ''

    triggered_count = sum(1 for s in alert_statuses if s.triggered)
    normal_count = len(alert_statuses) - triggered_count

    if triggered_count > 0:
        banner_bg = '#fce8e6'
        banner_border = '#d93025'
        banner_text = f'{triggered_count} alert(s) triggered'
    else:
        banner_bg = '#e6f4ea'
        banner_border = '#1e8e3e'
        banner_text = f'All {normal_count} alert rule(s) are normal'

    banner = (
        f'<div style="background:{banner_bg};border-left:4px solid {banner_border};'
        f'border-radius:6px;padding:14px 18px;margin:0 0 20px 0;">'
        f'<span style="font-weight:600;color:#202124;">{banner_text}</span>'
        f'</div>'
    )

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
                metric_name = escape(str(_pick_value(cr, 'metricName', 'metricId', default='')))
                op = escape(str(_pick_value(cr, 'operator', default='')))
                threshold = escape(str(_pick_value(cr, 'value', default='')))
                current = escape(str(_pick_value(cr, 'currentValue', default='N/A')))
                cond_lines.append(
                    f'<div style="margin:4px 0;padding:4px 0;font-size:13px;color:#202124;">'
                    f'- {metric_name}: current value <strong>{current}</strong> '
                    f'{op} threshold <strong>{threshold}</strong>'
                    f'</div>'
                )
            condition_details = (
                f'<div style="margin-top:8px;padding-top:8px;border-top:1px solid #e0e0e0;">'
                f'{"".join(cond_lines)}'
                f'</div>'
            )

        alert_cards.append(
            f'<div style="background:{status_bg};border:1px solid {status_border};'
            f'border-radius:8px;padding:14px 16px;margin:0 0 10px 0;">'
            f'<div style="display:flex;align-items:center;justify-content:space-between;">'
            f'<span style="font-weight:600;color:#202124;font-size:14px;">{escape(status.ruleName)}</span>'
            f'<span style="background:{status_badge_bg};color:#ffffff;padding:2px 10px;'
            f'border-radius:12px;font-size:12px;font-weight:600;">{status_label}</span>'
            f'</div>'
            f'<p style="margin:6px 0 0 0;color:#5f6368;font-size:13px;">{escape(str(status.message or ""))}</p>'
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


def build_condition_results_table(condition_results: List[AlertConditionResult]) -> str:
    if not condition_results:
        return '<p style="color:#5f6368;font-style:italic;">No condition results available</p>'

    columns = ['Metric Name', 'Operator', 'Threshold', 'Current Value', 'Status']
    data = []
    for cr in condition_results:
        metric_name = escape(str(_pick_value(cr, 'metricName', 'metricId', default='N/A')))
        operator = escape(str(_pick_value(cr, 'operator', default='')))
        threshold = escape(str(_pick_value(cr, 'value', default='')))
        current = escape(str(_pick_value(cr, 'currentValue', default='N/A')))
        triggered = bool(_pick_value(cr, 'triggered', default=False))
        status = '🔴 Triggered' if triggered else '🟢 Normal'
        data.append([metric_name, operator, threshold, current, status])

    return build_data_table_html(columns, data)


def build_alert_body_from_rule(rule: GlobalAlertRule, message: str, condition_results: Optional[list],
                               report_data: List[Dict[str, Any]] = None,
                               share_link: str = '') -> str:
    normalized_results: List[AlertConditionResult] = []
    for item in (condition_results or []):
        if isinstance(item, AlertConditionResult):
            normalized_results.append(item)
            continue
        if isinstance(item, dict):
            try:
                normalized_results.append(AlertConditionResult.model_validate(item))
                continue
            except Exception:
                pass

    status = AlertStatus(
        id=str(rule.id),
        ruleId=str(rule.id),
        ruleName=rule.name or 'Alert',
        triggered=True,
        acknowledged=False,
        message=message or f'Rule {rule.name} triggered.',
        conditionResults=normalized_results
    )

    if report_data:
        report_subscription = type('obj', (object,), {
            'frequency': type('obj', (object,), {'value': 'day'})(),
            'time': '',
            'date': None,
            'weekday': None,
            'dayOfMonth': None,
            'month': None
        })()
        from watchmen_metricflow.model.bi_analysis_board import BIAnalysis
        dummy_analysis = BIAnalysis(
            id=str(rule.id),
            name=rule.name or 'Alert',
            tenantId=rule.tenantId,
            userId=rule.userId
        )
        return build_report_html(report_subscription, dummy_analysis, report_data, [status], share_link)

    generated_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    header = build_header_html(
        analysis_name=rule.name or 'Alert',
        frequency_desc='Alert Notification',
        generated_at=generated_at,
        share_link=share_link
    )
    detail = build_alert_detail_html([status])
    metrics_table = build_condition_results_table(normalized_results)
    footer = build_footer_html(share_link)

    metrics_section = (
        f'<div style="margin:0 0 24px 0;">'
        f'<h2 style="margin:0 0 14px 0;color:#1a73e8;font-size:18px;font-weight:700;">Condition Results</h2>'
        f'{metrics_table}'
        f'</div>'
    )

    return (
        f'<html><body style="margin:0;padding:0;background:#f4f6f9;'
        f'font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif;">'
        f'<div style="max-width:720px;margin:0 auto;padding:24px 16px;">'
        f'{header}'
        f'{detail}'
        f'{metrics_section}'
        f'{footer}'
        f'</div>'
        f'</body></html>'
    )


_TIME_RANGE_LABELS = {
    'Past 7 days': 'Past 7 Days',
    'Past 30 days': 'Past 30 Days',
    'Past 90 days': 'Past 90 Days',
    'Past year': 'Past Year',
}


def format_time_range_label(time_range: Optional[str]) -> str:
    if not time_range:
        return ''
    if time_range in _TIME_RANGE_LABELS:
        return _TIME_RANGE_LABELS[time_range]
    if time_range.startswith('Custom:'):
        parts = time_range.split(':')
        if len(parts) == 3:
            return f'{parts[1]} to {parts[2]}'
    return time_range


_WEEKDAY_LABELS = {'mon': 'Monday', 'tue': 'Tuesday', 'wed': 'Wednesday', 'thu': 'Thursday',
                   'fri': 'Friday', 'sat': 'Saturday', 'sun': 'Sunday'}
_MONTH_LABELS = {'jan': 'Jan', 'feb': 'Feb', 'mar': 'Mar', 'apr': 'Apr',
                 'may': 'May', 'jun': 'Jun', 'jul': 'Jul', 'aug': 'Aug',
                 'sep': 'Sep', 'oct': 'Oct', 'nov': 'Nov', 'dec': 'Dec'}


def format_frequency_desc(subscription: Subscription) -> str:
    raw_freq = subscription.frequency
    freq = raw_freq.value if hasattr(raw_freq, 'value') else raw_freq
    freq = str(freq or '').lower()
    t = subscription.time or ''
    if freq == 'once':
        date_str = subscription.date or ''
        return f'Once ({date_str} {t})'.strip()
    elif freq == 'day':
        return f'Daily at {t}'.strip() if t else 'Daily'
    elif freq == 'week':
        wd = _WEEKDAY_LABELS.get(subscription.weekday or '', subscription.weekday or '')
        return f'Every {wd} at {t}'.strip()
    elif freq == 'biweekly':
        wd = _WEEKDAY_LABELS.get(subscription.weekday or '', subscription.weekday or '')
        return f'Bi-weekly on {wd} at {t}'.strip()
    elif freq == 'month':
        d = subscription.dayOfMonth or ''
        return f'Monthly on day {d} at {t}'.strip()
    elif freq == 'year':
        m = _MONTH_LABELS.get(subscription.month or '', subscription.month or '')
        d = subscription.dayOfMonth or ''
        return f'Yearly on {m} {d} at {t}'.strip()
    return str(raw_freq)


def build_data_table_html(columns: List, data: List, max_rows: int = 20) -> str:
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


def build_header_html(analysis_name: str, frequency_desc: str, generated_at: str, share_link: str = '') -> str:
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


def build_metric_card_html(item: Dict) -> str:
    title = escape(str(item.get('title') or 'Untitled Metric'))
    metric_label = escape(str(item.get('metricLabel') or item.get('metricId') or ''))
    metric_desc = item.get('metricDescription')
    time_range = item.get('timeRange')
    result = item.get('result')

    subtitle_parts = []
    if metric_label:
        subtitle_parts.append(f'Metric: {metric_label}')
    if time_range:
        subtitle_parts.append(f'Time Range: {format_time_range_label(time_range)}')
    subtitle = '<span style="margin:0 8px;color:#dadce0;">|</span>'.join(subtitle_parts)

    desc_html = ''
    if metric_desc:
        desc_html = (
            f'<p style="margin:4px 0 0 0;color:#5f6368;font-size:12px;font-style:italic;">'
            f'{escape(str(metric_desc))}</p>'
        )

    data_html = build_data_table_html(
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


def build_footer_html(share_link: str = '') -> str:
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


def build_report_html(subscription: Subscription, analysis: BIAnalysis, report_data: List[Dict],
                      alert_statuses: List[AlertStatus], share_link: str = '') -> str:
    generated_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    frequency_desc = format_frequency_desc(subscription)

    header = build_header_html(analysis.name, frequency_desc, generated_at, share_link)

    alert_section = build_alert_detail_html(alert_statuses) if alert_statuses else ''

    metric_cards = ''.join(build_metric_card_html(item) for item in report_data)

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

    footer = build_footer_html(share_link)

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
